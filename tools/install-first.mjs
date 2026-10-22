// Lifted from yggi/webmidi tools/install-first.mjs @ 985993c (its variable renamed CELLS_INSTALL), which lifted it from
// yggi/cell-studio tools/install-first.mjs @ 3813fbb, which lifted it from yggi/jambot tooling/verify.ts @ 6cc04377
// (`plan` and its message; adapted: npm, a script of its own before verify's checks).
// The first step of `npm run verify` (`preverify`): a checkout with no `node_modules`, as a git worktree an agent opens,
// is installed (`npm ci`, from the lockfile) before anything is checked, and says so; a checkout that has one is left
// alone. A failed install fails verify. CELLS_INSTALL replaces the install command, for tools/install-first.test.ts.
// It is a preverify step and no `prepare` or `postinstall`: a frontend installs cells from git (tools/hooks.test.ts).
//
// A `node_modules` that doesn't hold what the lockfile names (a package missing, or at another version, by npm's own
// record of what it installed, `node_modules/.package-lock.json`) is stale: a checkout of a branch that moved a
// dependency, or a worktree whose `node_modules` is a link to another checkout's (#242: it typechecked against the other
// install). A stale one is installed again, and says so; a stale link fails verify instead, since `npm ci` would empty
// the checkout it points to: give the worktree an install of its own.
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';

/** The packages the lockfile names that `node_modules` lacks or holds at another version (an optional one aside). */
function staleIn(lockText, installedText) {
  const lock = JSON.parse(lockText).packages ?? {};
  const installed = JSON.parse(installedText).packages ?? {};
  return Object.entries(lock)
    .filter(([path, p]) => path && !p.optional && !p.devOptional && !p.link && installed[path]?.version !== p.version)
    .map(([path]) => path.replace(/^.*node_modules\//, ''));
}

const command = process.env.CELLS_INSTALL ?? 'npm ci --no-audit --no-fund';
const install = () => (process.exitCode = spawnSync('sh', ['-c', command], { stdio: 'inherit' }).status ?? 1);
if (!existsSync('node_modules')) {
  console.log(`verify: no node_modules in this checkout (a git worktree starts with none), so ${command} runs first`);
  install();
} else if (existsSync('package-lock.json')) {
  let stale;
  try {
    stale = staleIn(readFileSync('package-lock.json', 'utf8'), readFileSync('node_modules/.package-lock.json', 'utf8'));
  } catch {
    stale = ['(no record of what npm installed)'];
  }
  if (stale.length > 0) {
    const named = `${stale.slice(0, 3).join(', ')}${stale.length > 3 ? ` and ${stale.length - 3} more` : ''}`;
    if (lstatSync('node_modules').isSymbolicLink()) {
      console.error(`verify: node_modules is a link, and stale against this checkout's lockfile (${named}): remove the link and run ${command} here`);
      process.exitCode = 1;
    } else {
      console.log(`verify: node_modules is stale against the lockfile (${named}), so ${command} runs first`);
      install();
    }
  }
}
