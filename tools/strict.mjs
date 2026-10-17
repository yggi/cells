// Lifted from yggi/cell-studio tools/strict.mjs @ e168c8d, for the language's folders (#314 there, #320 for the engine).
// The strictness ratchet: type-checks src/ with `noUncheckedIndexedAccess` (tsconfig.strict.json) and fails if any error
// lands in a folder (or file) on the clean list below. Errors elsewhere are counted and allowed, until that folder is
// cleaned and added here; a folder on the list never goes back. Tests are left out (indexing a fixture is how most read).
// It runs tsc (the workbench runs tsgo, the same diagnostics, faster). Run by `npm run check`.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLEAN = [
  /^src\/theory\//,
  /^src\/repository\//,
  // (the engine, a part at a time: new code goes on clean)
  /^src\/engine\/fold\//,
  /^src\/engine\/midiimport\.ts$/,
  /^src\/engine\/time\/structure\.ts$/,
  /^src\/engine\/readers\.ts$/,
];

const require = createRequire(import.meta.url);
const tsc = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const run = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.strict.json', '--pretty', 'false'], {
  cwd: join(dirname(fileURLToPath(import.meta.url)), '..'),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (run.error || run.status === null) {
  console.error('strict: tsc did not run', run.error ?? run.signal);
  process.exit(1);
}

const out = (run.stdout + run.stderr).split('\n');
const blocking = [];
let elsewhere = 0;
for (let i = 0; i < out.length; i++) {
  const line = out[i];
  const m = /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line);
  if (m) {
    const file = m[1].replaceAll('\\', '/');
    if (!CLEAN.some((re) => re.test(file))) {
      elsewhere++;
      continue;
    }
    blocking.push(line);
    // the indented lines after it are the same error's detail
    while (i + 1 < out.length && /^\s/.test(out[i + 1])) blocking.push(out[++i]);
  } else if (/^error TS\d+/.test(line)) {
    blocking.push(line); // a config or global error: nothing was checked
  }
}

if (run.status !== 0 && blocking.length === 0 && elsewhere === 0) {
  console.error(out.join('\n'), '\nstrict: tsc failed without a type error');
  process.exit(1);
}
if (blocking.length) {
  console.error(blocking.join('\n'));
  console.error(`\nstrict: noUncheckedIndexedAccess errors in a clean folder (tools/strict.mjs). Narrow the value or guard the index.`);
  process.exit(1);
}
console.log(`strict: clean folders pass noUncheckedIndexedAccess (${elsewhere} errors elsewhere, not yet ratcheted)`);
