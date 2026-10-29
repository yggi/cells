import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRESETS } from './presets';
import { compileSource as compileAlone } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { resolveSeed } from '../repository/library';
/** As Cell studio compiles an example: its `use` lines read the seed library (#196); a text with none compiles as it would without. */
const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });

// Decision 016: arranging at the input. A stepped table of names declares them as sections (decision 044); a selector
// reading the table switches them; what a section steps plays while it is picked, from its top each time.
const SONG = `
&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&sections step=4n &keysBar &tuneBar &drumBar
&song over=&sections step=1m/4 laps=1 0 [0,2] [0,1,2] 0
&chords over=&major step=&keysBar/4 [0,2,4] [3,5,7] [4,6,8] [0,2,4]
&tune over=&major step=&tuneBar*2 4 4 5 7
&kick step=&drumBar 0 ~ 0 ~
&keys s=tri loop=C4
&lead s=square loop=C5
&bd s=sine loop=A1
&out map=sample [&chords * &keys * .15, &tune * &lead * .2, &kick * &bd * .6]
`;

// (a beat is half a second; a step of the song, sixteen beats, is eight)
const SONG_STEP = 8;
const played = (src: string, from: number, to: number) => {
  const r = compileSource(src);
  return eventsBetween(plan(r, codeShifts(r), r.off), from, to); // (what is off, as the app plays it)
};
const voices = (src: string, step: number) => new Set(played(src, step * SONG_STEP, (step + 1) * SONG_STEP - 0.01).map((e) => e.voice));

describe('arranging at the input (decision 016)', () => {
  it('compiles: the names in a stepped table are its sections, nothing warns', () => {
    const r = compileSource(SONG);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => d.message)).toEqual([]);
    for (const section of ['keysBar', 'tuneBar', 'drumBar']) expect(r.cells.get(section)?.clock).toBe('bar:4n'); // (decision 040: a tap of the meter, by the quarter)
  });

  it('each step of the song plays the sections its selector picks, and only those', () => {
    expect(voices(SONG, 0)).toEqual(new Set(['keys'])); // 0: the keys
    expect(voices(SONG, 1)).toEqual(new Set(['keys', 'bd'])); // [0,2]: keys and drums
    expect(voices(SONG, 2)).toEqual(new Set(['keys', 'lead', 'bd'])); // [0,1,2]: all three
    expect(voices(SONG, 3)).toEqual(new Set(['keys'])); // 0
    expect(voices(SONG, 4)).toEqual(new Set()); // laps=1: the song has ended
  });

  it('a section picked starts from its top: the tune enters in the third step of the song on its first note', () => {
    const first = played(SONG, 2 * SONG_STEP, 3 * SONG_STEP).filter((e) => e.voice === 'lead')[0];
    expect(first.at).toBeCloseTo(2 * SONG_STEP, 6);
    // its first note is degree 4 of C major (G), up from C5
    expect(12 * Math.log2(first.freq / 523.25)).toBeCloseTo(7, 1);
  });

  it('a name not found elsewhere is an error, as before, unless a stepped table of names declares it', () => {
    expect(compileSource('&bar scan(1 1 1 1) step=120bpm\n&x step=&nope 0 1').ok).toBe(false);
    // (a table where every name is a cell stays a braid of splices: no piece that compiled changes meaning)
    const r = compileSource('&bar scan(1 1 1 1) step=120bpm\n&a 0 1\n&b 2 3\n&both step=4n &a &b\n&v s=sine loop=C4\n&out map=sample [&both * &v]');
    expect(r.ok).toBe(true);
    expect(r.cells.get('both')?.clock).toBe('bar:4n');
  });

  it('a section may have a line of its own, of attributes only: off silences what it steps, in every step of the song', () => {
    const off = SONG.replace('&sections step=4n &keysBar &tuneBar &drumBar', '&sections step=4n &keysBar &tuneBar &drumBar\n&drumBar off label="the drums"');
    const r = compileSource(off);
    expect(r.diagnostics.map((d) => d.message)).toEqual([]);
    expect([r.sections?.get('drumBar'), r.cells.get('drumBar')?.clock, r.cells.get('drumBar')?.label]).toEqual(['sections', 'bar:4n', 'the drums']);
    expect(voices(off, 1)).toEqual(new Set(['keys'])); // [0,2]: the keys; the drums are off
    expect(voices(off, 2)).toEqual(new Set(['keys', 'lead']));
    // a section's line with steps or a table of its own: the error says which line, and only that (not that the other
    // sections are unknown, nor what they step stands still)
    for (const [section, line] of [
      ['drumBar', '&drumBar 0 1'],
      ['keysBar', '&keysBar 0 1'],
      ['tuneBar', '&tuneBar over=&major'],
    ])
      expect(
        compileSource(SONG.replace('&sections step=4n &keysBar &tuneBar &drumBar', `&sections step=4n &keysBar &tuneBar &drumBar\n${line}`)).diagnostics.map((d) => d.message),
      ).toEqual([
        `&${section} is a section of &sections, so its line can carry attributes only (off, label=, tags=, show=, size=, shift=, restart=), not steps or a table of its own`,
      ]);
    // (a bare line of a name no table names is a cell of no steps, as before)
    expect(compileSource('&x off').cells.get('x')?.clock).toBeFalsy();
  });

  it('a section nothing is stepped by warns: a section with nothing in it, or a name mistyped', () => {
    const r = compileSource(SONG.replace('step=&drumBar', 'step=&drumsBar'));
    expect(r.ok).toBe(false); // &drumsBar is no cell
    const typo = compileSource(SONG.replace('&sections step=4n &keysBar &tuneBar &drumBar', '&sections step=4n &keysBar &tuneBar &drumBar &fillBar'));
    expect(typo.diagnostics.some((d) => d.message.startsWith('&fillBar is a section of &sections, but nothing is stepped by it'))).toBe(true);
  });

  it('two selectors over one table AND together: a section plays only while both pick it', () => {
    // &mute, a second selector over &sections at twice the rate: all three sections, then never the drums (half a song step each)
    const both = SONG.replace('&chords', '&mute over=&sections step=1m/2 [0,1,2] [0,1]\n&chords');
    expect(compileSource(both).diagnostics.map((d) => d.message)).toEqual([]);
    const half = (n: number) => new Set(played(both, n * (SONG_STEP / 2), (n + 1) * (SONG_STEP / 2) - 0.01).map((e) => e.voice));
    expect([half(2), half(3)]).toEqual([new Set(['keys', 'bd']), new Set(['keys'])]); // &song [0,2]: the drums only while &mute has them
    expect([half(4), half(5)]).toEqual([new Set(['keys', 'lead', 'bd']), new Set(['keys', 'lead'])]); // [0,1,2]
    expect(voices(both, 4)).toEqual(new Set()); // &mute picks all three, but &song has ended
  });
});

