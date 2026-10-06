import { describe, expect, it } from 'vitest';
import { setFree } from './edit';
import { compileSource } from './compile';
import { noteFrequency, codeShifts, type Shifts } from './program';
import { freqHue, gridName, positionOf, voiceGrid, positionHue, semitones, entries, lookup, resolveIn, resolvePitch, shiftedUnits } from './helix';
import { flatten } from './flatten';
import { eventsBetween, plan } from './realize';
import { parse } from './parser';
import { buildGraph } from './graph';
import { PRESETS } from './presets';
import { modeName } from '../theory/modes';

type R = ReturnType<typeof compileSource>;
const with_ =
  (r: R, o: Record<string, number>): Shifts =>
  (n) =>
    o[n] ?? codeShifts(r)(n);
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const spell = (r: R, cell: string, shifts: Shifts = codeShifts(r)) =>
  flatten(r, cell, shifts)
    .map((e) => resolveIn(r, e.table, e.tableShift, e.value, e.alter, shifts).position)
    .map((p) => NAMES[((Math.round(p) % 12) + 12) % 12])
    .join(' ');

describe('cells as helices', () => {
  it('the default 12 grid is implicit', () => {
    const r = compileSource('&a 0 4 7');
    expect(r.ok).toBe(true);
    expect(r.cells.get('fifths12TET')).toMatchObject({ root: true, implicit: true, cycle: 12 });
    expect(r.cells.get('a')).toMatchObject({ over: null, context: 'fifths12TET' });
  });

  it('a blank cell is the identity of the table below; shift transposes it', () => {
    const r = compileSource('&key shift=3');
    expect(entries(r, 'key', 0).map((e) => e.value)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(lookup(r, 'key', 5, codeShifts(r)).value).toBe(8);
  });

  it('shift rotates; indexing is shifting: entry x of &t+n is entry x+n of &t', () => {
    const r = compileSource('&s scan(2 1 2 2 1 2 2)\n&m over=&s 0 2 4');
    expect(entries(r, 's', 1).map((e) => e.value)).toEqual([2, 3, 5, 7, 8, 10, 12]);
    for (const x of [0, 3, 6, 9, -2]) expect(lookup(r, 's', x, codeShifts(r), 1)).toEqual(lookup(r, 's', x + 1, codeShifts(r)));
    expect(shiftedUnits(r, 'm', 1).map((u) => (u.atom.kind === 'note' ? u.atom.value : null))).toEqual([2, 4, 7]);
  });

  it('scan(intervals): turning it walks the modes; the helix climbs by its lap (the intervals’ sum)', () => {
    const r0 = compileSource('&s scan(2 2 1 2 2 2 1)');
    const names = [0, 1, 2, 3, 4, 5, 6].map((p) => modeName(entries(r0, 's', p).map((e) => e.value)));
    expect(names).toEqual(['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian']);
    expect(r0.cells.get('s')!.scan).toMatchObject({ lap: 12 });
    const r = compileSource('&s scan(2 1 2 2 1 2 2)');
    expect([7, 8, 14, -1].map((x) => lookup(r, 's', x, codeShifts(r)).value)).toEqual([12, 14, 24, -2]);
  });

  it('decimals are fine on a root grid; other roots work', () => {
    expect(compileSource('&g 0 3.24 6 9.12').ok).toBe(true);
    const r = compileSource('&edo19 cycle=19 map=edo\n&m over=&edo19 0 11 19');
    expect(resolvePitch(r, 'm', 11, 0, codeShifts(r)).root).toBe('edo19');
  });
});

describe('pitch: lookups all the way down', () => {
  const r = compileSource(PRESETS.royal.source);
  it('the royal theme in C minor through &theme → &scale → &key', () => {
    expect(spell(r, 'theme')).toBe('C Eb G Ab B C B Bb A Ab G');
  });
  it('shifting &key transposes it intact', () => {
    expect(spell(r, 'theme', with_(r, { key: 1 }))).toBe('C# E Ab A C C# C B Bb A Ab');
    expect(spell(r, 'theme', with_(r, { key: 7 }))).toBe('G Bb D Eb F# G F# F E Eb D');
  });
  it('shifting &scale rotates it: same notes, the theme starts a degree up', () => {
    expect(spell(r, 'theme', with_(r, { scale: 1 }))).toBe('D F Ab Bb C# D C# C B Bb Ab');
  });
  it('records each table it passes through', () => {
    expect(resolvePitch(r, 'theme', 6, 1, codeShifts(r)).path).toEqual([
      { cell: 'scale', index: 6 },
      { cell: 'key', index: 11 },
      { cell: 'fifths12TET', index: 11 },
    ]);
  });
});

describe('motifs and shifted references', () => {
  const r = compileSource(PRESETS.sailor.source);
  it('motifs read through the table of whoever splices them; a shifted table steps it down', () => {
    expect(r.cells.get('m1')).toMatchObject({ over: null, context: 'lead' });
    expect(spell(r, 'A')).toBe('A A A A A A D F');
    expect(spell(r, 'B')).toBe('G G G G G G C E'); // the same line through &lead[<<]: one step down
    expect(spell(r, 'C')).toBe('G F D D D D');
  });

  it('&x[i] and &x[a:b] pick from the braid as written, Python-style', () => {
    const r2 = compileSource('&bar 0 1 2 3\n&foo &bar[-1] &bar[1] &bar[1:3] &bar[:-2] &bar[-1:]');
    expect(r2.ok).toBe(true);
    expect(flatten(r2, 'foo', codeShifts(r2)).map((e) => e.value)).toEqual([3, 1, 1, 2, 0, 1, 3]);
    expect(r2.cells.get('foo')!.steps).toBe(7);
  });

  it('picks ignore rotation: a shifted cell is picked as written', () => {
    const r2 = compileSource('&bar shift=1 0 1 2 3\n&foo &bar[0] &bar[-1]');
    expect(flatten(r2, 'foo', codeShifts(r2)).map((e) => e.value)).toEqual([0, 3]);
    // while the whole cell plays rotated (and the wrapped entry climbs)
    expect(flatten(r2, 'bar', codeShifts(r2)).map((e) => e.value)).toEqual([1, 2, 3, 12]);
  });

  it('a rotation is two slices (without the climb); [>>] is the shift (with it)', () => {
    const r2 = compileSource('&bar 0 1 2 3\n&rot &bar[1:] &bar[:1]\n&sh &bar[>>]\n&back &bar[<<]');
    expect(flatten(r2, 'rot', codeShifts(r2)).map((e) => e.value)).toEqual([1, 2, 3, 0]);
    expect(flatten(r2, 'sh', codeShifts(r2)).map((e) => e.value)).toEqual([1, 2, 3, 12]);
    expect(flatten(r2, 'back', codeShifts(r2)).map((e) => e.value)).toEqual([-9, 0, 1, 2]);
  });

  it('[<<] adds to the cell’s own rotation; picks ignore both', () => {
    const r2 = compileSource('&bar shift=1 0 1 2 3\n&a &bar[<<]\n&b &bar[0]');
    expect(flatten(r2, 'a', codeShifts(r2)).map((e) => e.value)).toEqual([0, 1, 2, 3]);
    expect(flatten(r2, 'b', codeShifts(r2)).map((e) => e.value)).toEqual([0]);
  });

  it('a shifted table reference transposes through it: over=&s[>>2]', () => {
    const r3 = compileSource('&s scan(2 2 1 2 2 2 1)\n&n over=&s[>>2] 0 1 2');
    expect(spell(r3, 'n')).toBe('E F G');
  });

  it('picks keep their modifiers and step lengths', () => {
    const r2 = compileSource('&a 5 6\n&bar 0@2 &a!2 3*2\n&foo &bar[1] &bar[-1]');
    expect(flatten(r2, 'foo', codeShifts(r2)).map((e) => [e.step, e.duration, e.value])).toEqual([
      [0, 1, 5], [1, 1, 6], [2, 1, 5], [3, 1, 6], [4, 0.5, 3], [4.5, 0.5, 3],
    ]);
  });

  it('out-of-range picks and picks on tables are errors', () => {
    const msgs = (src: string) => compileSource(src).diagnostics.map((d) => d.message).join('\n');
    expect(msgs('&bar 0 1\n&foo &bar[5]')).toMatch(/&bar\[5\] picks nothing — &bar has 2 steps/);
    expect(msgs('&bar 0 1\n&foo &bar[2:]')).toMatch(/picks nothing/);
    expect(msgs('&s 0 1\n&x over=&s[0] 0')).toMatch(/over= takes a whole table/);
  });

  it('a shifted table is a transposition through it', () => {
    const r3 = compileSource('&s scan(2 2 1 2 2 2 1)\n&up over=&s shift=2\n&m over=&s 0 1 2\n&n over=&up 0 1 2');
    expect(spell(r3, 'm')).toBe('C D E');
    expect(spell(r3, 'n')).toBe('E F G');
  });

  it('the same motif sounds different under different tables', () => {
    const r4 = compileSource('&m 0 1 2\n&s scan(2 2 1 2 2 2 1)\n&a over=&s &m\n&b &m');
    expect(spell(r4, 'a')).toBe('C D E');
    expect(spell(r4, 'b')).toBe('C C# D');
  });
});

describe('step=, loop=, clocks and voices', () => {
  it('rates multiply along the chain: per step, ×n, ÷n, per cycle', () => {
    const r = compileSource(`&m scan(27 23 26 24) step=90bpm
&a step=&m 0 1 2 3 4
&b step=&m*2 0
&c step=&m/3 0
&d step=cycle(&a) 0
&e step=cycle(&a)*2 0
&f step=cycle(&a)/2 0
&g step=&d/5 0`);
    expect(r.ok).toBe(true);
    const rate = (n: string) => r.cells.get(n)!.rate;
    expect([rate('m'), rate('a'), rate('b'), rate('c')]).toEqual([1, 1, 1 / 2, 3]);
    expect([rate('d'), rate('e'), rate('f'), rate('g')]).toEqual([1 / 5, 1 / 10, 2 / 5, 1]);
    expect(r.cells.get('g')!.clock).toBe('m');
    expect(r.clocks.get('m')).toMatchObject({ perSecond: 1.5, positional: true });
  });

  it('loop= counts whole turns: rate × the cell’s own steps', () => {
    const r = compileSource(`&m step=2
&s step=&m 0 1 2 3
&l loop=&m 0 1 2 3
&c loop=cycle(&s) 0 1 2
&k loop=1 0 1 2 3 4`);
    expect(r.cells.get('s')!.rate).toBe(1);
    expect(r.cells.get('l')!.rate).toBe(4); // the whole braid per step of &m
    expect(r.cells.get('c')!.rate).toBe(3 / 4); // three steps per 4-step cycle of &s
    expect(r.clocks.get('k')!.perSecond).toBe(5);
  });

  it('a voice is whatever out() plays on; loop= is its frequency, step= divides by its length', () => {
    const r = compileSource(`&m step=1\n&t step=&m 0\n&a loop=440\n&b step=440 0 1\n&c s=saw\n&d loop=110 0 1\n&mix_ [&t * &a, &t * &b, &t * &d]\n&out_ loop=44k map=sample &mix_`);
    expect(r.cells.get('a')).toMatchObject({ voice: true, freq: 440 });
    expect(r.cells.get('b')).toMatchObject({ voice: true, freq: 220 });
    expect(r.cells.get('c')).toMatchObject({ voice: true, freq: 261.63 }); // sound parameters make a voice too
    expect(r.clocks.has('a')).toBe(false); // voices are audio-rate, not clocks
  });

  it('kits are tables of voices: a pattern read through one is a signal, mixed as it is', () => {
    const r = compileSource('&bd s=sine loop=55\n&sd s=white\n&kit &bd &sd\n&m step=1\n&d over=&kit step=&m 0 1\n&mix loop=SAMPLE_RATE map=sample [&d * 0.6]');
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.get('kit')!.kit).toBe(true);
    expect(r.cells.get('d')!.voice).toBe(false); // the pattern isn't a voice: it plays the kit's
    expect(r.outputs[0]).toMatchObject({ voice: 'kit', kit: true, cell: 'd', gains: [0.6, 0.6] });
    // the old form explains the new one
    const old = compileSource('&bd s=sine loop=55\n&kit &bd\n&m step=1\n&d step=&m 0\n&mix loop=SAMPLE_RATE map=sample [&d * &kit]');
    expect(old.diagnostics.map((x) => x.message).join()).toMatch(/&kit is a kit, a table of voices: read a pattern through it \(&drums over=&kit\) and mix that/);
  });

  it('&mix_ [(&theme + &mod - &x) * &v: the first term triggers, the rest modulate]\n&out_ loop=44k map=sample &mix_', () => {
    const r = compileSource('&m step=1\n&t step=&m 0\n&vib loop=5 0 .1\n&x 1\n&v loop=440\n&mix_ [(&t + &vib - &x) * &v]\n&out_ loop=44k map=sample &mix_');
    expect(r.ok).toBe(true);
    expect(r.outputs[0]).toMatchObject({ voice: 'v', cell: 't', mods: [{ cell: 'vib', sign: 1 }, { cell: 'x', sign: -1 }] });
  });

  it('reports loops, still drivers, unmoving outputs, bad voices', () => {
    const msgs = (s: string) => compileSource(s).diagnostics.map((d) => d.message).join('\n');
    expect(msgs('&a step=&b 0\n&b step=&a 1')).toMatch(/loops back/);
    expect(msgs('&a step=&nope 0')).toMatch(/Unknown cell &nope/);
    expect(msgs('&m scan(27 23 26 24)\n&a step=&m 0\n&v s=saw\n&mix_ [&a * &v]\n&out_ loop=44k map=sample &mix_')).toMatch(/&m never moves/);
    expect(msgs('&a 0\n&v s=saw\n&mix_ [&a * &v]\n&out_ loop=44k map=sample &mix_')).toMatch(/Nothing starts notes on &v/);
    expect(msgs('&v s=saw\n&mix_ [&v]\n&out_ loop=44k map=sample &mix_')).toMatch(/nothing to play/);
    expect(msgs('&v s=kazoo')).toMatch(/Unknown sound 'kazoo'/);
    expect(msgs('&m step=1\n&v s=saw step=&m')).toMatch(/moves at a rate/);
    expect(msgs('&v s=saw lpf=high')).toMatch(/lpf= takes a number/);
    expect(msgs('&k stride=7 0')).toMatch(/stride= only matters/);
    expect(msgs('&v loop=440 map=&nope\n&m step=1\n&t step=&m 0\n&mix_ [&t * &v]\n&out_ loop=44k map=sample &mix_')).toMatch(/Unknown cell &nope/);
  });
});

