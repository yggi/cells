// Lifted from yggi/jambot packages/engine/src/part-reading.test.ts @ a34d13c6: `artic` is `bite`.
import { describe, expect, it } from 'vitest';
import { VOICES, partDistance, readVoice, voiceOf } from './voice';
import type { Part } from './style';

const at = (part: Part, step: number, length = 1, note = 60) => ({ part, step, note, length });

describe('reading one voice of the band alone', () => {
  it('has four voices, and gives every part of the band to one: the pad and the stab are the comp', () => {
    expect(VOICES).toEqual(['drums', 'bass', 'comp', 'lead']);
    expect(voiceOf('pad')).toBe('comp');
    expect(voiceOf('stab')).toBe('comp');
    expect(voiceOf('drums')).toBe('drums');
  });

  it('reads a voice from its own notes and no other’s', () => {
    const bar = [at('drums', 1), at('drums', 3), at('lead', 0, 8), at('lead', 8, 8)];
    expect(readVoice('drums', bar)).toMatchObject({ density: 2 / 16, sync: 1 });
    expect(readVoice('lead', bar)).toMatchObject({ density: 2 / 16, sync: 0, bite: 0 });
  });

  it('reads the density of a voice as its share of the 16 steps, 0 to 1', () => {
    const full = Array.from({ length: 16 }, (_, s) => at('drums', s));
    expect(readVoice('drums', full).density).toBe(1);
    expect(readVoice('drums', []).density).toBe(0);
  });

  it('reads biteulation for the bass and the lead only, and harm for the comp only', () => {
    const bar = [at('drums', 0), at('bass', 0, 1, 36), ...[60, 64, 67].map((n) => at('pad', 0, 8, n)), at('lead', 0, 1)];
    expect(readVoice('drums', bar).bite).toBeUndefined();
    expect(readVoice('comp', bar).bite).toBeUndefined();
    expect(readVoice('bass', bar).bite).toBeGreaterThan(0);
    expect(readVoice('lead', bar).bite).toBeGreaterThan(0);
    expect(readVoice('comp', bar).harm).toBeDefined();
    expect(readVoice('bass', bar).harm).toBeUndefined();
  });

  it('reads no axis from a voice that plays nothing but its density', () => {
    expect(readVoice('lead', [at('drums', 0)])).toEqual({ density: 0 });
  });
});

describe('the distance of a voice from a landmark', () => {
  it('is the root mean square over the axes both have, and 0 over none', () => {
    const landmark = { density: 0.5, sync: 0.2, bite: 0.6 };
    expect(partDistance({ density: 0.5, sync: 0.2 }, landmark)).toBe(0);
    expect(partDistance({ density: 0.7 }, landmark)).toBeCloseTo(0.2, 12);
    expect(partDistance({ density: 0.7, sync: 0.4 }, landmark)).toBeCloseTo(0.2, 12);
    expect(partDistance({ density: 0.7, harm: 1 }, landmark)).toBeCloseTo(0.2, 12);
    expect(partDistance({ density: 0.5, harm: 1 }, { density: 0.5, sync: 0.2 })).toBe(0);
  });
});
