// Fold's hints (#158, decision 049), the first kind: a repeat, two or more spans alike, the same or moved, read off the
// symbols the folder's isometry makes; on fixtures whose structure is known.
import { describe, expect, it } from 'vitest';
import { hints } from './hints';
import type { Line } from './ir';

/** A line of one note a step (null a rest), `dur` grid steps each: semitones from C4, or drums (`&bd`). */
const line = (name: string, notes: readonly (number | string | null)[], dur = 1): Line => ({
  name,
  chords: notes.flatMap((n, i) => (n === null ? [] : [{ at: i * dur, dur, values: [String(n)] }])),
  length: notes.length * dur,
});
const P = [0, 2, 4, 5, 7, 5, 4, 2];
const up = (xs: readonly number[], n: number) => xs.map((x) => x + n);
const at = (h: ReturnType<typeof hints>[number]) => h.spans.map((s) => `${s.line} ${s.from}-${s.to}`);

describe('a repeat (#158)', () => {
  it('is every place of a phrase, each the same as the first or moved by so many semitones', () => {
    const [h] = hints([line('tune', [...P, ...P, ...up(P, 5), ...up(P, 5), ...P, 11, 9, 7, 12])]);
    expect([h!.kind, h!.length, h!.confidence]).toEqual(['repeat', 8, 1]);
    expect(at(h!)).toEqual(['tune 0-8', 'tune 8-16', 'tune 16-24', 'tune 24-32', 'tune 32-40']);
    expect(h!.transforms).toEqual([{ kind: 'same' }, { kind: 'same' }, { kind: 'transposed', by: 5 }, { kind: 'transposed', by: 5 }, { kind: 'same' }]);
  });

  it('is found across lines, in their own steps', () => {
    const hs = hints([line('upper', [...P, 12, 11, 9, 7, ...P]), line('lower', [...up(P, -12), 0, 0, 0, 0])]);
    const h = hs.find((x) => x.length === 8)!;
    expect(at(h)).toEqual(['lower 0-8', 'upper 0-8', 'upper 12-20']);
    expect(h.transforms).toEqual([{ kind: 'same' }, { kind: 'transposed', by: 12 }, { kind: 'transposed', by: 12 }]);
  });

  it('names a motif inside a phrase as well as the phrase: every place of each, nested ones too', () => {
    const m = [0, 4, 7, 4];
    const phrase = [...m, ...up(m, 2), ...up(m, 5), 12, ~~0, 12, 0];
    const hs = hints([line('arp', [...phrase, ...phrase, ...phrase])]);
    // (Re-Pair is greedy: the motif's first three notes are a symbol in all nine places, its fourth taken with what follows)
    const motif = hs.find((h) => h.spans.length === 9)!;
    expect(motif.length).toBe(3);
    expect(new Set(motif.transforms.map((t) => (t.kind === 'transposed' ? t.by : 0)))).toEqual(new Set([0, 2, 5]));
    expect(hs[0]!.length).toBe(16);
    expect(at(hs[0]!)).toEqual(['arp 0-16', 'arp 16-32', 'arp 32-48']);
  });

  it('of drums is the same, having no pitch to move', () => {
    const bar = ['&bd', null, '&hh', null, '&sd', null, '&hh', '&hh'];
    const [h] = hints([line('kit', [...bar, ...bar, ...bar, ...bar])]);
    expect(h!.spans.every((s) => s.base === null)).toBe(true);
    expect(h!.transforms.every((t) => t.kind === 'same')).toBe(true);
    expect(h!.spans.length * h!.length).toBe(32);
  });

  it('moves by degrees where the lines are degrees of a scale', () => {
    const D = ['0', '4', '2', '3', '1', '5', '4', '0'];
    const third = (d: string) => `${Number(d) + 2}`;
    const [h] = hints([line('tune', [...D, ...D, ...D.map(third), ...D.map(third), '7', '6#'])]);
    expect(h!.length).toBe(8);
    expect(h!.transforms).toEqual([{ kind: 'same' }, { kind: 'same' }, { kind: 'transposed', by: 2 }, { kind: 'transposed', by: 2 }]);
  });

  it('is not an interval: two notes moved alike are no repeat', () => {
    expect(hints([line('tune', [0, 7, 3, 10, 5, 12])])).toEqual([]);
  });

  it('is none where nothing comes back', () => {
    // (each step a semitone wider than the last: no three notes are moved alike anywhere)
    expect(hints([line('tune', [0, 1, 3, 6, 10, 15, 21, 28, 36])])).toEqual([]);
  });
});