describe('errors', () => {
  const msgs = (src: string) => compileSource(src).diagnostics.map((d) => d.message).join('\n');
  it('reports unknown and looping over=, circular refs, duplicates', () => {
    expect(msgs('&a over=&nope 0')).toMatch(/Unknown cell &nope/);
    expect(msgs('&a over=&b 0\n&b over=&a 1')).toMatch(/over= loops/);
    expect(msgs('&a 0 &b\n&b &a 1')).toMatch(/Circular reference: &a → &b → &a/);
    expect(msgs('&a 0\n&a 1')).toMatch(/already defined on line 1/);
    expect(msgs('&fifths12TET 0 1 2')).toMatch(/default grid/);
  });

  it('every preset compiles cleanly', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      expect(r.diagnostics, key).toEqual([]);
      expect(r.outputs.length, key).toBeGreaterThan(0);
    }
  });
});

describe('mix expressions: typing and articulation (rule 2)', () => {
  const base = '&m step=1\n&a step=&m 0\n&b step=&m 7\n&vib loop=5 0 .1\n&up 12\n&x loop=440\n&y loop=110\n';
  it('one output per voice; the step= term starts notes, loop= terms bend, static terms transpose', () => {
    const r = compileSource(base + '&mix_ [(&a + &vib + &up) * &x, &b * &y]\n&out_ loop=44k map=sample &mix_');
    expect(r.ok).toBe(true);
    expect(r.outputs.map((o) => [o.voice, o.cell, o.mods.map((m) => m.cell)])).toEqual([
      ['x', 'a', ['vib', 'up']],
      ['y', 'b', []],
    ]);
    // order inside a pitch sum doesn't matter: + is commutative again
    const r2 = compileSource(base + '&mix_ [(&vib + &up + &a) * &x, &b * &y]\n&out_ loop=44k map=sample &mix_');
    expect(r2.outputs.map((o) => [o.voice, o.cell])).toEqual(r.outputs.map((o) => [o.voice, o.cell]));
  });

  it('numbers in a product are gains; numbers in a pitch sum transpose', () => {
    const r = compileSource(base + '&mix_ [&a * &x * 1.5, (&b + 12) * &y * 0.5 * 2]\n&out_ loop=44k map=sample &mix_');
    expect(r.outputs.map((o) => [o.voice, o.offset, o.gains])).toEqual([
      ['x', 0, [1.5, 1.5]],
      ['y', 12, [1, 1]],
    ]);
  });

  it('two step= terms on one voice, or none, is an error', () => {
    const msgs = (s: string) => compileSource(base + s).diagnostics.map((d) => d.message).join('\n');
    expect(msgs('&mix_ [(&a + &b) * &x]\n&out_ loop=44k map=sample &mix_')).toMatch(/Both &a and &b would start notes on &x/);
    expect(msgs('&mix_ [(&vib + &up) * &x]\n&out_ loop=44k map=sample &mix_')).toMatch(/Nothing starts notes on &x/);
  });

  it('the voice is the factor that is a sound, wherever it is written', () => {
    const r = (s: string) => compileSource(base + s + '\n&out_ loop=44k map=sample &mix_');
    const same = (a: string, b: string) => expect(r(a).outputs.map((o) => [o.voice, o.cell, o.offset, o.gains])).toEqual(r(b).outputs.map((o) => [o.voice, o.cell, o.offset, o.gains]));
    same('&mix_ [&x * &a]', '&mix_ [&a * &x]');
    same('&mix_ [.5 * &x * &a]', '&mix_ [&a * &x * .5]');
    expect(r('&mix_ [&x * &a]').diagnostics).toEqual([]);
    const msgs = (s: string) => r(s).diagnostics.map((d) => d.message).join('\n');
    // a sound (a sound parameter) and a pitch don't add …
    expect(msgs('&mix_ [&a * (&(s=saw loop=220) + &vib)]')).toMatch(/A pitch or a volume can't be added to a sound/);
    // … but a braid at audio rate with no sound of its own is a pitch in a pitch sum (a fast vibrato: FM)
    expect(msgs('&mix_ [&a * (&x + &vib)]')).toMatch(/has no voice/);
    expect(msgs('&mix_ [&a * &vib]')).toMatch(/&a \* &vib has no voice.*&vib loops at 5 Hz, below hearing: a pitch/);
    expect(msgs('&mix_ [&a * &x * &y]')).toMatch(/Two sounds can't multiply \(&x \* &y\)/);
  });
});

describe('the sound card: &out loop=44k map=sample &left &right', () => {
  const base = '&m step=1\n&a step=&m 0\n&b step=&m 7\n&x loop=440\n&y loop=110\n';
  it('one entry is mono (both sides), two are left and right', () => {
    const mono = compileSource(base + '&mix [&a * &x * 0.5]\n&out loop=44k map=sample &mix');
    expect(mono.outputs[0].gains).toEqual([0.5, 0.5]);
    const st = compileSource(base + '&l [&a * &x, &b * &y * 0.3]\n&r [&a * &x * 0.2, &b * &y]\n&out loop=44k map=sample &l &r');
    expect(st.outputs.map((o) => [o.voice, o.gains])).toEqual([
      ['x', [1, 0.2]],
      ['y', [0.3, 1]],
    ]);
    expect([...st.outputs[0].via].sort()).toEqual(['l', 'out', 'r']);
  });
  it('the same voice and pitches in both mixes is one sound, not two', () => {
    const r = compileSource(base + '&mix [&a * &x]\n&out loop=44k map=sample &mix &mix');
    expect(r.outputs).toHaveLength(1);
    expect(r.outputs[0].gains).toEqual([1, 1]);
  });
  it('loop=44k is the sample rate: the whole braid (all channels) per sample', () => {
    const r = compileSource(base + '&mix [&a * &x]\n&out loop=44.1k map=sample &mix &mix');
    expect(r.clocks.get('out')!.perSecond).toBe(88200);
  });
  it('reports what a sound card and a mix need', () => {
    const msgs = (s: string) => compileSource(base + s).diagnostics.map((d) => d.message).join('\n');
    expect(msgs('&mix [&a * &x]\n&out map=sample &mix &mix &mix')).toMatch(/one channel \(mono\) or two/);
    expect(msgs('&out map=sample &a')).toMatch(/A channel of the sound card is a mix/);
    expect(msgs('&mix [&a * &x] 0')).toMatch(/A mix is one chord of sounds/);
    expect(compileSource('&a 0').diagnostics.map((d) => d.message).join()).toMatch(/map=sample/);
  });
});

describe('scale(tonic, phase)', () => {
  it('scale(0,2) is C Aeolian, scale(2,3) D Dorian, scale(7,5) G Ionian — and hidden from the graph', () => {
    const r = compileSource('&a over=scale(0,2) 0 1 2 3 4 5 6 7\n&b over=scale(2,3) 0 1 2 3 4 5 6\n&c over=scale(7,5) 0 2 4');
    expect(r.ok).toBe(true);
    expect(spell(r, 'a')).toBe('C D Eb F G Ab Bb C');
    expect(spell(r, 'b')).toBe('D E F G A B C');
    expect(spell(r, 'c')).toBe('G B D');
    expect(r.cells.get('scale:0:2')!.implicit).toBe(true);
    expect(r.cells.get('key:0')!.implicit).toBe(true);
  });
  it('is the same as writing the key and scale out', () => {
    const short = compileSource('&t over=scale(9,2) 0 2 4 6# 7');
    const long = compileSource('&k shift=9\n&s over=&k scan(2 1 2 2 1 2 2)\n&t over=&s 0 2 4 6# 7');
    expect(spell(short, 't')).toBe(spell(long, 't'));
  });
  it('shares the hidden tables between cells that use the same scale', () => {
    const r = compileSource('&a over=scale(7,5) 0\n&b over=scale(7,5) 1');
    expect([...r.cells.keys()].filter((n) => n.startsWith('scale:'))).toEqual(['scale:7:5']);
  });
  it('explains itself when malformed', () => {
    expect(compileSource('&a over=scale(0) 0').diagnostics[0].message).toMatch(/scale\(tonic, phase\)/);
  });
});

describe('transpose example', () => {
  const r = compileSource(PRESETS.transpose.source);
  it('turning &key transposes the theme, turning &mode starts the scale elsewhere', () => {
    expect(r.diagnostics).toEqual([]);
    expect(spell(r, 'theme')).toBe('C E G C G E C');
    expect(spell(r, 'theme', with_(r, { key: 2 }))).toBe('D F# A D A F# D');
    expect(spell(r, 'theme', with_(r, { mode: 1 }))).toBe('D F A D A F D'); // Dorian on D, same notes as C major
  });
});

describe('note names as rates', () => {
  it('A4 is 440; every other name is tuned from it', () => {
    expect(noteFrequency('A4')).toBe(440);
    expect(noteFrequency('C4')).toBeCloseTo(261.63, 2);
    expect(noteFrequency('C#3')).toBeCloseTo(138.59, 2);
    expect(noteFrequency('Bb2')).toBeCloseTo(116.54, 2);
    expect(noteFrequency('A4', 432)).toBe(432);
    expect(noteFrequency('H4')).toBeNull();
  });
  it('loop=C4 is a voice at middle C; the environment can retune', () => {
    const src = '&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&w s=tri loop=Bb2\n&mix [&t * &v, &t * &w]\n&out loop=SAMPLE_RATE map=sample &mix';
    const r = compileSource(src);
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.get('v')!.freq).toBeCloseTo(261.63, 2);
    expect(r.cells.get('w')!.freq).toBeCloseTo(116.54, 2);
    expect(compileSource(src, { SAMPLE_RATE: 48000, A4: 432 }).cells.get('v')!.freq).toBeCloseTo(256.87, 2);
    expect(compileSource('&v loop=H4').diagnostics.map((d) => d.message).join()).toMatch(/note names like C4/);
  });
});

describe('the sound card holds its mix', () => {
  const base = '&m step=1\n&a step=&m 0\n&b step=&m 7\n&x loop=C4\n&y loop=C3\n';
  it('a mix with map=sample is the sound card itself: one chord, mono', () => {
    const r = compileSource(base + '&mix loop=SAMPLE_RATE map=sample [&a * &x, &b * &y * 0.5]');
    expect(r.diagnostics).toEqual([]);
    expect(r.outputs.map((o) => [o.voice, o.gains])).toEqual([
      ['x', [1, 1]],
      ['y', [0.5, 0.5]],
    ]);
    expect(r.cells.get('mix')).toMatchObject({ sink: true });
  });
  it('two chords written in place are left and right', () => {
    const r = compileSource(base + '&out loop=SAMPLE_RATE map=sample [&a * &x] [&b * &y]');
    expect(r.diagnostics).toEqual([]);
    expect(r.outputs.map((o) => [o.voice, o.gains])).toEqual([
      ['x', [1, 0]],
      ['y', [0, 1]],
    ]);
  });
  it('the same as the long form: a mix and a sound card playing it on both channels', () => {
    const short = compileSource(base + '&mix loop=SAMPLE_RATE map=sample [&a * &x]');
    const long = compileSource(base + '&mix [&a * &x]\n&out loop=SAMPLE_RATE map=sample &mix &mix');
    expect(short.outputs.map((o) => o.gains)).toEqual(long.outputs.map((o) => o.gains));
  });
});

describe('map=edo: grids say so; cycle= has one job', () => {
  it('a blank cell with cycle= is not a grid: it reads the default grid and wraps there', () => {
    const r = compileSource('&k cycle=24\n&edo19 cycle=19 map=edo');
    expect(r.cells.get('k')).toMatchObject({ root: false, wrap: 24, steps: 12 }); // as long as the grid below
    expect(r.cells.get('edo19')).toMatchObject({ root: true, cycle: 19 });
  });
  it('a grid reads nothing and has no braid', () => {
    const msgs = (s: string) => compileSource(s).diagnostics.map((d) => d.message).join();
    expect(msgs('&g cycle=7 map=edo 0 1 2')).toMatch(/A grid \(map=edo, map=ed\(r\)\) reads nothing and has no braid/);
    expect(msgs('&s scan(1 2 2 1 2 2 2)\n&g over=&s map=edo')).toMatch(/A grid \(map=edo/);
  });
});

describe('retrograde: slices with a step', () => {
  it('pick like Python, step included', () => {
    const idx = (sl: string) => {
      const r = compileSource(`&a 0 1 2 3 4\n&b &a${sl}`);
      return flatten(r, 'b', codeShifts(r)).map((e) => e.value);
    };
    // the same as Python's [0, 1, 2, 3, 4][…]
    expect(idx('[::-1]')).toEqual([4, 3, 2, 1, 0]);
    expect(idx('[::2]')).toEqual([0, 2, 4]);
    expect(idx('[1::2]')).toEqual([1, 3]);
    expect(idx('[-2::-1]')).toEqual([3, 2, 1, 0]);
    expect(idx('[3:0:-1]')).toEqual([3, 2, 1]);
    expect(idx('[::-2]')).toEqual([4, 2, 0]);
    expect(idx('[4:1:-2]')).toEqual([4, 2]);
  });
  it('a retrograde keeps each step’s length: &a then &a backwards is a palindrome', () => {
    const r = compileSource('&a 0 1@2 2\n&foo &a[::-1] 9 &a');
    expect(flatten(r, 'foo', codeShifts(r)).map((e) => [e.value, e.duration])).toEqual([
      [2, 1], [1, 2], [0, 1], [9, 1], [0, 1], [1, 2], [2, 1],
    ]);
    expect(compileSource('&a 0 1\n&b &a[::0]').diagnostics.map((d) => d.message).join()).toMatch(/step of 0 never moves/);
  });
});

describe('free(…): numbers left to the performer', () => {
  const src = `&bar scan(27 23 26 24) step=free(90bpm, 60..240)
&t over=&s step=&bar 0 2 4
&s scan(2 2 1 2 2 2 1) shift=free(0, 0..6)
&v s=tri loop=C4
&mix loop=SAMPLE_RATE map=sample [&t * &v * free(.8, 0..1),
                                  &t * &v * free(.3, 0..1)]`;
  it('a rate, a shift, gains — the default is the value', () => {
    const r = compileSource(src);
    expect(r.diagnostics).toEqual([]);
    expect(r.clocks.get('bar')!.perSecond).toBe(1.5);
    expect(r.cells.get('bar')!.frees).toMatchObject([{ key: 'step', value: 90, unit: 'bpm', lo: 60, hi: 240 }]);
    expect(r.cells.get('s')!.frees).toMatchObject([{ key: 'shift', value: 0, lo: 0, hi: 6 }]);
    expect(r.cells.get('mix')!.frees.map((f) => [f.key, f.value])).toEqual([['gain', 0.8], ['gain', 0.3]]);
    expect(r.outputs[0].gains).toEqual([1.1, 1.1]); // .8 + .3 — the same voice and pitches twice
  });
  it('writes back where it stands — on a continued line too', () => {
    const r = compileSource(src);
    const bar = r.cells.get('bar')!.frees[0];
    expect(setFree(src, bar, 120).split('\n')[0]).toBe('&bar scan(27 23 26 24) step=free(120bpm, 60..240)');
    const second = r.cells.get('mix')!.frees[1];
    expect(second.span.line).toBe(6);
    const after = setFree(src, second, 0.55);
    expect(after.split('\n')[5]).toBe('                                  &t * &v * free(0.55, 0..1)]');
    expect(compileSource(after).cells.get('mix')!.frees[1].value).toBe(0.55);
    // clamped to its range
    expect(setFree(src, bar, 999).split('\n')[0]).toMatch(/free\(240bpm, 60\.\.240\)/);
  });
  it('a tempo marking: its range, centred; moved, it becomes explicit', () => {
    const r = compileSource('&bar scan(3 3 3 3) step=free(adagio)');
    const f = r.cells.get('bar')!.frees[0];
    expect([f.value, f.lo, f.hi, f.unit]).toEqual([71, 66, 76, 'bpm']);
    expect(setFree('&bar scan(3 3 3 3) step=free(adagio)', f, 70)).toBe('&bar scan(3 3 3 3) step=free(70bpm, 66..76)');
  });
  it('says what it needs', () => {
    const msg = (s: string) => compileSource(s).diagnostics.map((d) => d.message).join();
    expect(msg('&a step=free(90bpm) 0')).toMatch(/then the range/);
    expect(msg('&a step=free(300bpm, 60..240) 0')).toMatch(/outside 60\.\.240/);
    expect(msg('&a shift=free(adagio) 0')).toMatch(/for a rate/);
    expect(msg('&a step=free(sloppy) 0')).toMatch(/a tempo marking/);
  });
});

describe('grids of any period: map=ed(r)', () => {
  const pitchOf = (src: string, cell: string, value: number) => {
    const r = compileSource(src);
    const p = resolvePitch(r, cell, value, 0, codeShifts(r));
    return semitones(r, p.root, p.position);
  };
  it('Studie II: 25 equal steps to 5:1 — each step 5^(1/25), and 25 of them exactly 5:1', () => {
    const src = '&studie cycle=25 map=ed(5)\n&t over=&studie 0';
    expect(Math.pow(2, pitchOf(src, 't', 1) / 12)).toBeCloseTo(Math.pow(5, 1 / 25), 10);
    expect(Math.pow(2, pitchOf(src, 't', 25) / 12)).toBeCloseTo(5, 10);
    expect(Math.pow(2, pitchOf(src, 't', 80) / 12) * 100).toBeCloseTo(100 * Math.pow(5, 80 / 25), 6); // the 81st frequency
  });
  it('Carlos’ alpha: nine equal steps to the fifth (a fraction: 3/2) — no octave', () => {
    const src = '&alpha cycle=9 map=ed(3/2)\n&t over=&alpha 0';
    expect(pitchOf(src, 't', 1) * 100).toBeCloseTo(77.995, 2); // cents per step
    expect(Math.pow(2, pitchOf(src, 't', 9) / 12)).toBeCloseTo(1.5, 10); // a pure fifth
    expect(pitchOf(src, 't', 5) * 100).toBeCloseTo(390, 0); // ≈ 5:4 (386)
    expect(pitchOf(src, 't', 4) * 100).toBeCloseTo(312, 0); // ≈ 6:5 (316)
  });
  it('a table over such a grid climbs by its period: a lap up multiplies by r', () => {
    const src = '&bp cycle=13 map=ed(3)\n&s over=&bp scan(2 1 1 2 1 2 1 2 1)\n&t over=&s 0';
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const lap = r.cells.get('s')!.units.length;
    expect(Math.pow(2, (pitchOf(src, 't', lap) - pitchOf(src, 't', 0)) / 12)).toBeCloseTo(3, 10); // Bohlen–Pierce: the tritave
  });
  it('colours a rainbow per period, by position — on every grid (12 to the octave: C red, G light blue)', () => {
    const r = compileSource('&studie cycle=25 map=ed(5)\n&g12 cycle=12 map=edo');
    expect(positionHue(r, 'studie', 0)).toBe(0);
    expect(positionHue(r, 'studie', 5)).toBeCloseTo(72); // a fifth of the way round
    expect(positionHue(r, 'studie', 25)).toBe(0); // round again
    expect(positionHue(r, 'g12', 7)).toBe(210); // G: light blue
    expect(positionHue(r, 'g12', 2)).toBe(60); // D: yellow
  });
  it('says what a period must be', () => {
    expect(compileSource('&g cycle=7 map=ed(1)').diagnostics[0].message).toMatch(/divides a ratio above 1/);
    expect(compileSource('&g cycle=7 map=ed(x)').diagnostics[0].message).toMatch(/divides a ratio above 1/);
  });
});

describe('ratios grids, geometric intervals, decibels; colours and names on a voice’s grid', () => {
  it('map=ratios: one period’s tones as ratios, the last the period — just intonation', () => {
    const r = compileSource('&just map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2\n&t over=&just 0');
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.cells.get('just')).toMatchObject({ root: true, cycle: 7 });
    const ratio = (v: number) => {
      const p = resolvePitch(r, 't', v, 0, codeShifts(r));
      return Math.pow(2, semitones(r, p.root, p.position) / 12);
    };
    expect([0, 2, 4, 5, 7, 9].map((v) => +ratio(v).toFixed(6))).toEqual([1, 1.25, 1.5, 1.666667, 2, 2.5]);
    expect(positionOf(r, 'just', 12 * Math.log2(1.5))).toBeCloseTo(4); // the inverse
    const msg = (s: string) => compileSource(s).diagnostics.map((d) => d.message).join();
    expect(msg('&g map=ratios 1 5/4 9/8 2')).toMatch(/rising ratios/);
    expect(msg('&g map=ratios 2')).toMatch(/rising ratios/);
  });
  it('geo(r, n, k …) in a scan: intervals r^(k/n) — a series', () => {
    const r = compileSource('&time scan(geo(5, 25, 0 10 5 20 15) 1)');
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const steps = r.cells.get('time')!.scan!.steps;
    expect(steps.map((x) => +x.toFixed(4))).toEqual([1, 1.9037, 1.3797, 3.6239, 2.6265, 1]);
  });
  it('map=db: decibels — 0 full, −6 about half, −20 a tenth, a rest silent', () => {
    const r = compileSource('&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&vol map=db step=&m/4 0 -6 -20 ~\n&mix loop=SAMPLE_RATE map=sample [&t * &vol * &v]');
    expect(r.diagnostics).toEqual([]);
    const e = eventsBetween(plan(r, codeShifts(r)), 0, 0.9)[0];
    expect(e.levels.map((l) => +l.level.toFixed(3))).toEqual([1, 0.501, 0.1, 0]);
  });
  it('a voice’s colours and names follow its grid: position, nearest 12-tone note and cents', () => {
    const r = compileSource('&steps cycle=25 map=ed(5)\n&m step=1\n&t over=&steps step=&m 0 5\n&s s=sine loop=100\n&mix loop=SAMPLE_RATE map=sample [&t * &s]');
    expect(voiceGrid(r, 's')).toBe('steps');
    expect(freqHue(r, 's', 100)).toBe(0);
    expect(freqHue(r, 's', 100 * Math.pow(5, 5 / 25))).toBeCloseTo(72); // five steps up: a fifth of the rainbow
    const n = gridName(r, 's', 100 * Math.pow(5, 5 / 25))!;
    expect(n).toMatchObject({ grid: 'steps', position: 5 });
    expect(n.nearest).toBe('C♯3'); // 138.0 Hz: C♯3 is 138.6
    expect(n.cents).toBe(-8);
    // on the 12-tone grid, the note's name is enough
    expect(gridName(compileSource('&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]'), 'v', 261.63)).toBeNull();
  });
});

describe('transposing a reference: &x^n', () => {
  const sounds = (src: string, cell = 't') => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return flattenPitches(r, cell);
  };
  // what a cell plays, as grid positions after its tables and every ^n
  function flattenPitches(r: ReturnType<typeof compileSource>, cell: string) {
    return flatten(r, cell, codeShifts(r), null).map((e) => {
      const p = resolveIn(r, e.table, e.tableShift, e.value, e.alter, codeShifts(r));
      return +(semitones(r, p.root, p.position + (e.transpose ?? 0))).toFixed(4);
    });
  }
  it('reads ^n and ^-n, also after a bracket', () => {
    const atoms = parse('&t &m^7 &m^-12 &m[::-1]^2 &m[>>]^1').cells[0].braid;
    expect(atoms.kind === 'list' && atoms.tokens.map((t) => (t.atom.kind === 'ref' ? [t.atom.transpose, t.atom.shift, !!t.atom.pick] : null))).toEqual([
      [7, 0, false],
      [-12, 0, false],
      [2, 0, true],
      [1, 1, false],
    ]);
    expect(parse('&t &m^').diagnostics[0].message).toMatch(/transposes by n grid steps/);
  });
  it('on the 12-tone grid, ^n is n semitones', () => {
    expect(sounds('&m 0 4 7\n&t &m &m^7 &m^-12')).toEqual([0, 4, 7, 7, 11, 14, -12, -8, -5]);
  });
  it('after the tables: a motif in scale degrees keeps its shape, n grid steps higher', () => {
    expect(sounds('&major scan(2 2 1 2 2 2 1)\n&m 0 2 4\n&t over=&major &m &m^7')).toEqual([0, 4, 7, 7, 11, 14]);
  });
  it('on another grid, ^n is n of its steps: Studie II, 8 steps up the 5:1 grid', () => {
    const ps = sounds('&steps cycle=25 map=ed(5)\n&m 0 1\n&t over=&steps &m &m^8');
    expect(Math.pow(2, ps[2] / 12)).toBeCloseTo(Math.pow(5, 8 / 25), 5);
  });
  it('nested: the steps add up', () => {
    expect(sounds('&a 0\n&b &a^2\n&t &b^3 &b')).toEqual([5, 2]);
  });
  it('in a mix, it says to add pitch instead', () => {
    const r = compileSource('&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t^7 * &v]');
    expect(r.diagnostics.map((d) => d.message).join()).toMatch(/transposing \(\^\) is for braids — in a mix, add pitch: &t \+ 7/);
  });
  it('the graph labels the reference with it', () => {
    const g = buildGraph(compileSource('&m 0 4\n&t step=1 &m^7\n&v s=tri\n&mix loop=SAMPLE_RATE map=sample [&t * &v]'));
    expect(g.edges.find((e) => e.source === 'cell:t' && e.target === 'cell:m')!.pick).toBe('^7');
  });
});

