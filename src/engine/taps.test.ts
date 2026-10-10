import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';

// Decision 016: arranging at the input. A stepped table of names declares them as taps of the meter's bus; a selector
// reading the table switches them; what a tap steps plays while it is picked, from its top each time.
const SONG = `
&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&parts step=&bar &keysBar &tuneBar &drumBar
&song over=&parts step=&bar*16 laps=1 0 [0,2] [0,1,2] 0
&chords over=&major step=&keysBar*4 [0,2,4] [3,5,7] [4,6,8] [0,2,4]
&tune over=&major step=&tuneBar/2 4 4 5 7
&kick step=&drumBar 0 ~ 0 ~
&keys s=tri loop=C4
&lead s=square loop=C5
&bd s=sine loop=A1
&out map=sample [&chords * &keys * .15, &tune * &lead * .2, &kick * &bd * .6]
`;

// (a beat is half a second; a section, sixteen beats, is eight)
const SECTION = 8;
const played = (src: string, from: number, to: number) => {
  const r = compileSource(src);
  return eventsBetween(plan(r, codeShifts(r), r.off), from, to); // (what is off, as the app plays it)
};
const voices = (src: string, section: number) => new Set(played(src, section * SECTION, (section + 1) * SECTION - 0.01).map((e) => e.voice));

describe('arranging at the input (decision 016)', () => {
  it('compiles: the names in a stepped table are its taps, nothing warns', () => {
    const r = compileSource(SONG);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => d.message)).toEqual([]);
    for (const tap of ['keysBar', 'tuneBar', 'drumBar']) expect(r.cells.get(tap)?.clock).toBe('bar');
  });

  it('each section plays the parts its selector picks, and only those', () => {
    expect(voices(SONG, 0)).toEqual(new Set(['keys'])); // 0: the keys
    expect(voices(SONG, 1)).toEqual(new Set(['keys', 'bd'])); // [0,2]: keys and drums
    expect(voices(SONG, 2)).toEqual(new Set(['keys', 'lead', 'bd'])); // [0,1,2]: all three
    expect(voices(SONG, 3)).toEqual(new Set(['keys'])); // 0
    expect(voices(SONG, 4)).toEqual(new Set()); // laps=1: the song has ended
  });

  it('a part picked starts from its top: the tune enters in the third section on its first note', () => {
    const first = played(SONG, 2 * SECTION, 3 * SECTION).filter((e) => e.voice === 'lead')[0];
    expect(first.at).toBeCloseTo(2 * SECTION, 6);
    // its first note is degree 4 of C major (G), up from C5
    expect(12 * Math.log2(first.freq / 523.25)).toBeCloseTo(7, 1);
  });

  it('a name not found elsewhere is an error, as before, unless a stepped table of names declares it', () => {
    expect(compileSource('&bar scan(1 1 1 1) step=120bpm\n&x step=&nope 0 1').ok).toBe(false);
    // (a table where every name is a cell stays a braid of splices: no piece that compiled changes meaning)
    const r = compileSource('&bar scan(1 1 1 1) step=120bpm\n&a 0 1\n&b 2 3\n&both step=&bar &a &b\n&v s=sine loop=C4\n&out map=sample [&both * &v]');
    expect(r.ok).toBe(true);
    expect(r.cells.get('both')?.clock).toBe('bar');
  });

  it('a tap may have a line of its own, of attributes only: off silences what it steps, in every section', () => {
    const off = SONG.replace('&parts step=&bar &keysBar &tuneBar &drumBar', '&parts step=&bar &keysBar &tuneBar &drumBar\n&drumBar off label="the drums"');
    const r = compileSource(off);
    expect(r.diagnostics.map((d) => d.message)).toEqual([]);
    expect([r.taps?.get('drumBar'), r.cells.get('drumBar')?.clock, r.cells.get('drumBar')?.label]).toEqual(['parts', 'bar', 'the drums']);
    expect(voices(off, 1)).toEqual(new Set(['keys'])); // [0,2]: the keys; the drums are off
    expect(voices(off, 2)).toEqual(new Set(['keys', 'lead']));
    // a tap's line with steps of its own: the error says which line, not that the other taps are unknown
    const stepped = compileSource(SONG.replace('&parts step=&bar &keysBar &tuneBar &drumBar', '&parts step=&bar &keysBar &tuneBar &drumBar\n&drumBar 0 1'));
    expect(stepped.diagnostics.map((d) => d.message)).toContain(
      '&drumBar is a tap of &parts, so its line can carry attributes only (off, label=, tags=, show=), not steps or a table of its own',
    );
    // (a bare line of a name no table names is a cell of no steps, as before)
    expect(compileSource('&x off').cells.get('x')?.clock).toBeFalsy();
  });

  it('a tap nothing is stepped by warns: a section with nothing in it, or a name mistyped', () => {
    const r = compileSource(SONG.replace('step=&drumBar', 'step=&drumsBar'));
    expect(r.ok).toBe(false); // &drumsBar is no cell
    const typo = compileSource(SONG.replace('&parts step=&bar &keysBar &tuneBar &drumBar', '&parts step=&bar &keysBar &tuneBar &drumBar &fillBar'));
    expect(typo.diagnostics.some((d) => d.message.startsWith('&fillBar is a tap of &parts, but nothing is stepped by it'))).toBe(true);
  });
});

describe('the examples arranged at the input play the same', () => {
  // (tools/probe/pieces: written in decision 016's spelling, the examples untouched)
  const notes = (src: string) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    const p = plan(r, codeShifts(r));
    expect(p.end).toBeLessThan(Infinity);
    return {
      end: p.end,
      notes: eventsBetween(p, 0, p.end + 1).map((e) => `${e.at.toFixed(4)} ${e.dur.toFixed(4)} ${e.voice} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(4))}`),
    };
  };
  it.each([
    ['BWV 847: the movements two taps of the tempo map, no tacets (the breath between them said: ~@15)', 'examples/bwv847.cells', 'tools/probe/pieces/bwv847-input.cells'],
    ['Pop: six taps of the bar, the parts straight out', 'examples/pop.cells', 'tools/probe/pieces/pop-input.cells'],
  ])('%s', (_, example, rewired) => {
    const before = notes(readFileSync(example, 'utf8'));
    const after = notes(readFileSync(rewired, 'utf8'));
    expect(after.end).toBe(before.end);
    expect(after.notes.length).toBe(before.notes.length);
    expect(after.notes).toEqual(before.notes);
  });
});
