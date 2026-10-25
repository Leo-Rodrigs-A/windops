import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const root = resolve('apps/api/src/modules');
let failures = 0;
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) walk(path);
    else if (path.endsWith('.ts')) {
      const owner = relative(root, path).split(sep)[0];
      for (const match of readFileSync(path, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        if (!match[1].startsWith('.')) continue;
        const target = relative(root, resolve(dirname(path), match[1])).split(sep);
        if (target[0] !== '..' && target[0] !== owner && target.at(-1) !== 'index.js') {
          console.error('Module boundary violation:', relative(root, path), match[1]);
          failures++;
        }
      }
    }
  }
}
walk(root);
if (failures) process.exitCode = 1;
