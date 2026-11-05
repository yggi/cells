import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { soundsIdentical } from './sameness';
import { MODE_WORDS } from '../theory/modes';

// Decision 072: even(k, n, phase) is the maximally even necklace as a table, the one generator under the scales, the even
// rhythms and a meter's groups. Each identity measured on #15 is a test here.

const tune = (key: string) => `&key ${key}\n&t over=&key step=8 0 1 2 3 4 5 6 7 [0,2,4]\n&v s=sine loop=C4\n&out map=sample [&t * &v]`;

describe('even(k, n, phase) read as a key', () => {
  it('even(7, 12, p) is the diatonic mode of phase p, as scale(&mode) reads it: the seven, darkest to brightest', () => {
    const modes = Object.entries(MODE_WORDS).filter(([w]) => !['major', 'minor'].includes(w));
    expect(modes).toHaveLength(7);
    for (const [word, phase] of modes) {
      expect(soundsIdentical(tune(`even(7, 12, ${phase})`), tune(`scale(${word})`)), word).toBe(true);
      // (and not its neighbour's)
      expect(soundsIdentical(tune(`even(7, 12, ${(phase + 1) % 7})`), tune(`scale(${word})`)), word).toBe(false);
    }
  });
  it('even(5, 12) is the major pentatonic and its phase 3 the minor, as scale() names them', () => {
    expect(soundsIdentical(tune('even(5, 12)'), tune('scale(pentatonic)'))).toBe(true);
    expect(soundsIdentical(tune('even(5, 12, 3)'), tune('scale(minorpentatonic)'))).toBe(true);
    expect(soundsIdentical(tune('even(5, 12, 1)'), tune('scale(pentatonic)'))).toBe(false);
  });
});

describe('even(k, n, phase) read as a rhythm', () => {
  const onsets = (bar: string) => {
    const r = compileSource(`&bar ${bar} step=60bpm\n&v s=sine loop=C4\n&out map=sample [&bar * &v]`);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return eventsBetween(plan(r, codeShifts(r)), 0, 13.999).map((e) => +e.at.toFixed(6));
  };
  it('as a bar, its places are the steps it plays: even(3, 8, 2) the tresillo, as scan(3 3 2) is', () => {
    expect(onsets('even(3, 8, 2)')).toEqual(onsets('scan(3 3 2)'));
  });
  it('the standard bell is the diatonic’s necklace: even(7, 12, 5) plays the bell’s strokes, x.x.xx.x.x.x', () => {
    const at = onsets('even(7, 12, 5)');
    // (a scan's bpm counts its entries: seven beats of 1 s, the lap twelve parts of 7 s)
    expect(at.filter((x) => x < 7).map((x) => Math.round((x / 7) * 12))).toEqual([0, 2, 4, 5, 7, 9, 11]);
    expect(at).toEqual(onsets('scan(2 2 1 2 2 2 1)'));
  });
  it('euclid(k, n, r) strikes even’s places, turned by Bjorklund’s offset (037): its onsets are those of a line stepping on them', () => {
    const at = (src: string, name: string) => {
      const r = compileSource(`${src}\n&v s=sine loop=C4\n&out map=sample [&${name} * &v]`);
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      return eventsBetween(plan(r, codeShifts(r)), 0, 3.999).map((e) => +e.at.toFixed(6));
    };
    // (a lap of 2 s: euclid's n steps at n/2 a second, even's places at a lap every 2 s; lengths differ, a hit lasting a step)
    for (const [k, n, phase] of [
      [3, 8, 2],
      [7, 12, 2],
      [5, 16, 0],
    ] as const)
      expect(at(`&e step=${n / 2} euclid(${k}, ${n})`, 'e'), `euclid(${k}, ${n})`).toEqual(at(`&places even(${k}, ${n}, ${phase}) loop=.5\n&p step=&places 0`, 'p'));
    // (and not at another phase: the turn matters)
    expect(at('&e step=4 euclid(3, 8)', 'e')).not.toEqual(at('&places even(3, 8, 0) loop=.5\n&p step=&places 0', 'p'));
  });
});
