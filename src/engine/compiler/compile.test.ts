import { describe, expect, it } from 'vitest';
import { SAILOR_WITH_KIT } from '../fixtures';
import { setFree } from '../edit';
import { compileSource } from '../compile';
import { noteFrequency, codeShifts, LABEL_FIELDS, MAX_EVENTS, MAX_NOTES_PER_SECOND, MAX_SPLICE_DEPTH, type Shifts } from '../program';
import { MAX_NESTING } from '../parser/scanner';
import { START as LAW_START } from '../fiveto12';
import { freqHue, gridName, positionOf, voiceGrid, positionHue, semitones, entries, lookup, resolveIn, resolvePitch, shiftedUnits } from '../helix';
import { flatten } from '../flatten';
import { eventsBetween, plan } from '../realize';
import { parse } from '../parser';
import { buildGraph } from '../../layout/drawn';
import { edgeLabel } from '../transform';
import { PRESETS } from '../presets';
import { modeName } from '../../theory/modes';

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
  const r = compileSource(SAILOR_WITH_KIT);
  it('motifs read through the table of whoever splices them; a shifted table steps it down', () => {
    expect(r.cells.get('m1')).toMatchObject({ over: null, context: 'lead' });
    expect(spell(r, 'A')).toBe('A A A A A A D F');
    expect(spell(r, 'B')).toBe('G G G G G G C E'); // the same line through &lead[<<]: one step down
    expect(spell(r, 'C')).toBe('G F D D D D');
  });

  it('&x[i] and &x[a:b] pick from the braid, Python-style', () => {
    const r2 = compileSource('&bar 0 1 2 3\n&foo &bar[-1] &bar[1] &bar[1:3] &bar[:-2] &bar[-1:]');
    expect(r2.ok).toBe(true);
    expect(flatten(r2, 'foo', codeShifts(r2)).map((e) => e.value)).toEqual([3, 1, 1, 2, 0, 1, 3]);
    expect(r2.cells.get('foo')!.steps).toBe(7);
  });

  it('a pick reads the cell as it is turned (a wrapped entry climbs); $ as written', () => {
    const r2 = compileSource('&bar shift=1 0 1 2 3\n&foo &bar[0] &bar[-1]\n&abs &bar[$0] &bar[$-1]');
    expect(spell(r2, 'foo')).toBe('C# C');
    expect(flatten(r2, 'foo', codeShifts(r2)).map((e) => e.value)).toEqual([1, 12]);
    expect(flatten(r2, 'abs', codeShifts(r2)).map((e) => e.value)).toEqual([0, 3]);
    expect(spell(r2, 'abs')).toBe('C Eb');
    // as the whole cell plays it
    expect(flatten(r2, 'bar', codeShifts(r2)).map((e) => e.value)).toEqual([1, 2, 3, 12]);
  });

  it('the base case: a key turned two, its picks relative, $ absolute', () => {
    const r2 = compileSource(
      '&key shift=2\n&mode over=&key scan(2 2 1 2 2 2 1) shift=1\n&tonic &key[0]\n&maj &key[0] &key[4] &key[7]\n&cmaj &key[$0] &key[$4] &key[$7]\n&first &mode[0]\n&top &key[10]',
    );
    expect(r2.ok).toBe(true);
    expect(spell(r2, 'tonic')).toBe('D');
    expect(spell(r2, 'maj')).toBe('D F# A');
    expect(spell(r2, 'cmaj')).toBe('C E G');
    expect(spell(r2, 'first')).toBe('E');
    // (past the turn's end: a lap up)
    expect(resolveIn(r2, 'key', 0, 10, 0, codeShifts(r2)).position).toBe(12);
    // a pick follows its table as it turns: under another shift, another note
    const turned: Shifts = (n) => (n === 'key' ? 7 : codeShifts(r2)(n));
    expect(spell(r2, 'maj', turned)).toBe('G B D');
    expect(spell(r2, 'cmaj', turned)).toBe('C E G');
  });

  it('slices are relative too, [$a:b] as written', () => {
    const r2 = compileSource('&bar shift=2 0 1 2 3\n&rel &bar[0:2]\n&abs &bar[$0:2]');
    expect(spell(r2, 'rel')).toBe('D Eb');
    expect(spell(r2, 'abs')).toBe('C C#');
  });

  it('a rotation is two slices (without the climb); [>>] is the shift (with it)', () => {
    const r2 = compileSource('&bar 0 1 2 3\n&rot &bar[1:] &bar[:1]\n&sh &bar[>>]\n&back &bar[<<]');
    expect(flatten(r2, 'rot', codeShifts(r2)).map((e) => e.value)).toEqual([1, 2, 3, 0]);
    expect(flatten(r2, 'sh', codeShifts(r2)).map((e) => e.value)).toEqual([1, 2, 3, 12]);
    expect(flatten(r2, 'back', codeShifts(r2)).map((e) => e.value)).toEqual([-9, 0, 1, 2]);
  });

  it('[<<] adds to the cell’s own rotation; a pick reads the cell’s own', () => {
    const r2 = compileSource('&bar shift=1 0 1 2 3\n&a &bar[<<]\n&b &bar[0]\n&c &bar[$0]');
    expect(flatten(r2, 'a', codeShifts(r2)).map((e) => e.value)).toEqual([0, 1, 2, 3]);
    expect(spell(r2, 'b')).toBe('C#');
    expect(spell(r2, 'c')).toBe('C');
  });

  it('a shifted table reference transposes through it: over=&s[>>2]', () => {
    const r3 = compileSource('&s scan(2 2 1 2 2 2 1)\n&n over=&s[>>2] 0 1 2');
    expect(spell(r3, 'n')).toBe('E F G');
  });

  it('picks keep their modifiers and step lengths', () => {
    const r2 = compileSource('&a 5 6\n&bar 0@2 &a!2 3*2\n&foo &bar[1] &bar[-1]');
    expect(flatten(r2, 'foo', codeShifts(r2)).map((e) => [e.step, e.duration, e.value])).toEqual([
      [0, 1, 5],
      [1, 1, 6],
      [2, 1, 5],
      [3, 1, 6],
      [4, 0.5, 3],
      [4.5, 0.5, 3],
    ]);
  });

  it('out-of-range picks and picks on tables are errors', () => {
    const msgs = (src: string) =>
      compileSource(src)
        .diagnostics.map((d) => d.message)
        .join('\n');
    expect(msgs('&bar 0 1\n&foo &bar[5]')).toMatch(/&bar\[5\] picks nothing: past the end, &bar has 2 steps/);
    expect(msgs('&bar 0 1\n&foo &bar[2:]')).toMatch(/&bar\[2:\] picks nothing: it starts past the end, &bar has 2 steps/);
    expect(msgs('&bar 0 1 2\n&foo &bar[2:1]')).toMatch(/&bar\[2:1\] picks nothing: it ends before it starts/);
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
&b step=&m/2 0
&c step=&m*3 0
&d step=cycle(&a) 0
&e step=cycle(&a)/2 0
&f step=cycle(&a)*2 0
&g step=&d*5 0`);
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
    expect(r.outputs[0]).toMatchObject({
      voice: 'v',
      cell: 't',
      mods: [
        { cell: 'vib', sign: 1 },
        { cell: 'x', sign: -1 },
      ],
    });
  });

  it('reports loops, still drivers, unmoving outputs, bad voices', () => {
    const msgs = (s: string) =>
      compileSource(s)
        .diagnostics.map((d) => d.message)
        .join('\n');
    expect(msgs('&a step=&b 0\n&b step=&a 1')).toMatch(/loops back/);
    expect(msgs('&a step=&nope 0')).toMatch(/Unknown cell &nope/);
    expect(msgs('&m scan(27 23 26 24)\n&a step=&m 0\n&v s=saw\n&mix_ [&a * &v]\n&out_ loop=44k map=sample &mix_')).toMatch(/&m never moves/);
    expect(msgs('&a 0\n&v s=saw\n&mix_ [&a * &v]\n&out_ loop=44k map=sample &mix_')).toMatch(/Nothing starts notes on &v/);
    // (a voice alone plays its own pitch, held: decision 028)
    expect(msgs('&v s=saw\n&mix_ [&v]\n&out_ loop=44k map=sample &mix_')).toBe('');
    expect(msgs('&v s=kazoo')).toMatch(/Unknown sound 'kazoo'/);
    expect(msgs('&m step=1\n&v s=saw step=&m')).toMatch(/moves at a rate/);
    expect(msgs('&v s=saw lpf=high')).toMatch(/lpf= takes a number/);
    expect(msgs('&k stride=7 0')).toMatch(/stride= only matters/);
    expect(msgs('&v loop=440 map=&nope\n&m step=1\n&t step=&m 0\n&mix_ [&t * &v]\n&out_ loop=44k map=sample &mix_')).toMatch(/Unknown cell &nope/);
  });
});

describe('errors', () => {
  const msgs = (src: string) =>
    compileSource(src)
      .diagnostics.map((d) => d.message)
      .join('\n');
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
    const msgs = (s: string) =>
      compileSource(base + s)
        .diagnostics.map((d) => d.message)
        .join('\n');
    expect(msgs('&mix_ [(&a + &b) * &x]\n&out_ loop=44k map=sample &mix_')).toMatch(/Both &a and &b would start notes on &x/);
    expect(msgs('&mix_ [(&vib + &up) * &x]\n&out_ loop=44k map=sample &mix_')).toMatch(/Nothing starts notes on &x/);
  });

  it('of two step= terms, the finer starts notes and the coarser holds under it, as a loop= term would (#10)', () => {
    const tail = '\n&walk step=&bar 0 4 7 10\n&v s=sine loop=C4\n&out map=sample [(&walk + &changes) * &v]';
    const notes = (s: string) => {
      const r = compileSource('&bar scan(1 1 1 1) step=120bpm\n' + s + tail);
      expect(r.diagnostics).toEqual([]);
      expect(r.outputs.map((o) => [o.cell, o.mods.map((m) => m.cell)])).toEqual([['walk', ['changes']]]);
      return eventsBetween(plan(r, codeShifts(r)), 0, 8).map((e) => `${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.freq.toFixed(2)}`);
    };
    const stepped = notes('&changes step=&bar/4 0 5');
    expect(stepped).toEqual(notes('&changes loop=&bar/8 0 5'));
    expect(stepped[4].endsWith('349.23')).toBe(true); // bar 2: the walk on F
    // (written either way round: + commutes)
    const r = compileSource('&bar scan(1 1 1 1) step=120bpm\n&changes step=&bar/4 0 5' + tail.replace('(&walk + &changes)', '(&changes + &walk)'));
    expect(r.outputs[0].cell).toBe('walk');
  });

  it('the voice is the factor that is a sound, wherever it is written', () => {
    const r = (s: string) => compileSource(base + s + '\n&out_ loop=44k map=sample &mix_');
    const same = (a: string, b: string) =>
      expect(r(a).outputs.map((o) => [o.voice, o.cell, o.offset, o.gains])).toEqual(r(b).outputs.map((o) => [o.voice, o.cell, o.offset, o.gains]));
    same('&mix_ [&x * &a]', '&mix_ [&a * &x]');
    same('&mix_ [.5 * &x * &a]', '&mix_ [&a * &x * .5]');
    expect(r('&mix_ [&x * &a]').diagnostics).toEqual([]);
    const msgs = (s: string) =>
      r(s)
        .diagnostics.map((d) => d.message)
        .join('\n');
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
    const msgs = (s: string) =>
      compileSource(base + s)
        .diagnostics.map((d) => d.message)
        .join('\n');
    expect(msgs('&mix [&a * &x]\n&out map=sample &mix &mix &mix')).toMatch(/one channel \(mono\) or two/);
    expect(msgs('&out map=sample &a')).toMatch(/A channel of the sound card is a mix/);
    expect(msgs('&mix [&a * &x] 0')).toMatch(/A mix is one chord of sounds/);
    expect(
      compileSource('&a 0')
        .diagnostics.map((d) => d.message)
        .join(),
    ).toMatch(/Nothing plays yet/);
  });
});

describe('a note by name is a pitch; a number an index', () => {
  it('[C, E, G] is C E G whatever the cell reads; a number beside it reads the table', () => {
    const r = compileSource('&key shift=2\n&s over=&key scan(2 2 1 2 2 2 1)\n&a over=&s [C, E, G]\n&b over=&s [0, E, 4]\n&c over=&s D F# A C5\n&d [Bb3, Eb, G]');
    expect(r.ok).toBe(true);
    expect(spell(r, 'a')).toBe('C E G');
    expect(spell(r, 'b')).toBe('D E A');
    expect(spell(r, 'c')).toBe('D F# A C');
    expect(flatten(r, 'c', codeShifts(r)).map((e) => resolveIn(r, e.table, e.tableShift, e.value, e.alter, codeShifts(r)).position)).toEqual([2, 6, 9, 12]);
    expect(spell(r, 'd')).toBe('Bb Eb G');
  });
  it('a name sits on the grid: ^n and ^$n move it alike; over a scale, numbers tell them apart', () => {
    const semis = (src: string) => {
      const r = compileSource(src);
      return flatten(r, 't', codeShifts(r)).map((e) => {
        const p = resolveIn(r, e.table, e.tableShift, e.value, e.alter, codeShifts(r));
        return semitones(r, p.root, p.position + (e.transpose ?? 0));
      });
    };
    const s = '&major scan(2 2 1 2 2 2 1)\n&q C E G\n&n 0 2 4\n&t over=&major step=1 ';
    expect(semis(s + '&q^2')).toEqual([2, 6, 9]);
    expect(semis(s + '&q^$2')).toEqual([2, 6, 9]);
    expect(semis(s + '&n^2')).toEqual([4, 7, 11]);
    expect(semis(s + '&n^$2')).toEqual([2, 6, 9]);
  });
  it('free(D) is a pitch class by name: a tonic, a turn of the 12', () => {
    const r = compileSource('&s scale(dorian, free(D))\n&t over=&s 0\n&key shift=free(G)\n&u over=&key 0');
    expect(spell(r, 't')).toBe('D');
    expect(spell(r, 'u')).toBe('G');
    expect(r.cells.get('key')!.frees[0]).toMatchObject({ key: 'shift', value: 7, lo: 0, hi: 11, byName: true });
    // (an octave with it says nothing: said, not dropped silently)
    const o = compileSource('&key shift=free(C100)\n&u over=&key 0');
    expect(o.diagnostics.map((d) => d.message)).toContain('free(C100): a key is a pitch class — the octave is left out: free(C)');
    expect(o.cells.get('key')!.frees[0].value).toBe(0);
  });
});

describe('scale(name, tonic)', () => {
  it('a scale by name over the 12 turned to its tonic — after over=, hidden from the graph', () => {
    const r = compileSource('&a over=scale(minor) 0 1 2 3 4 5 6 7\n&b over=scale(dorian, D) 0 1 2 3 4 5 6\n&c over=scale(major, G) 0 2 4\n&d over=scale(minor, 9) 0 2 4');
    expect(r.ok).toBe(true);
    expect(spell(r, 'a')).toBe('C D Eb F G Ab Bb C');
    expect(spell(r, 'b')).toBe('D E F G A B C');
    expect(spell(r, 'c')).toBe('G B D');
    expect(spell(r, 'd')).toBe('A C E');
    expect([...r.cells.values()].filter((c) => /^(scale|key):/.test(c.name)).every((c) => c.implicit)).toBe(true);
  });
  it('a tonic by name is a pitch class: Cb is B, B# is C (in the same octave, without a warning)', () => {
    const r = compileSource('&a over=scale(major, Cb) 0 2 4\n&b over=scale(major, B) 0 2 4\n&c over=scale(major, B#) 0 2 4\n&d over=scale(major, C) 0 2 4');
    expect(r.diagnostics.filter((d) => /tonic/.test(d.message))).toEqual([]);
    const semis = (name: string) =>
      flatten(r, name, codeShifts(r)).map((e) => {
        const p = resolvePitch(r, name, e.value, e.alter, codeShifts(r));
        return semitones(r, p.root, p.position);
      });
    expect(semis('a')).toEqual(semis('b'));
    expect(semis('c')).toEqual(semis('d'));
  });
  it('in a braid: the cell is the scale, reading through its own key; shift= walks its modes, the tonic transposes', () => {
    const r = compileSource('&s scale(minor, D)\n&t over=&s 0 1 2 3 4 5 6\n&m scale(minor, D) shift=2\n&u over=&m 0 2 4\n&b scale(blues, Bb)\n&v over=&b 0 1 2 3 4 5');
    expect(r.ok).toBe(true);
    expect(spell(r, 't')).toBe('D E F G A Bb C');
    expect(spell(r, 'u')).toBe('F A C');
    expect(spell(r, 'v')).toBe('Bb C# Eb E F Ab');
  });
  it('is the same as writing the key and scale out', () => {
    const short = compileSource('&t over=scale(minor, A) 0 2 4 6# 7');
    const long = compileSource('&k shift=9\n&s over=&k scan(2 1 2 2 1 2 2)\n&t over=&s 0 2 4 6# 7');
    expect(spell(short, 't')).toBe(spell(long, 't'));
    const braid = compileSource('&s scale(minor, A)\n&t over=&s 0 2 4 6# 7');
    expect(spell(braid, 't')).toBe(spell(long, 't'));
  });
  it('a tonic left free is the cell’s own slider (its tonic), and moves the key', () => {
    const r = compileSource('&s scale(dorian, free(2, 0..11))\n&t over=&s 0');
    expect(r.cells.get('s')!.frees.map((f) => [f.key, f.value])).toEqual([['tonic', 2]]);
    expect(spell(r, 't')).toBe('D');
  });
  it('the old scale(tonic, phase) still reads, and says how it is written now', () => {
    const r = compileSource('&t over=scale(9,2) 0 2 4');
    expect(spell(r, 't')).toBe('A C E');
    expect(r.diagnostics.map((d) => [d.severity, d.message])).toContainEqual(['warning', 'scale(9, 2) is written scale(minor, A): the mode by name, then the tonic']);
  });
  it('explains itself when malformed, or given a key of its own', () => {
    expect(compileSource('&a over=scale(0) 0').diagnostics[0].message).toMatch(/scale\(minor, A\)/);
    expect(compileSource('&a scale(nope)').diagnostics[0].message).toMatch(/a scale by name — major minor/);
    expect(compileSource('&k shift=2\n&a scale(minor) over=&k').diagnostics[0].message).toMatch(/reads through a key of its own/);
  });
});

describe('tier=: a tier of the tutorial', () => {
  it('belongs on the card', () => {
    const errors = (src: string) =>
      compileSource(src)
        .diagnostics.filter((d) => d.severity === 'error')
        .map((d) => d.message);
    expect(errors('&p label="x" tier=2')).toEqual(['tier= belongs on a piece’s card: the note with its title=']);
    expect(errors('&p title="x" tier=2')).toEqual([]);
  });
  it('warns on a card that is not in the tutorial', () => {
    const warnings = (src: string) =>
      compileSource(src)
        .diagnostics.filter((d) => d.severity === 'warning')
        .map((d) => d.message)
        .filter((m) => m.startsWith('tier='));
    expect(warnings('&p title="x" tier=2')).toHaveLength(1);
    expect(warnings('&p title="x" tags="tutorial" tier=2')).toEqual([]);
    expect(warnings('&p title="x" tags="basics, rhythm" tier=2')).toEqual([]);
  });
});

describe('transpose example', () => {
  const r = compileSource(PRESETS.transpose.source);
  it('turning &key transposes the theme, turning &mode starts the scale elsewhere', () => {
    expect(r.diagnostics).toEqual([]);
    expect(spell(r, 'theme')).toBe('E G B E B G E'); // as written: D major's Dorian, on E
    expect(spell(r, 'theme', with_(r, { key: 0, mode: 0 }))).toBe('C E G C G E C');
    expect(spell(r, 'theme', with_(r, { key: 2, mode: 0 }))).toBe('D F# A D A F# D');
    expect(spell(r, 'theme', with_(r, { key: 0, mode: 1 }))).toBe('D F A D A F D'); // Dorian on D, same notes as C major
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
    expect(
      compileSource('&v loop=H4')
        .diagnostics.map((d) => d.message)
        .join(),
    ).toMatch(/note names like C4/);
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
    const msgs = (s: string) =>
      compileSource(s)
        .diagnostics.map((d) => d.message)
        .join();
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
      [2, 1],
      [1, 2],
      [0, 1],
      [9, 1],
      [0, 1],
      [1, 2],
      [2, 1],
    ]);
    expect(
      compileSource('&a 0 1\n&b &a[::0]')
        .diagnostics.map((d) => d.message)
        .join(),
    ).toMatch(/step of 0 never moves/);
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
    expect(r.cells.get('mix')!.frees.map((f) => [f.key, f.value])).toEqual([
      ['gain', 0.8],
      ['gain', 0.3],
    ]);
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
    const msg = (s: string) =>
      compileSource(s)
        .diagnostics.map((d) => d.message)
        .join();
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
    const msg = (s: string) =>
      compileSource(s)
        .diagnostics.map((d) => d.message)
        .join();
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
    const r = compileSource('&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&vol map=db step=&m*4 0 -6 -20 ~\n&mix loop=SAMPLE_RATE map=sample [&t * &vol * &v]');
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

describe('moving a reference: &x^n by its table (degrees), &x^$n by the grid (#179)', () => {
  const sounds = (src: string, cell = 't') => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return flattenPitches(r, cell);
  };
  // what a cell plays, as grid positions after its tables and every ^$n
  function flattenPitches(r: ReturnType<typeof compileSource>, cell: string) {
    return flatten(r, cell, codeShifts(r), null).map((e) => {
      const p = resolveIn(r, e.table, e.tableShift, e.value, e.alter, codeShifts(r));
      return +semitones(r, p.root, p.position + (e.transpose ?? 0)).toFixed(4);
    });
  }
  it('reads ^n, ^-n, ^$n and ^$-n, also after a bracket', () => {
    const atoms = parse('&t &m^$7 &m^$-12 &m[::-1]^$2 &m[>>]^$1 &m^1 &m[0]^-2').cells[0].braid;
    expect(atoms.kind === 'list' && atoms.tokens.map((t) => (t.atom.kind === 'ref' ? [t.atom.transpose, t.atom.values?.add, t.atom.shift, !!t.atom.pick] : null))).toEqual([
      [7, undefined, 0, false],
      [-12, undefined, 0, false],
      [2, undefined, 0, true],
      [1, undefined, 1, false],
      [undefined, 1, 0, false],
      [undefined, -2, 0, true],
    ]);
    expect(parse('&t &m^').diagnostics[0].message).toMatch(/moves it n steps of its table/);
    expect(parse('&t &m^$').diagnostics[0].message).toMatch(/n semitones/);
  });
  it('on the 12-tone grid, ^$n is n semitones', () => {
    expect(sounds('&m 0 4 7\n&t &m &m^$7 &m^$-12')).toEqual([0, 4, 7, 7, 11, 14, -12, -8, -5]);
  });
  it('^$n after the tables: a motif in scale degrees keeps its shape, n grid steps higher', () => {
    expect(sounds('&major scan(2 2 1 2 2 2 1)\n&m 0 2 4\n&t over=&major &m &m^$7')).toEqual([0, 4, 7, 7, 11, 14]);
  });
  it('^n before the table: n degrees, as degree(&m, n) is — over a scale they differ', () => {
    const scale = '&major scan(2 2 1 2 2 2 1)\n&m 0 2 4\n';
    expect(sounds(scale + '&t over=&major &m^1 &m^-1')).toEqual([2, 5, 9, -1, 2, 5]);
    expect(sounds(scale + '&t over=&major &m^1')).toEqual(sounds(scale + '&t over=&major degree(&m, 1)'));
    expect(sounds(scale + '&t over=&major &m^$1')).toEqual([1, 5, 8]);
    // (on the 12 they agree)
    expect(sounds('&m 0 4\n&t &m^3')).toEqual(sounds('&m 0 4\n&t &m^$3'));
  });
  it('on another grid, ^$n is n of its steps: Studie II, 8 steps up the 5:1 grid', () => {
    const ps = sounds('&steps cycle=25 map=ed(5)\n&m 0 1\n&t over=&steps &m &m^$8');
    expect(Math.pow(2, ps[2] / 12)).toBeCloseTo(Math.pow(5, 8 / 25), 5);
  });
  it('nested: the steps add up', () => {
    expect(sounds('&a 0\n&b &a^$2\n&t &b^$3 &b')).toEqual([5, 2]);
    expect(sounds('&major scan(2 2 1 2 2 2 1)\n&a 0\n&b &a^2\n&t over=&major &b^1 &b')).toEqual([5, 4]);
  });
  it('in a mix, it says what to write instead', () => {
    const r = compileSource('&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t^$7 * &v]');
    expect(r.diagnostics.map((d) => d.message).join()).toMatch(/transposing \(\^\$\) is for braids — in a mix, add pitch: &t \+ 7/);
    const d = compileSource('&m step=1\n&t step=&m 0\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t^1 * &v]');
    expect(d.diagnostics.map((x) => x.message).join()).toMatch(/moving by degrees \(\^\) is for braids/);
  });
  it('the graph labels the reference with it', () => {
    const g = buildGraph(compileSource('&m 0 4\n&t step=1 &m^7\n&u step=1 &m\n&v s=tri\n&mix loop=SAMPLE_RATE map=sample [&t * &v]'));
    expect(edgeLabel(g.edges.find((e) => e.source === 'cell:t' && e.target === 'cell:m')!)).toBe('^7');
  });
});

describe('about=: a note links to the cells it explains', () => {
  const src = `&hint label="the filter opens on every note" about=(&fenv &accent)
&fenv map=adsr .003 .18 .1 .06
&accent map=amp 1 .4`;
  // (a piece with no sound card only warns that nothing plays)
  const errors = (text: string) =>
    compileSource(text)
      .diagnostics.filter((d) => d.severity === 'error')
      .map((d) => d.message);
  it('draws one edge from the note to each cell, and the note stays a note', () => {
    const r = compileSource(src);
    expect(errors(src)).toEqual([]);
    const hint = r.cells.get('hint')!;
    expect([hint.note, hint.about]).toEqual([true, ['fenv', 'accent']]);
    const g = buildGraph(r);
    expect(g.edges.filter((e) => e.port === 'about').map((e) => [e.source, e.target])).toEqual([
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

describe('diagnostics: nothing plays, or the wrong thing, without a word (#143)', () => {
  // a played melody, &tune, through a voice into the sound card
  const piece = (tune: string) => `${tune}\n&pluck s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&tune * &pluck]`;
  // what it says (but "Nothing plays yet", which a lone line always gets)
  const said = (src: string) =>
    compileSource(src)
      .diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'))
      .map((d) => [d.severity, d.span.line, d.span.col, d.message] as const);

  it('a cell that expands beyond MAX_EVENTS is an error at the step that does it, naming the cap', () => {
    expect(said(piece('&a 0!4000\n&tune step=120bpm 0 &a!4000'))).toEqual([
      ['error', 2, 21, `&tune expands to 16,000,001 notes: more than ${MAX_EVENTS.toLocaleString('en')}, the most a cell can hold — repeat less (!n), or let a clock repeat it`],
    ]);
    // reported once, where it first goes over: not again on what plays it
    expect(said('&a 0!4000\n&b &a!4000\n&c &b &b').filter(([s]) => s === 'error')).toHaveLength(1);
    expect(compileSource(piece('&a 0!40\n&tune step=120bpm &a!40')).ok).toBe(true);
  });

  it('a played cell faster than MAX_NOTES_PER_SECOND is an error at its step=, naming the cap', () => {
    expect(said(piece('&tune 0 1 2 step=1000000'))).toEqual([
      ['error', 1, 18, `&tune would start 1,000,000 notes a second: more than ${MAX_NOTES_PER_SECOND.toLocaleString('en')}, the most a cell can play — slow its step= or loop=`],
    ]);
    // through a clock too: its rate times the ratio
    expect(said(piece('&bar step=120bpm 0\n&tune step=&bar*2000 0 1 2')).map((d) => d[3])).toEqual([expect.stringMatching(/^&tune would start 4,000 notes a second/)]);
    // audio-rate cells start no notes: a voice's wave, a sound card
    expect(compileSource(piece('&tune step=120bpm 0 1 2')).diagnostics).toEqual([]);
  });

  it(`unnamed cells nest ${MAX_NESTING} deep at most: deeper is an error, never a stack overflow`, () => {
    const nested = (n: number) => piece(`&tune step=120bpm ${'&('.repeat(n)}0${')'.repeat(n)}`);
    expect(compileSource(nested(MAX_NESTING)).ok).toBe(true);
    for (const n of [MAX_NESTING + 1, 1500]) {
      let r: R | undefined;
      expect(() => (r = compileSource(nested(n)))).not.toThrow();
      expect(r!.diagnostics.map((d) => [d.severity, d.span.line, d.message])).toEqual([
        ['error', 1, `Unnamed cells &( … ) nest ${MAX_NESTING} deep at most: name the inner ones (&env …) and refer to them`],
      ]);
      expect(() => eventsBetween(plan(r!, codeShifts(r!)), 0, 4)).not.toThrow();
    }
  });

  it(`parentheses in a mix nest ${MAX_NESTING} deep at most: deeper is an error, never a stack overflow (#160)`, () => {
    const grouped = (n: number) => `&tune step=120bpm 0 1\n&pluck s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [${'('.repeat(n)}&tune * &pluck${')'.repeat(n)}]`;
    expect(compileSource(grouped(MAX_NESTING)).diagnostics).toEqual([]);
    for (const n of [MAX_NESTING + 1, 5000]) {
      let r: R | undefined;
      expect(() => (r = compileSource(grouped(n)))).not.toThrow();
      // (the sound card's own line failed: no "Nothing plays yet" beside its error)
      expect(r!.diagnostics.map((d) => [d.severity, d.span.line, d.message])).toEqual([
        ['error', 3, `Parentheses in a mix nest ${MAX_NESTING} deep at most: name a part (&part [ … ]) and use it`],
      ]);
      expect(() => eventsBetween(plan(r!, codeShifts(r!)), 0, 4)).not.toThrow();
    }
  });

  it(`cells splice into each other ${MAX_SPLICE_DEPTH} deep at most: deeper is one error, never a stack overflow (#160)`, () => {
    const chain = (n: number) => [...Array.from({ length: n }, (_, i) => `&c${i} ${i === n - 1 ? '0 1' : `&c${i + 1}`}`), '&tune step=120bpm &c0'].join('\n');
    expect(said(piece(chain(MAX_SPLICE_DEPTH)))).toEqual([]);
    for (const n of [MAX_SPLICE_DEPTH + 1, 5000]) {
      let r: R | undefined;
      expect(() => (r = compileSource(piece(chain(n))))).not.toThrow();
      const errors = r!.diagnostics.filter((d) => d.severity === 'error');
      expect(errors.map((d) => d.message)).toEqual([expect.stringMatching(new RegExp(`^&c0 splices cells into each other more than ${MAX_SPLICE_DEPTH} deep`))]);
      expect(() => eventsBetween(plan(r!, codeShifts(r!)), 0, 4)).not.toThrow();
      expect(() => buildGraph(r!)).not.toThrow();
    }
  });

  it('a cap says what the user wrote: an unnamed cell as such, a rate past counting as unbounded (#163)', () => {
    expect(said(`&a 0!4000\n${piece('&tune step=4 &(&a!4000)')}`).map((d) => [d[1], d[3]])).toEqual([
      [2, expect.stringMatching(/^An unnamed cell &\( … \) expands to 16,000,000 notes/)],
    ]);
    expect(said(piece(`&tune step=${'9'.repeat(400)} 0 1`)).map((d) => d[3])).toEqual([expect.stringMatching(/^&tune would start unboundedly many notes a second/)]);
  });

  it("a cell whose line failed isn't reported again where it is used", () => {
    expect(said(piece('&a 0 1 (\n&tune step=120bpm &a &a\n&c over=&a 0'))).toEqual([
      ['error', 1, 8, "Unexpected '(' — expected a number, a note name (C, F#), ~, [chord], &cell or key=value"],
    ]);
    expect(said('&a 0 1 (\n&m [&a]')).toEqual([['error', 1, 8, "Unexpected '(' — expected a number, a note name (C, F#), ~, [chord], &cell or key=value"]]);
    // a cell that is simply missing still is
    expect(said(piece('&tune step=120bpm &a')).map((d) => d[3])).toContain('Unknown cell &a');
  });

  it('anchor= on a law says it belongs on the clock the law reads', () => {
    const law = (cycle: string) => `&day scan(1!24) loop=1d anchor=11.55\n${cycle}\n&bell s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&cycle * &bell]`;
    expect(compileSource(law('&cycle law=fiveto12 over=&day step=84bpm')).diagnostics).toEqual([]);
    expect(said(law('&cycle law=fiveto12 over=&day step=84bpm anchor=13.00'))).toEqual([
      ['warning', 2, 49, "anchor= sets the clock a law reads, not the law: write it on &day — the law on &cycle doesn't read it"],
    ]);
  });

  it('the law keeps its own start: 11:55', () => {
    expect(LAW_START).toBe(11 * 3600 + 55 * 60);
  });

  it('an unknown field in a label is a warning that lists the fields ({lap} is not built yet, #29)', () => {
    const fields = LABEL_FIELDS.map((f) => `{${f}}`).join(' ');
    expect(said('&a step=2 0 1 label="lap {lap}, {tempi}"')).toEqual([
      ['warning', 1, 26, `{lap} isn't a label field: it shows as written (the fields: ${fields})`],
      ['warning', 1, 33, `{tempi} isn't a label field: it shows as written (the fields: ${fields})`],
    ]);
    expect(said('&k shift=2\n&a step=2 0 1 label="{tempo} {&k:tonic} {&k:lap}"').map((d) => d[3])).toEqual([
      `{lap} isn't a label field: it shows as written (the fields: ${fields})`,
    ]);
    for (const f of LABEL_FIELDS) expect(said(`&a step=2 0 1 label="{${f}}"`)).toEqual([]);
  });

  it('scale(…): a phase beyond the seven modes is an error, a tonic beyond the octave a warning', () => {
    expect(said('&a over=scale(0,99) 0 1 2')[0]).toEqual([
      'error',
      1,
      17,
      'scale(tonic, phase): the phase is a mode, 0 (the darkest, Locrian) to 6 (the brightest, Lydian) — not 99',
    ]);
    expect(said('&a over=scale(0,7) 0')[0][0]).toBe('error');
    expect(said('&a over=scale(minor, 99) 0 1 2')).toEqual([['warning', 1, 22, 'scale(…, 99): the tonic is a pitch class, 0 (C) to 11 (B)']]);
    for (const s of ['scale(major)', 'scale(lydian, B)', 'scale(minor, -11)']) expect(said(`&a over=${s} 0 1 2`)).toEqual([]);
  });
});