describe('a selector of mixes (the form before decision 016)', () => {
  const old = (out: string) => `&bar step=120bpm 0 0 0 0
&a step=&bar 0 2 4 5 7
&b step=&bar 12
&partA [&a * &v]
&partB [&b * &w]
&sections &partA &partB
&song over=&sections step=&bar/4 laps=1 0 [0,1] ~ 1
&song2 over=&sections step=&bar/4 laps=1 0
&v s=tri loop=C4
&w s=sine loop=C4
&out loop=SAMPLE_RATE map=sample ${out}`;
  it.each(['&song', '[&song]', '[&song * .8]', '[&song, &song2]'])('&out %s: one error per selector, which says what to write, and nothing cascades', (out) => {
    const r = compileSource(old(out));
    expect(r.ok).toBe(false);
    expect(r.diagnostics.map((d) => d.message)).toEqual(
      ['song', 'song2'].map(
        (s) =>
          `A selector switches sections (decision 016): &${s} over=&sections reads mixes. Write &sections step=4n with a section per part (&sections step=4n &keysBar &drumBar), step each part's cells by its section (step=&keysBar), and play the parts straight into the sound card`,
      ),
    );
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
    ['BWV 847: written by hand as a selector over its voices (#177), every note of the text the generator wrote', 'bwv847', 'fixtures/bwv847-generated.cells'],
    ['Pop: six sections stepped by the bar, the parts straight out', 'pop', 'fixtures/pop-input.cells'],
  ])('%s', (_, example, rewired) => {
    const before = notes(PRESETS[example as 'pop'].source);
    const after = notes(readFileSync(rewired, 'utf8'));
    expect(after.end).toBe(before.end);
    expect(after.notes.length).toBe(before.notes.length);
    expect(after.notes).toEqual(before.notes);
  });
});

// Decision 032: restart= names what switching a part on does to its time; resume and free are stubs.
describe('restart= on a section or a selector (decision 032)', () => {
  const messages = (src: string) => compileSource(src).diagnostics.map((d) => `${d.severity}: ${d.message}`);
  const onSection = (policy: string) => SONG + `&tuneBar restart=${policy}\n`;
  const onSelector = (policy: string) => SONG.replace('&song over=&sections', `&song over=&sections restart=${policy}`);
  it('restart (the default) parses on a section and on a selector, says nothing and plays as without it', () => {
    for (const src of [onSection('restart'), onSelector('restart')]) {
      expect(messages(src)).toEqual([]);
      expect(played(src, 0, 40)).toEqual(played(SONG, 0, 40));
    }
    expect(compileSource(onSection('restart')).cells.get('tuneBar')?.params.restart).toBe('restart');
  });
  it('a section with restart= stays a section', () => {
    expect(compileSource(onSection('resume')).cells.get('tuneBar')?.clock).toBe('bar:4n');
  });
  it.each(['resume', 'free'])('restart=%s parses on a section and on a selector, and says nothing', (policy) => {
    for (const src of [onSection(policy), onSelector(policy)]) expect(messages(src)).toEqual([]);
  });
  it('another word, or another cell, says so', () => {
    expect(messages(onSection('again'))).toEqual(['warning: restart=again: what switching a part on does to its time is restart, resume or free — this plays as restart']);
    expect(messages(SONG.replace('&lead s=square', '&lead restart=resume s=square'))).toEqual([
      'warning: restart= acts on a section (a name a stepped table of names declares), a performer (a gate or a role a band names) or a selector (over= a table of sections, or a band): on &lead it does nothing',
    ]);
  });
});

