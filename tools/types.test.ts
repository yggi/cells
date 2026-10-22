// types/ is what `npm run types` writes from src/ (tsconfig.types.json): a consumer typechecks against it, so it must not
// lag the source. Compared file by file with the declarations `npm run check` emits as it runs the purity gate
// (`.cache/types`, an incremental build): after a check, this build finds nothing changed and writes nothing, so one
// program serves both (#242); with no check before it, it builds them itself. The files expected are the config's own
// (a source deleted leaves its declaration behind in the cache, which an incremental build never removes).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

it('types/ is what npm run types writes from src/', () => {
  const out = '.cache/types';
  // (the same arguments as `check`'s first step, package.json)
  execFileSync(process.execPath, [
    'node_modules/typescript/bin/tsc',
    '-p',
    'tsconfig.types.json',
    '--incremental',
    '--tsBuildInfoFile',
    '.cache/types.tsbuildinfo',
    '--outDir',
    out,
  ]);
  const config = ts.getParsedCommandLineOfConfigFile('tsconfig.types.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!;
  const fresh = config.fileNames
    .filter((f) => !f.endsWith('.d.ts'))
    .map((f) => relative('src', f).replace(/\.ts$/, '.d.ts'))
    .sort();
  expect(
    files('types')
      .map((f) => relative('types', f))
      .sort(),
    'the same files',
  ).toEqual(fresh);
  for (const f of fresh) expect(readFileSync(join('types', f), 'utf8'), f).toBe(readFileSync(join(out, f), 'utf8'));
}, 60_000);
