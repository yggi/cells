import { describe, expect, it } from 'vitest';
import { structureOf } from '../src/engine/measure';
import { PRESETS } from '../src/engine/presets';
import { textOf } from './structure';

// The measure itself is src/engine/measure.ts's, tested there; this is the tool's reading of its inputs.
describe('tools/structure.ts: npm run structure, its inputs', () => {
  it('an example by key is its piece file’s cells block, as the language reads it', () => {
    expect(textOf('example:bwv847')).toBe(PRESETS.bwv847!.source);
    expect(structureOf(textOf('example:bwv847')).total).toBe(1125);
  });
  it('a .cells file is its text', () => {
    expect(structureOf(textOf('fixtures/bwv847-generated.cells')).total).toBe(1396);
  });
});
