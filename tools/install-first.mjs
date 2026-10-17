// Lifted from yggi/webmidi tools/install-first.mjs @ 985993c (its variable renamed CELLS_INSTALL), which lifted it from
// yggi/cell-studio tools/install-first.mjs @ 3813fbb, which lifted it from yggi/jambot tooling/verify.ts @ 6cc04377
// (`plan` and its message; adapted: npm, a script of its own before verify's checks).
// The first step of `npm run verify` (`preverify`): a checkout with no `node_modules`, as a git worktree an agent opens,
// is installed (`npm ci`, from the lockfile) before anything is checked, and says so; a checkout that has one is left
// alone. A failed install fails verify. CELLS_INSTALL replaces the install command, for tools/install-first.test.ts.
// It is a preverify step and no `prepare` or `postinstall`: a frontend installs cells from git (tools/hooks.test.ts).
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const command = process.env.CELLS_INSTALL ?? 'npm ci --no-audit --no-fund';
if (!existsSync('node_modules')) {
  console.log(`verify: no node_modules in this checkout (a git worktree starts with none), so ${command} runs first`);
  process.exitCode = spawnSync('sh', ['-c', command], { stdio: 'inherit' }).status ?? 1;
}
