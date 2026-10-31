import { relative, resolve } from 'node:path';
import {
  findBoundaryViolations,
  listTypeScriptFiles,
  parseApiCompilerOptions,
} from './check-boundaries-core.mjs';

const modulesRoot = resolve('apps/api/src/modules');
const configPath = resolve('apps/api/tsconfig.json');
const violations = findBoundaryViolations({
  modulesRoot,
  files: listTypeScriptFiles(modulesRoot),
  compilerOptions: parseApiCompilerOptions(configPath),
});

for (const violation of violations) {
  console.error(
    'Module boundary violation:',
    relative(modulesRoot, violation.fileName),
    violation.specifier,
    '->',
    relative(modulesRoot, violation.targetFile),
  );
}

if (violations.length > 0) process.exitCode = 1;
