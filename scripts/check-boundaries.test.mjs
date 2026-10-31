import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { findSourceBoundaryViolations, parseApiCompilerOptions } from './check-boundaries-core.mjs';

const repositoryRoot = process.cwd();
const modulesRoot = resolve(repositoryRoot, 'apps/api/src/modules');
const sourcePath = resolve(modulesRoot, 'issues/boundary-fixture.ts');
const compilerOptions = {
  ...parseApiCompilerOptions(resolve(repositoryRoot, 'apps/api/tsconfig.json')),
  baseUrl: repositoryRoot,
  paths: { '@internal/*': ['apps/api/src/modules/*'] },
};

function check(sourceText) {
  return findSourceBoundaryViolations({
    fileName: sourcePath,
    sourceText,
    modulesRoot,
    compilerOptions,
  });
}

it('detects static, dynamic, import type, export and require references into private modules', () => {
  const violations = check(`
    import '../workspaces/service.js';
    const dynamic = import('../workspaces/service.js');
    type PrivateType = import('../workspaces/service.js').AuthorizationResult<unknown>;
    export * from '../workspaces/service.js';
    const required = require('../workspaces/service.js');
    const templateImport = import(\`../workspaces/service.js\`);
  `);

  expect(violations).toHaveLength(6);
  expect(violations.map(({ specifier }) => specifier)).toEqual(
    Array(6).fill('../workspaces/service.js'),
  );
});

it('resolves internal aliases and rejects deep imports through them', () => {
  const violations = check("import('@internal/workspaces/service.js');");

  expect(violations).toHaveLength(1);
  expect(violations[0]?.targetFile).toMatch(/workspaces[\\/]service\.ts$/);
});

it('allows same-module imports, public module barrels and external packages', () => {
  const violations = check(`
    import './service.js';
    import '../workspaces/index.js';
    import '@windops/contracts';
    import('@internal/workspaces/index.js');
  `);

  expect(violations).toEqual([]);
});
