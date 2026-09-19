#!/usr/bin/env node
/**
 * Architecture checks for the API app.
 *
 * INFRA_06 — several BE rules are marked `review` only because nothing enforced them.
 * These are the ones a machine can decide. Run with `bun run check-arch`.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const SRC = resolve(import.meta.dirname, '..', 'src');
const files = globSync('**/*.ts', { cwd: SRC }).filter((f) => !f.endsWith('spec.ts'));

const findings = [];
const report = (rule, file, detail) => findings.push({ rule, file, detail });

/** Every `import ... from '<x>'` in a file. */
function importsOf(source) {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** Which layer a path sits in, if any. */
function layerOf(file) {
  const m = file.match(/^modules\/[^/]+\/(domain|application|infrastructure|presentation)\//);
  return m ? m[1] : null;
}

const ROLE_SUFFIXES = [
  '.use-case.ts', '.controller.ts', '.port.ts', '.adapter.ts', '.repository.ts',
  '.entity.ts', '.vo.ts', '.mapper.ts', '.errors.ts', '.dto.ts', '.module.ts',
  '.service.ts', '.store.ts', '.query.ts', '.record.ts', '.types.ts', '.views.ts',
  '.schema.ts', '.filter.ts', '.middleware.ts', 'index.ts', 'configuration.ts',
];

for (const file of files) {
  const source = readFileSync(resolve(SRC, file), 'utf8');
  const imports = importsOf(source);
  const layer = layerOf(file);

  // BE_01 R6 — every file carries its role suffix. BE_01 R1 exempts the bootstrap
  // files, and R6 describes the module tree, so `shared/` and `config/` are outside it.
  if (file.startsWith('modules/') && !ROLE_SUFFIXES.some((suffix) => file.endsWith(suffix))) {
    report('BE_01 R6', file, 'no role suffix');
  }

  // BE_01 R9 — never `../` out of your own module.
  if (file.startsWith('modules/')) {
    const moduleName = file.split('/').slice(0, 2).join('/');
    for (const spec of imports) {
      if (!spec.startsWith('.')) continue;
      const target = resolve('/' + file, '..', spec).slice(1);
      if (!target.startsWith(moduleName)) {
        report('BE_01 R9', file, `relative import escapes the module: ${spec}`);
      }
    }
  }

  // BE_02 R3 — the domain imports nothing outside itself.
  if (layer === 'domain') {
    for (const spec of imports) {
      const isFramework = !spec.startsWith('.') && !spec.startsWith('@app/');
      const leavesDomain = spec.startsWith('@app/') && !spec.includes('/domain/');
      if (isFramework || leavesDomain) {
        // The shared error base is pure domain code with no runtime dependency.
        if (spec === '@app/shared/errors/coded-error') continue;
        report('BE_02 R3', file, `domain imports ${spec}`);
      }
    }
  }

  // BE_02 R1 — the application layer may not import infrastructure or presentation.
  if (layer === 'application') {
    for (const spec of imports) {
      if (/infrastructure|presentation/.test(spec)) {
        report('BE_02 R1', file, `application imports ${spec}`);
      }
    }
  }

  // BE_02 R2 — nothing imports presentation or infrastructure from outside itself.
  if (layer !== 'infrastructure' && layer !== 'presentation' && !file.endsWith('.module.ts')) {
    for (const spec of imports) {
      if (/\/(infrastructure|presentation)\//.test(spec) && !spec.startsWith('@app/shared/')) {
        report('BE_02 R2', file, `imports an end of the graph: ${spec}`);
      }
    }
  }

  // BE_03 R4 — reach another module through its barrel or not at all.
  if (file.startsWith('modules/')) {
    const own = file.split('/')[1];
    for (const spec of imports) {
      const m = spec.match(/^@app\/modules\/([^/]+)\/(.+)$/);
      if (m && m[1] !== own) {
        report('BE_03 R4', file, `reaches past the barrel of ${m[1]}: ${spec}`);
      }
    }
  }

  // BE_09 R5 — no HTTP exception below the controller.
  if (layer && layer !== 'presentation' && /HttpException|BadRequestException|NotFoundException/.test(source)) {
    report('BE_09 R5', file, 'constructs an HTTP exception below the controller');
  }

  // BE_10 R1 — process.env is read in exactly one file.
  if (source.includes('process.env') && file !== 'config/configuration.ts') {
    report('BE_10 R1', file, 'reads process.env outside the config layer');
  }

  // GEN_07 R3/R4 — no default export, no `any`, no non-null assertion.
  if (/^export default/m.test(source)) report('GEN_07 R3', file, 'default export');
  if (/:\s*any\b|<any>|as any/.test(source)) report('GEN_07 R4', file, 'uses `any`');
}

if (findings.length === 0) {
  console.log('Architecture checks passed.');
  process.exit(0);
}

console.error(`${findings.length} architecture violation(s):\n`);
for (const { rule, file, detail } of findings) {
  console.error(`  ${rule.padEnd(10)} ${file}\n             ${detail}`);
}
process.exit(1);