describe('about=: a note links to the cells it explains', () => {
  const src = `&hint label="the filter opens on every note" about=(&fenv &accent)
&fenv map=adsr .003 .18 .1 .06
&accent map=amp 1 .4`;
  // (a piece with no sound card only warns that nothing plays)
  const errors = (text: string) => compileSource(text).diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
  it('draws one edge from the note to each cell, and the note stays a note', () => {
    const r = compileSource(src);
    expect(errors(src)).toEqual([]);
    const hint = r.cells.get('hint')!;
    expect([hint.note, hint.about]).toEqual([true, ['fenv', 'accent']]);
    const g = buildGraph(r);
    expect(g.edges.filter((e) => e.kind === 'about').map((e) => [e.source, e.target])).toEqual([
      ['cell:hint', 'cell:fenv'],
      ['cell:hint', 'cell:accent'],
    ]);
  });
  it('is checked: an unknown cell, and a cell that is not a note', () => {
    expect(errors('&hint label="x" about=&nope')).toEqual(['Unknown cell &nope']);
    expect(errors('&a 0 1\n&b step=&a label="x" 0 about=&a').join(' ')).toMatch(/about= belongs on a note/);
  });

  it('a table is its numbers: cells spliced into one are skipped when it is read, and that says so', () => {
    const src = (tunes: string) =>
      `&bar step=1\n&major scan(2 2 1 2 2 2 1)\n&a over=&major 0 1\n&b over=&major 4 5\n${tunes}\n&solo over=&tunes step=&bar 0 1\n&v s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [&solo * &v]`;
    const msgs = (t: string) => compileSource(src(t)).diagnostics.map((d) => d.message);
    expect(msgs('&tunes &a &b')).toEqual([
      "&tunes is read as a table, but its cells (&a &b) aren't entries: a table is its numbers. To play cells one after another, splice them into a braid (&solo &a &b); choosing a melody per step isn't built yet (#29)",
    ]);
    expect(msgs('&tunes over=&major 0 &a 5')[0]).toMatch(/its cells \(&a\) aren't entries/);
    expect(msgs('&tunes over=&major 0 1 4 5')).toEqual([]); // numbers: a table
  });

  it('a fast vibrato (a braid at audio rate, no sound of its own) is a pitch in a pitch sum (#28)', () => {
    const r = compileSource('&m step=4\n&t step=&m 0 2\n&vib loop=30 0 .3 0 -.3\n&lead s=saw loop=C4\n&out loop=SAMPLE_RATE map=sample [(&t + &vib) * &lead]');
    expect(r.diagnostics).toEqual([]);
    expect(r.outputs[0]).toMatchObject({ voice: 'lead', cell: 't', mods: [{ cell: 'vib' }] });
  });

  it('a pitch shape: pitch=lo..hi * &(map=adsr …) is a drop in semitones (#30)', () => {
    const src = (bd: string) => `&m step=4\n&t step=&m 0 0\n${bd}\n&out loop=SAMPLE_RATE map=sample [&t * &bd]`;
    const r = compileSource(src('&bd s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)'));
    expect(r.diagnostics).toEqual([]);
    const e = eventsBetween(plan(r, codeShifts(r)), 0, 0.5)[0];
    expect(e.params?.pitch).toEqual({ kind: 'env', from: 0, peak: 30, attack: 0, decay: 0.04, sustain: 0, release: 0 });
    // a vibrato is still pitch=&cell
    expect(compileSource(src('&bd s=sine loop=A1 pitch=&(loop=5 0 .1 -.1)')).diagnostics).toEqual([]);
    // penv= pdec= are gone, and say what replaces them
    expect(compileSource(src('&bd s=sine loop=A1 penv=30 pdec=.04')).diagnostics[0].message).toMatch(/penv= is gone: .* is pitch=0\.\.30 \* &\(map=adsr 0 \.04 0 0\)/);
  });
});
