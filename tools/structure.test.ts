import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { structureOf } from '../src/engine/measure';
import { PRESETS } from '../src/engine/presets';
import { textOf } from './structure';

// The measure itself is src/engine/measure.ts's, tested there; this is the tool's reading of its inputs.
describe('tools/structure.ts: npm run structure, its inputs', () => {
  it('an example by key is its piece file’s cells block, as the language reads it', () => {
    expect(textOf('example:bwv847')).toBe(PRESETS.bwv847!.source);
    expect(structureOf(textOf('example:bwv847')).total).toBe(1113);
  });
  it('a literate file is the join of all its blocks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'structure-'));
    const path = join(dir, 'piece.md');
    writeFileSync(path, '---\ntitle: x\n---\n\n```cells\n&a step=4 0 2\n```\n\nProse.\n\n```cells\n&b step=4 4 5\n```\n');
    expect(textOf(path)).toBe('&a step=4 0 2\n&b step=4 4 5');
  });
  it('a .cells file is its text', () => {
    expect(structureOf(textOf('fixtures/bwv847-generated.cells')).total).toBe(1396);
  });
});
