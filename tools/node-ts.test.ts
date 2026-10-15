// tools/node-ts.mjs: Node runs the language's source with it, and can't without it.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const nodeTs = fileURLToPath(new URL('./node-ts.mjs', import.meta.url));
const piece = "import { compileSource } from './src/index.ts'; console.log(compileSource('&a loop=A4').ok);";

function node(...flags: string[]) {
  return spawnSync('node', ['--experimental-transform-types', '--no-warnings', ...flags, '--input-type=module', '-e', piece], { cwd: root, encoding: 'utf8' });
}

describe('node-ts', () => {
  it('is shown firing: without it, Node does not find an import written without its extension', () => {
    const run = node();
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain('ERR_MODULE_NOT_FOUND');
  });

  it('lets Node compile a piece from the source', () => {
    const run = node('--import', nodeTs);
    expect(run.stderr).toBe('');
    expect(run.stdout.trim()).toBe('true');
  });
});
