import { describe, expect, it } from 'vitest';
import { byteIdentical, identicalUpToLayout, identicalUpToRenaming, normalFormIdentical } from './identity';
import { soundsIdentical } from './sameness';

const PIECE = `&bar meter("4/4") step=120bpm
&tune over=scale(major) step=8n 0 2 4 2
&lead s=saw loop=C4 lpf=800
&out map=sample [&tune * &lead]`;

/** The four rungs of the text ladder, E0 to E3, for a pair. */
const rungs = (a: string, b: string) => [byteIdentical(a, b), identicalUpToLayout(a, b), identicalUpToRenaming(a, b), normalFormIdentical(a, b)];

// Decision 050: each pair is equal at its rung and not at the one above, and every rung up to E3 sounds identical (S1).
describe('the text ladder, E0 to E3 (decision 050, #180)', () => {
  it('E0: the same text', () => {
    expect(rungs(PIECE, PIECE)).toEqual([true, true, true, true]);
  });
  it('E1, not E0: a comment and spacing', () => {
    const b = `# a tune\n${PIECE.replace('step=8n 0 2', 'step=8n   0 2')}   # its notes`;
    expect(rungs(PIECE, b)).toEqual([false, true, true, true]);
    expect(soundsIdentical(PIECE, b)).toBe(true);
  });
  it('E2, not E1: a cell renamed, a voice too (S1 reads a voice by its place, #186)', () => {
    const b = PIECE.replaceAll('&tune', '&line');
    expect(rungs(PIECE, b)).toEqual([false, false, true, true]);
    expect(soundsIdentical(PIECE, b)).toBe(true);
    const voice = PIECE.replaceAll('&lead', '&saw');
    expect(rungs(PIECE, voice)).toEqual([false, false, true, true]);
    expect(soundsIdentical(PIECE, voice)).toBe(true);
  });
  it('E3, not E2: an alias, which Normalise writes as ours', () => {
    const b = PIECE.replace('lpf=800', 'cutoff=800');
    expect(rungs(PIECE, b)).toEqual([false, false, false, true]);
    expect(soundsIdentical(PIECE, b)).toBe(true);
  });
  it('S1, not E3: a stated default, which Normalise keeps and E4’s identity step will drop (decision 049, ruling 1)', () => {
    const b = PIECE.replace('lpf=800', 'lpf=800 pan=.5');
    expect(rungs(PIECE, b)).toEqual([false, false, false, false]);
    expect(soundsIdentical(PIECE, b)).toBe(true);
  });
});
