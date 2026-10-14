import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { midiSets } from './midiRatchet';

// (a quick guard: the ratchet runs one file per set, so a set added without one would go unchecked)
describe('the MIDI ratchet covers the library', () => {
  it('has a test file and a baseline for every set in midi/', () => {
    const missing = midiSets().flatMap((set) => [`src/engine/fold/midi.${set}.slow.test.ts`, `src/engine/fold/ratchet.midi.${set}.json`].filter((f) => !existsSync(f)));
    expect(missing, 'copy midi.wtc.slow.test.ts to the new name; record its baseline with UPDATE_RATCHET=1').toEqual([]);
  });
});