// Decision 032, built (#53): a part switched off and on at three positions. A beat is half a second; the selector steps by
// the beat: on for beats 0-1, off for 2-3, on for 4-6, off for 7, on for 8, off for 9 (one entry holds a part on, so it is switched on three times).
describe('restart=resume and restart=free (decision 032)', () => {
  const PART = (policy: string) => `
&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&sections step=4n &mel
${policy ? `&mel restart=${policy}\n` : ''}&song over=&sections step=4n laps=1 0@2 ~@2 0@3 ~ 0 ~
&tune over=&major step=&mel 0 1 2 3 4 5 6 7 8 9 10 11
&lead s=sine loop=C4
&out map=sample [&tune * &lead]
`;
  /** The steps of the tune that sound, by the beat each begins on. */
  // (a step is a degree of C major above the voice's C4)
  const step = (e: { freq: number }) => {
    const semitones = Math.round(12 * Math.log2(e.freq / 261.6256));
    return Math.floor(semitones / 12) * 7 + [0, 2, 4, 5, 7, 9, 11].indexOf(((semitones % 12) + 12) % 12);
  };
  const steps = (policy: string) => played(PART(policy), 0, 5).map((e) => [Math.round(e.at * 2), step(e)] as const);
  it('restart starts at step 0 each time it is switched on', () => {
    expect(steps('')).toEqual([
      [0, 0],
      [1, 1],
      [4, 0],
      [5, 1],
      [6, 2],
      [8, 0],
    ]);
    expect(steps('restart')).toEqual(steps(''));
  });
  it('resume continues from the step where it stopped', () => {
    expect(steps('resume')).toEqual([
      [0, 0],
      [1, 1],
      [4, 2],
      [5, 3],
      [6, 4],
      [8, 5],
    ]);
  });
  it('free lands where an unswitched copy would be, and only its sound is gated', () => {
    expect(steps('free')).toEqual([
      [0, 0],
      [1, 1],
      [4, 4],
      [5, 5],
      [6, 6],
      [8, 8],
    ]);
    // (the unswitched copy: the same tune on the beat, nothing gating it)
    const open = compileSource(
      '&bar scan(1 1 1 1) step=120bpm\n&major scale(major)\n&tune over=&major step=4n 0 1 2 3 4 5 6 7 8 9 10 11\n&lead s=sine loop=C4\n&out map=sample [&tune * &lead]',
    );
    const copy = eventsBetween(plan(open, codeShifts(open)), 0, 5).map((e) => [Math.round(e.at * 2), step(e)] as const);
    expect(steps('free')).toEqual(copy.filter(([beat]) => [0, 1, 4, 5, 6, 8].includes(beat)));
  });
  it('the selector says it for all its sections, and a section says it for itself first', () => {
    const onSelector = PART('').replace('&song over=&sections', '&song over=&sections restart=resume');
    expect(played(onSelector, 0, 5).map(step)).toEqual([0, 1, 2, 3, 4, 5]);
    const sectionWins = onSelector + '&mel restart=free\n';
    expect(played(sectionWins, 0, 5).map(step)).toEqual([0, 1, 4, 5, 6, 8]);
  });
  it('resume and free: a note held across the selector naming the part again is not cut there; restart starts it again', () => {
    // (&song's second step names &mel again with &drum: a held note of &mel goes on through it, #177's alto in bar 6)
    const HELD = (policy: string) => `
&bar scan(1 1 1 1) step=120bpm
&sections step=4n &mel &drum
&song over=&sections step=4n laps=1 restart=${policy} 0@2 [0,1]@2
&tune step=&mel 0 7@3
&kick step=&drum 12
&lead s=sine loop=C4
&out map=sample [&tune * &lead, &kick * &lead]
`;
    const tune = (policy: string) => played(HELD(policy), 0, 3).flatMap((e) => (Math.round(12 * Math.log2(e.freq / 261.6256)) === 12 ? [] : [[e.at, e.dur]]));
    for (const policy of ['resume', 'free'])
      expect(tune(policy)).toEqual([
        [0, 0.5],
        [0.5, 1.5],
      ]);
    expect(tune('restart')).toEqual([
      [0, 0.5],
      [0.5, 0.5],
      [1, 0.5],
      [1.5, 0.5],
    ]);
  });
  it('a window read in pieces plays what it plays whole', () => {
    for (const policy of ['restart', 'resume', 'free']) {
      const whole = played(PART(policy), 0, 5).map((e) => e.at.toFixed(4));
      const parts = [0, 1.3, 2.9, 4.1].flatMap((from, i, a) => played(PART(policy), from, a[i + 1] ?? 5).map((e) => e.at.toFixed(4)));
      expect(parts).toEqual(whole);
    }
  });
});
