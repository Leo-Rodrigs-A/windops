import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { LanguageVariant, SyntaxKind } from 'typescript/unstable/ast';
import { createScanner } from 'typescript/unstable/ast/scanner';

export function listTypeScriptFiles(root) {
  const files = [];
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, item.name);
    if (item.isDirectory()) files.push(...listTypeScriptFiles(path));
    else if (item.isFile() && /\.tsx?$/.test(item.name)) files.push(path);
  }
  return files;
}

export function findBoundaryViolations({ modulesRoot, files, compilerOptions }) {
  const violations = [];
  for (const fileName of files) {
    violations.push(
      ...findSourceBoundaryViolations({
        fileName,
        sourceText: readFileSync(fileName, 'utf8'),
        modulesRoot,
        compilerOptions,
      }),
    );
  }
  return violations;
}

export function findSourceBoundaryViolations({
  fileName,
  sourceText,
  modulesRoot,
  compilerOptions,
}) {
  const owner = relative(modulesRoot, fileName).split(sep)[0];
  const violations = [];
  for (const specifier of collectModuleSpecifiers(sourceText)) {
    const resolved = resolveModuleTarget(specifier, fileName, compilerOptions);
    if (!resolved) continue;
    const relativeTarget = relative(modulesRoot, resolved);
    const [target] = relativeTarget.split(sep);
    if (
      !target ||
      target === '..' ||
      target === owner ||
      /^index\.(?:[cm]?[jt]sx?)$/.test(basename(resolved))
    )
      continue;
    violations.push({ fileName, specifier, targetFile: resolved });
  }
  return violations;
}

export function parseApiCompilerOptions(configPath) {
  const visited = new Set();
  const paths = [];
  function readConfig(currentPath) {
    const absolutePath = resolve(currentPath);
    if (visited.has(absolutePath)) return;
    visited.add(absolutePath);
    const config = parseJsonc(readFileSync(absolutePath, 'utf8'));
    if (typeof config.extends === 'string' && config.extends.startsWith('.'))
      readConfig(resolve(dirname(absolutePath), config.extends));
    const options = config.compilerOptions ?? {};
    if (options.paths && typeof options.paths === 'object') {
      const baseDirectory = resolve(dirname(absolutePath), options.baseUrl ?? '.');
      paths.splice(
        0,
        paths.length,
        ...Object.entries(options.paths).map(([pattern, targets]) => ({
          pattern,
          targets: Array.isArray(targets)
            ? targets.filter((target) => typeof target === 'string')
            : [],
          baseDirectory,
        })),
      );
    }
  }
  readConfig(configPath);
  return { paths };
}

export function collectModuleSpecifiers(sourceText) {
  const scanner = createScanner(true, LanguageVariant.Standard, sourceText);
  const tokens = [];
  let kind = scanner.scan();
  while (kind !== SyntaxKind.EndOfFile) {
    tokens.push({
      kind,
      text: scanner.getTokenText(),
      value: scanner.getTokenValue(),
      lineBreakBefore: scanner.hasPrecedingLineBreak(),
    });
    kind = scanner.scan();
  }

  const specifiers = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) continue;
    if (token.kind === SyntaxKind.ImportKeyword) {
      const next = tokens[index + 1];
      if (isModuleStringToken(next)) {
        specifiers.push(next.value);
        continue;
      }
      if (next?.kind === SyntaxKind.OpenParenToken && isModuleStringToken(tokens[index + 2])) {
        specifiers.push(tokens[index + 2].value);
        continue;
      }
      const from = findFromString(tokens, index + 1);
      if (from) specifiers.push(from);
    } else if (token.kind === SyntaxKind.ExportKeyword) {
      const from = findFromString(tokens, index + 1);
      if (from) specifiers.push(from);
    } else if (
      (token.kind === SyntaxKind.Identifier || token.kind === SyntaxKind.RequireKeyword) &&
      token.text === 'require' &&
      tokens[index + 1]?.kind === SyntaxKind.OpenParenToken &&
      isModuleStringToken(tokens[index + 2])
    ) {
      specifiers.push(tokens[index + 2].value);
    }
  }
  return specifiers;
}

function isModuleStringToken(token) {
  return (
    token?.kind === SyntaxKind.StringLiteral ||
    token?.kind === SyntaxKind.NoSubstitutionTemplateLiteral
  );
}

function findFromString(tokens, start) {
  for (let index = start; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token || token.kind === SyntaxKind.SemicolonToken) return null;
    if (
      index > start &&
      (token.kind === SyntaxKind.ImportKeyword || token.kind === SyntaxKind.ExportKeyword)
    )
      return null;
    if (
      token.kind === SyntaxKind.FromKeyword &&
      tokens[index + 1]?.kind === SyntaxKind.StringLiteral
    )
      return tokens[index + 1].value;
  }
  return null;
}

function resolveModuleTarget(specifier, sourceFile, options) {
  const candidates = [];
  if (specifier.startsWith('.')) {
    candidates.push(resolve(dirname(sourceFile), specifier));
  } else {
    const configuredPaths = Array.isArray(options.paths)
      ? options.paths
      : Object.entries(options.paths ?? {}).map(([pattern, targets]) => ({
          pattern,
          targets,
          baseDirectory: options.baseUrl ?? process.cwd(),
        }));
    for (const mapping of configuredPaths) {
      const substitution = matchPathPattern(mapping.pattern, specifier);
      if (substitution === null) continue;
      for (const target of mapping.targets) {
        candidates.push(resolve(mapping.baseDirectory, target.replace('*', substitution)));
      }
    }
  }
  for (const candidate of candidates) {
    const resolved = resolveTypeScriptFile(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function matchPathPattern(pattern, specifier) {
  const wildcard = pattern.indexOf('*');
  if (wildcard < 0) return pattern === specifier ? '' : null;
  const prefix = pattern.slice(0, wildcard);
  const suffix = pattern.slice(wildcard + 1);
  if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return null;
  return specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
}

function resolveTypeScriptFile(candidate) {
  const substitutedExtensions = [
    candidate.replace(/\.js$/, '.ts'),
    candidate.replace(/\.jsx$/, '.tsx'),
    candidate.replace(/\.mjs$/, '.mts'),
    candidate.replace(/\.cjs$/, '.cts'),
  ];
  const extensions = [
    '.ts',
    '.tsx',
    '.mts',
    '.cts',
    '/index.ts',
    '/index.tsx',
    '/index.mts',
    '/index.cts',
  ];
  const candidates = [
    candidate,
    ...substitutedExtensions,
    ...extensions.map((extension) => candidate + extension),
  ];
  for (const path of candidates) {
    try {
      if (readFileSync(path).length >= 0) return resolve(path);
    } catch {}
  }
  return null;
}

function parseJsonc(value) {
  let output = '';
  let inString = false;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < value.length; index++) {
    const character = value[index] ?? '';
    const next = value[index + 1] ?? '';
    if (lineComment) {
      if (character === '\n') {
        lineComment = false;
        output += character;
      }
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index++;
      } else if (character === '\n') output += character;
      continue;
    }
    if (inString) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      output += character;
    } else if (character === '/' && next === '/') {
      lineComment = true;
      index++;
    } else if (character === '/' && next === '*') {
      blockComment = true;
      index++;
    } else output += character;
  }
  return JSON.parse(output.replace(/,\s*([}\]])/g, '$1'));
}
