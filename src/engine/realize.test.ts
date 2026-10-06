import { describe, expect, it } from 'vitest';
import { waveform } from './wave';
import { setFree } from './edit';
import { meterLevels } from './parser';
import { parse } from './parser';
import bwv847Reference from '../../tools/bwv847.reference.json';
import { codeShifts, compileSource } from './compile';
import { shiftsAt, timeMap } from './clocking';
import { flatten } from './flatten';
import { eventsBetween, plan } from './realize';
import { liveAt } from './live';
import { routing } from './routing';
import { buildGraph, structureKey } from './graph';
import { PRESETS } from './presets';

type R = ReturnType<typeof compileSource>;
const midi = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const events = (r: R, from: number, to: number, muted: string[] = []) => eventsBetween(plan(r, codeShifts(r), new Set(muted)), from, to);
const VOICE = '&v s=saw loop=261.63\n';

describe('time', () => {
  const r = compileSource('&meter scan(27 23 26 24) step=60bpm\n&w scan(28 37 35) step=60bpm');
  it('scan(27 23 26 24) bends the bar to 0 27 50 76 %, keeping its length', () => {
    const tm = timeMap(r, r.clocks.get('meter')!, codeShifts(r));
    expect([0, 1, 2, 3, 4, 5].map((s) => +tm.q(s).toFixed(2))).toEqual([0, 1.08, 2, 3.04, 4, 5.08]);
  });
  it('scan(28 37 35): an early second beat', () => {
    const tm = timeMap(r, r.clocks.get('w')!, codeShifts(r));
    expect(tm.q(1)).toBeLessThan(1);
    expect(tm.q(3)).toBeCloseTo(3);
  });
  it('stepAt inverts q across bars; a shifted meter moves the downbeat', () => {
    const tm = timeMap(r, r.clocks.get('meter')!, codeShifts(r));
    for (const s of [0, 0.5, 1, 2.25, 3.9, 7, 13.5]) expect(tm.stepAt(tm.q(s))).toBeCloseTo(s);
    expect(+timeMap(r, r.clocks.get('meter')!, () => 1).q(1).toFixed(2)).toBe(0.92);
  });
  it('a clock without positions steps evenly at its rate', () => {
    const r2 = compileSource('&c step=4 5 3\n&x step=&c 0 1 2 3\n' + VOICE + '&mix_ [&x * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r2, 0, 1).map((e) => e.at)).toEqual([0, 0.25, 0.5, 0.75]);
  });
});

describe('sound', () => {
  it('flattens &refs with !, * and @', () => {
    const r = compileSource('&b 1 2\n&a &b 0*2 5@2 &b!2');
    expect(flatten(r, 'a', codeShifts(r)).map((e) => [e.step, e.duration, e.value])).toEqual([
      [0, 1, 1], [1, 1, 2], [2, 0.5, 0], [2.5, 0.5, 0], [3, 2, 5], [5, 1, 1], [6, 1, 2], [7, 1, 1], [8, 1, 2],
    ]);
  });

  it('a pitch sets the voice’s rate: freq = loop × 2^(semitones/12)', () => {
    const r = compileSource('&m step=1\n&x step=&m 0 7 12 -12\n' + VOICE + '&mix_ [&x * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r, 0, 4).map((e) => +e.freq.toFixed(2))).toEqual([261.63, 392, 523.26, 130.81]);
  });

  it('kits take the number as an index into their voices', () => {
    const r = compileSource('&m step=1\n&d over=&kit step=&m 0 1 2 3\n&bd s=sine loop=55\n&sd s=white\n&kit &bd &sd\n&mix loop=SAMPLE_RATE map=sample [&d]');
    expect(events(r, 0, 4).map((e) => [e.voice, e.freq])).toEqual([['bd', 55], ['sd', 261.63], ['bd', 55], ['sd', 261.63]]);
  });

  it("a kit's members bring their own env= (a member without one plays with the voice's default)", () => {
    const r = compileSource(
      '&m step=1\n&d over=&kit step=&m 0 1 2\n&bd s=sine loop=55 env=&(map=adsr 0 .28 0 .05)\n&sd s=white\n&hh s=white env=&(map=adsr 0 .04 0 .02)\n&kit &bd &sd &hh\n&mix loop=SAMPLE_RATE map=sample [&d]',
    );
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ev = events(r, 0, 3);
    expect(ev.map((e) => [e.voice, e.env])).toEqual([
      ['bd', { attack: 0, decay: 0.28, sustain: 0, release: 0.05 }],
      ['sd', undefined],
      ['hh', { attack: 0, decay: 0.04, sustain: 0, release: 0.02 }],
    ]);
  });

  it("an envelope in the product wins over a kit member's own", () => {
    const r = compileSource(
      '&m step=1\n&d over=&kit step=&m 0 1\n&bd s=sine loop=55 env=&(map=adsr 0 .28 0 .05)\n&sd s=white\n&kit &bd &sd\n&e map=adsr .01 .5 .5 .2\n&mix loop=SAMPLE_RATE map=sample [&e * &d]',
    );
    expect(events(r, 0, 2).map((e) => e.env)).toEqual([{ attack: 0.01, decay: 0.5, sustain: 0.5, release: 0.2 }, { attack: 0.01, decay: 0.5, sustain: 0.5, release: 0.2 }]);
  });

  it('ratios: ÷2 plays twice per beat, ×2 once per two beats', () => {
    const r = compileSource(`&m scan(27 23 26 24) step=60bpm\n&f step=&m/2 0 1 2 3\n&s step=&m*2 0 1\n${VOICE}&u s=tri\n&mix_ [&f * &v, &s * &u]\n&out_ loop=44k map=sample &mix_`);
    const ev = events(r, 0, 3.9);
    expect(ev.filter((e) => e.voice === 'v').map((e) => +e.at.toFixed(2))).toEqual([0, 0.54, 1.08, 1.54, 2, 2.52, 3.04, 3.52]);
    expect(ev.filter((e) => e.voice === 'u').map((e) => +e.at.toFixed(2))).toEqual([0, 2]);
  });

  it('&mix_ [&x[>>] * &voice plays the cell shifted (wrapped entries climb)]\n&out_ loop=44k map=sample &mix_', () => {
    const r = compileSource('&m step=1\n&x step=&m 0 1 2\n' + VOICE + '&mix_ [&x[>>] * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r, 0, 2.9).map((e) => midi(e.freq) - 60)).toEqual([1, 2, 12]);
  });

  it('&mix_ [&x[1:] * &voice plays just that part of the braid, looping]\n&out_ loop=44k map=sample &mix_', () => {
    const r = compileSource('&m step=1\n&x step=&m 0 1 2\n' + VOICE + '&mix_ [&x[1:] * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r, 0, 3.9).map((e) => midi(e.freq) - 60)).toEqual([1, 2, 1, 2]);
    const r2 = compileSource('&m step=1\n&x step=&m 0 1 2\n' + VOICE + '&mix_ [&x[-1] * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r2, 0, 2.9).map((e) => midi(e.freq) - 60)).toEqual([2, 2, 2]);
  });

  it('switching off a table, a voice or the clock silences what depends on it', () => {
    const r = compileSource(PRESETS.royal.source);
    const voices = (m: string[]) => [...new Set(events(r, 0, 10, m).map((e) => e.voice))].sort();
    expect(voices([])).toEqual(['bass', 'lead']);
    expect(voices(['cell:scale'])).toEqual([]);
    expect(voices(['cell:theme'])).toEqual(['bass']);
    expect(voices(['cell:bass'])).toEqual(['lead']);
    expect(voices(['cell:bar'])).toEqual([]);
  });

  it('windows tile: no event lost or doubled across window edges', () => {
    const r = compileSource(PRESETS.sailor.source);
    const p = plan(r, codeShifts(r));
    const whole = eventsBetween(p, 0, 8).length;
    let tiled = 0;
    for (let t = 0; t < 8; t += 0.25) tiled += eventsBetween(p, t, t + 0.25).length;
    expect(tiled).toBe(whole);
  });

  it('every preset sounds every out()', () => {
    for (const [key, pr] of Object.entries(PRESETS)) {
      const r = compileSource(pr.source);
      expect(r.diagnostics, key).toEqual([]);
      // within 12 s — or longer, for a piece that unfolds (BWV 847's fugue waits out the prelude; the Ricercar adds a voice a pass;
      // the arranged songs bring their parts in section by section)
      const ev = events(r, 0, ({ bwv847: 200, ricercar: 120, pop: 100, zell: 140, korobeiniki: 60, cellscape: 330, baustelle: 110, hypercell: 75, onemore: 80, brothers: 120, ghosts: 60 } as Record<string, number>)[key] ?? 12);
      for (const o of r.outputs) expect(ev.some((e) => e.voice === o.voice || r.cells.get(o.voice)!.kit), `${key}/${o.voice}`).toBe(true);
    }
  });
});

describe('royal: every key in fifths, then every mode', () => {
  const r = compileSource(PRESETS.royal.source);
  const pass = (20 * 60) / 84;
  const theme = (n: number) => events(r, n * pass, (n + 1) * pass).filter((e) => e.voice === 'lead').map((e) => NAMES[midi(e.freq) % 12]);

  it('pass 1 is C minor, then up the circle of fifths: G, D, A …', () => {
    expect(theme(0).join(' ')).toBe('C Eb G Ab B C B Bb A Ab G');
    expect(theme(1)[0]).toBe('G');
    expect(theme(2)[0]).toBe('D');
    expect(theme(3)[0]).toBe('A');
    expect(theme(1).join(' ')).toBe('G Bb D Eb F# G F# F E Eb D');
    expect([...Array(12).keys()].map((n) => theme(n)[0]).join(' ')).toBe('C G D A E B F# C# Ab Eb Bb F');
  });

  it('after the full circle &key is home and &scale has turned one degree', () => {
    const s = shiftsAt(r, codeShifts(r), 12 * pass + 0.01);
    expect([s('key'), s('scale')]).toEqual([0, 1]);
    expect(theme(12)[0]).toBe('D');
    const late = shiftsAt(r, codeShifts(r), 84 * pass + 0.01);
    expect([late('key'), late('scale')]).toEqual([0, 0]);
  });
});

describe('live view', () => {
  const r = compileSource(PRESETS.royal.source);
  const spb = 60 / 84;
  it('turns the key a fifth after one pass', () => {
    expect(liveAt(r, codeShifts(r), new Set(), 21 * spb).shifts('key')).toBe(7);
  });
  it('lights the cell under the playhead, every table its note passes through, and the voice', () => {
    const at = liveAt(r, codeShifts(r), new Set(), 8.2 * spb);
    expect(at.cells.get('theme')!.local).toBeCloseTo(8.2, 0);
    expect([...at.cells.get('scale')!.entries]).toContain(6);
    expect([...at.cells.get('key')!.entries]).toContain(11);
    expect(at.cells.has('lead')).toBe(true);
    expect(at.edges.has('cell:theme->cell:scale')).toBe(true);
    expect(at.edges.has('cell:theme~>cell:bar')).toBe(true);
    expect(at.edges.has('cell:theme->cell:lead')).toBe(true);
    expect(at.bars.get('bar')).toBe(2);
  });
  it('routing follows sounding outputs only', () => {
    const on = routing(r, new Set(['cell:lead']));
    expect(['pedal', 'scale', 'bar', 'bass'].every((c) => on.nodes.has(`cell:${c}`))).toBe(true);
    // the theme is silent, but still turns the key the pedal is read through (step=cycle(&theme))
    expect(on.edges.has('cell:theme->cell:lead')).toBe(false);
    expect(on.edges.has('cell:theme->cell:scale')).toBe(false);
    expect(on.edges.has('cell:key~>cell:theme')).toBe(true);
    expect(on.nodes.has('cell:theme')).toBe(true);
  });
});

describe('graph', () => {
  it('shows exactly the code: no implicit grid, voices as voices, written links only', () => {
    const g = buildGraph(compileSource(PRESETS.royal.source));
    // the vibrato is an unnamed cell, written inside the mix: drawn, under a name of its own
    const vibrato = g.nodes.find((n) => n.cell.lambda?.startsWith('map=lin'))!;
    expect(vibrato.cell.lambda).toBe('map=lin loop=5 0 .15 0 -.15 0');
    // named cells (the vibrato and the envelopes are unnamed: petals of the mix)
    expect(g.nodes.filter((n) => !n.petalOf && !n.cell.note).map((n) => `${n.kind}:${n.id}`).sort()).toEqual(
      ['cell:cell:bar', 'cell:cell:key', 'cell:cell:mix', 'cell:cell:pedal', 'cell:cell:scale', 'cell:cell:theme', 'voice:cell:bass', 'voice:cell:lead'].sort(),
    );
    // … the lead's own (pitch=): drawn as a petal of the lead, without edges of its own
    expect(vibrato.petalOf).toBe('cell:lead');
    expect(g.edges.some((e) => e.source === vibrato.id || e.target === vibrato.id)).toBe(false);
    const ids = g.edges.map((e) => e.id);
    expect(ids).toContain('cell:theme->cell:scale');
    expect(ids).toContain('cell:theme->cell:lead');
    expect(ids).toContain('cell:theme~>cell:bar');
    expect(ids).toContain('cell:scale->cell:key');
    expect(ids).toContain('cell:scale~>cell:key');
    expect(g.edges.find((e) => e.id === 'cell:key~>cell:theme')!.label).toBe('⟳');
    expect(ids.some((i) => i.includes('fifths12TET'))).toBe(false);
  });

  it('labels shifted references; containers sit outside their parts; voices outermost', () => {
    const g = buildGraph(compileSource(PRESETS.sailor.source));
    expect(g.edges.find((e) => e.id === 'cell:B->cell:lead')!.pick).toBe('[<<]');
    const g2 = buildGraph(compileSource('&m step=1\n&x step=&m 0 1 2\n&v loop=440\n&mix_ [&x[1:] * &v]\n&out_ loop=44k map=sample &mix_'));
    expect(g2.edges.find((e) => e.id === 'cell:x->cell:v')!.pick).toBe('[1:]');
    const d = Object.fromEntries(g.nodes.map((n) => [n.id, n.depth]));
    expect(d['cell:tune']).toBeGreaterThan(d['cell:A']);
    expect(d['cell:A']).toBeGreaterThan(d['cell:m1']);
    expect(d['cell:fiddle']).toBeGreaterThan(d['cell:tune']);
  });

  it('structureKey ignores content edits', () => {
    const k = (s: string) => structureKey(buildGraph(compileSource(s)));
    expect(k('&a 0 &b\n&b 1')).toBe(k('&a 5 5 &b\n&b 9 9'));
    expect(k('&a 0 &b\n&b 1')).not.toBe(k('&a 0\n&b 1'));
  });
});

describe('modulation: &mix_ [(&theme + &vibrato) * &voice]\n&out_ loop=44k map=sample &mix_', () => {
  const src = '&m step=1\n&t step=&m 0 7\n&vib loop=4 0 .5 0 -.5\n&v loop=440\n&mix_ [(&t + &vib) * &v]\n&out_ loop=44k map=sample &mix_';
  const r = compileSource(src);
  it('adds the modulator’s pitch at the start and bends while the note sounds', () => {
    const ev = events(r, 0, 2);
    expect(ev.map((e) => +e.freq.toFixed(2))).toEqual([440, 659.26]);
    // four values per quarter second: +50, 0, −50 cents relative to the start, then the next lap
    expect(ev[0].bends.slice(0, 3).map((b) => [b.at, Math.round(b.cents)])).toEqual([[0.0625, 50], [0.125, 0], [0.1875, -50]]);
  });
  it('a static term transposes', () => {
    const r2 = compileSource('&m step=1\n&t step=&m 0\n&up 12\n&v loop=100\n&mix_ [(&t + &up) * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r2, 0, 1)[0].freq).toBeCloseTo(200);
    const r3 = compileSource('&m step=1\n&t step=&m 0\n&up 12\n&v loop=100\n&mix_ [(&t - &up) * &v]\n&out_ loop=44k map=sample &mix_');
    expect(events(r3, 0, 1)[0].freq).toBeCloseTo(50);
  });
  it('switching the modulator off removes the bends', () => {
    expect(events(r, 0, 1, ['cell:vib'])[0].bends).toEqual([]);
  });
  it('draws the modulator into the voice', () => {
    const g = buildGraph(r);
    expect(g.edges.find((e) => e.id === 'cell:vib->cell:v')).toMatchObject({ kind: 'out', label: '+' });
  });
});

describe('canon: Brother John', () => {
  const r = compileSource(PRESETS.canon.source);
  const bar = 2; // 4 beats at 120bpm
  const BASE: Record<string, number> = Object.fromEntries(['v1', 'v2', 'v3', 'v4'].map((v) => [v, r.cells.get(v)!.freq]));
  // each voice as semitones above its own pitch 0, so octaves don't matter
  const line = (voice: string, from: number, to: number) =>
    events(r, from, to)
      .filter((e) => (e.instrument ?? e.voice) === voice)
      .map((e) => [+(e.at - from).toFixed(3), Math.round(12 * Math.log2(e.freq / BASE[voice]))]);

  it('one theme, four motifs: C D E C · E F G · G A G F E C · C G C', () => {
    const tune = line('v1', 0, 8 * bar).map(([, s]) => NAMES[((s % 12) + 12) % 12]);
    expect(tune.join(' ')).toBe(
      'C D E C C D E C E F G E F G G A G F E C G A G F E C C G C C G C',
    );
  });

  it('each voice is the one before, two bars later', () => {
    for (const [a, b] of [['v1', 'v2'], ['v2', 'v3'], ['v3', 'v4']]) expect(line(b, 2 * bar, 10 * bar)).toEqual(line(a, 0, 8 * bar));
  });

  it('all four sound together from the first bar', () => {
    expect(new Set(events(r, 0, bar).map((e) => e.instrument ?? e.voice))).toEqual(new Set(['v1', 'v2', 'v3', 'v4']));
  });
});

describe('canon per tonos', () => {
  const r = compileSource(PRESETS.pertonos.source);
  const beat = 60 / 72;
  const pass = 20 * beat;
  const pcs = (from: number, to: number, voice: string) =>
    events(r, from, to)
      .filter((e) => (e.instrument ?? e.voice) === voice)
      .map((e) => [Math.round((e.at - from) / beat), NAMES[((midi(e.freq) % 12) + 12) % 12]] as const);

  it('compiles clean, three voices', () => {
    expect(r.diagnostics).toEqual([]);
    expect(r.outputs.map((o) => o.through[0] ?? o.voice)).toEqual(['reed', 'viola', 'cello']);
  });

  it('the lower voice is the alto a bar later and a fifth below', () => {
    const alto = pcs(0, 4 * 4 * beat, 'viola');
    const bass = pcs(4 * beat, 5 * 4 * beat, 'cello');
    expect(bass.map(([t, n]) => [t, NAMES[(NAMES.indexOf(n) + 7) % 12]])).toEqual(alto);
  });

  it('no two voices ever clash at a minor second (or major seventh)', () => {
    const sounding = (t: number) =>
      events(r, 0, pass)
        .filter((e) => e.at <= t + 1e-6 && t < e.at + e.dur - 1e-6)
        .map((e) => ((midi(e.freq) % 12) + 12) % 12);
    for (let b = 0; b < 20; b++) {
      const v = sounding(b * beat + 0.01);
      for (let i = 0; i < v.length; i++)
        for (let j = i + 1; j < v.length; j++) expect([1, 11], `beat ${b + 1}`).not.toContain((v[i] - v[j] + 12) % 12);
    }
  });

  it('rises a whole tone every pass: C D E F# G# A#', () => {
    const first = (n: number) => pcs(n * pass, (n + 1) * pass, 'reed')[0][1];
    expect([0, 1, 2, 3, 4, 5].map(first)).toEqual(['C', 'D', 'E', 'F#', 'Ab', 'Bb']);
    expect(pcs(pass, 2 * pass, 'reed').map(([, n]) => n).join(' ')).toBe('D F A Bb C# D C# C B Bb A');
  });
});

describe('stereo from two mixes', () => {
  it('per tonos: the reed leans left, the cello right', () => {
    const r = compileSource(PRESETS.pertonos.source);
    const g = Object.fromEntries(r.outputs.map((o) => [o.through[0] ?? o.voice, o.gains]));
    expect(g.reed[0]).toBeGreaterThan(g.reed[1]);
    expect(g.cello[1]).toBeGreaterThan(g.cello[0]);
    expect(events(r, 0, 4).find((e) => (e.instrument ?? e.voice) === 'cello')!.gains).toEqual(g.cello);
  });
  it('draws voices into their mix, and the mix into the sound card', () => {
    const ids = buildGraph(compileSource(PRESETS.pertonos.source)).edges.map((e) => e.id);
    expect(ids).toContain('cell:reed->cell:left');
    expect(ids).toContain('cell:cello->cell:right');
    expect(ids).toContain('cell:out->cell:left');
  });
});

describe('pulses', () => {
  it('phases: how far each clocked cell is through its step', () => {
    const r = compileSource('&m step=2\n&a step=&m 0 1\n&b step=&m/2 0\n&c step=&m*2 0\n&v loop=440\n&mix [&a * &v]\n&out loop=SAMPLE_RATE map=sample &mix');
    const at = liveAt(r, codeShifts(r), new Set(), 0.125); // a quarter of a step of &m
    expect(at.phases.get('m')).toBeCloseTo(0.25);
    expect(at.phases.get('a')).toBeCloseTo(0.25);
    expect(at.phases.get('b')).toBeCloseTo(0.5); // two steps per step of &m
    expect(at.phases.get('c')).toBeCloseTo(0.125); // one step per two
    expect(at.phases.has('v')).toBe(false); // voices move at audio rate: no pulse
  });
});

describe('twinkle: motifs and reuse', () => {
  it('three motifs, the middle line a shifted reading of the second — the whole tune', () => {
    const r = compileSource(PRESETS.twinkle.source);
    const bar = 60 / 96;
    const notes = events(r, 0, 48 * bar - 0.01)
      .filter((e) => e.voice === 'lead')
      .map((e) => NAMES[((midi(e.freq) % 12) + 12) % 12]);
    expect(notes.join(' ')).toBe(
      'C C G G A A G F F E E D D C G G F F E E D G G F F E E D C C G G A A G F F E E D D C',
    );
  });
});

describe('lullaby', () => {
  const r = compileSource(PRESETS.lullaby.source);
  it('compiles clean', () => expect(r.diagnostics).toEqual([]));
  it('the second phrase is the first, a step lower — Brahms’ sequence', () => {
    const eighth = 60 / 56 / 2;
    const notes = (from: number, n: number) =>
      events(r, from * eighth, (from + n) * eighth - 1e-6)
        .filter((e) => e.voice === 'box')
        .map((e) => NAMES[((midi(e.freq) % 12) + 12) % 12]);
    // bars 1–2, then bars 5–6 (24 eighths later)
    expect(notes(0, 12).join(' ')).toBe('G E E G E G');
    expect(notes(24, 12).join(' ')).toBe('F D D F D F');
  });
  it('loops in whole bars: 16 bars of 3/4 — the bass a bar a step, the tune with it', () => {
    expect(r.cells.get('song')!.steps).toBe(16 * 6);
    expect(r.cells.get('roots')!.steps).toBe(16); // (the shortener divided out its ×3: a bar a step)
    const lap = (n: string) => r.cells.get(n)!.steps / r.cells.get(n)!.rate;
    expect(lap('roots')).toBeCloseTo(lap('song'), 9);
  });
});

describe('volume streams (map=amp)', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&v s=tri loop=C4\n';
  const out = (mix: string) => `${mix}\n&out loop=SAMPLE_RATE map=sample &mix`;
  it('multiply the level while a note sounds; a rest is silence', () => {
    const r = compileSource(base + '&vol map=amp step=&m/4 1 .5 ~ .25\n' + out('&mix [&t * &vol * &v]'));
    expect(r.diagnostics).toEqual([]);
    const e = events(r, 0, 1.9);
    expect(e.map((x) => x.levels.map((l) => [+l.at.toFixed(2), l.level]))).toEqual([
      [[0, 1], [0.25, 0.5], [0.5, 0], [0.75, 0.25]],
      [[1, 1], [1.25, 0.5], [1.5, 0], [1.75, 0.25]],
    ]);
  });
  it('an envelope is a volume looped once per note: loop=&theme', () => {
    const r = compileSource(base + '&env map=amp loop=&t 1 .5\n' + out('&mix [&t * &env * &v]'));
    // two values per step of &t: full, then half
    expect(events(r, 0, 1.9).map((x) => x.levels.map((l) => [+l.at.toFixed(2), l.level]))).toEqual([
      [[0, 1], [0.5, 0.5]],
      [[1, 1], [1.5, 0.5]],
    ]);
  });
  it('a gate: with no pitch moving, the volume starts the notes, at its own level', () => {
    const r = compileSource('&m step=2\n&hits map=amp step=&m 1 .3 ~ .6\n&hh s=white hpf=7000\n' + out('&mix [&hits * &hh]'));
    expect(r.outputs[0]).toMatchObject({ gate: true, cell: 'hits' });
    expect(events(r, 0, 1.9).map((x) => [x.at, x.levels[0].level])).toEqual([
      [0, 1],
      [0.5, 0.3],
      [1.5, 0.6],
    ]); // the rest is silent
  });
  it('several streams multiply; a volume can’t be subtracted', () => {
    const r = compileSource(base + '&a map=amp .5\n&b map=amp .5\n' + out('&mix [&t * &a * &b * &v]'));
    expect(events(r, 0, 0.9)[0].levels).toEqual([{ at: 0, level: 0.25 }]);
    const bad = compileSource(base + '&a map=amp .5\n' + out('&mix [(&t - &a) * &v]'));
    expect(bad.diagnostics.map((d) => d.message).join()).toMatch(/can't be subtracted/);
  });
  it('draws the volume into the voice with ×', () => {
    const g = buildGraph(compileSource(base + '&vol map=amp step=&m 1\n' + out('&mix [&t * &vol * &v]')));
    expect(g.edges.find((e) => e.id === 'cell:vol->cell:v')).toMatchObject({ label: '×' });
  });
});

describe('turning climbs; cycle= wraps', () => {
  const src = (cycle: string) => `&m step=1\n&t step=&m 0\n&k step=cycle(&t) stride=7 ${cycle}\n&u over=&k step=&m 0\n&v s=tri loop=C4\n&mix [&u * &v]\n&out loop=SAMPLE_RATE map=sample &mix`;
  const pitches = (r: R) => events(r, 0, 3.9).map((e) => midi(e.freq) - 60);
  it('without cycle= a stepped table keeps climbing: 0, 7, 14, 21', () => {
    expect(pitches(compileSource(src('')))).toEqual([0, 7, 14, 21]);
  });
  it('with cycle=12 it wraps round: 0, 7, 2, 9', () => {
    expect(pitches(compileSource(src('cycle=12')))).toEqual([0, 7, 2, 9]);
  });
  it('per tonos rises a whole tone a pass — and an octave after six', () => {
    const r = compileSource(PRESETS.pertonos.source);
    const pass = 20 * (60 / 72);
    const first = (n: number) => midi(events(r, n * pass, (n + 1) * pass).find((e) => (e.instrument ?? e.voice) === 'reed')!.freq);
    expect(first(6) - first(0)).toBe(12);
    expect(first(7) - first(0)).toBe(14);
  });
});

describe('unnamed cells &( … )', () => {
  it('stand wherever a reference goes: over=, step=, in a braid, in a mix', () => {
    const r = compileSource(`&m step=1
&t over=&(scan(2 2 1 2 2 2 1) over=&(shift=7)) step=&(step=2) 0 1 2 &(4 5)[<<]
&v s=tri loop=C4
&mix [(&t + &(loop=5 0 .1)) * &v]
&out loop=SAMPLE_RATE map=sample &mix`);
    expect(r.diagnostics).toEqual([]);
    expect([...r.cells.values()].filter((c) => c.lambda).map((c) => c.lambda).sort()).toEqual(['4 5', 'loop=5 0 .1', 'scan(2 2 1 2 2 2 1) over=&(shift=7)', 'shift=7', 'step=2']);
    // G major (the inner unnamed key), two steps a second, and the last part shifted back: 5 4
    const notes = events(r, 0, 2.4).map((e) => NAMES[midi(e.freq) % 12]);
    expect(notes).toEqual(['G', 'A', 'B', 'E', 'D']);
  });
  it('report errors inside them at the right column', () => {
    const d = compileSource('&t over=&(scan(2 2 1 2 2 2 1) bogus=1) 0').diagnostics[0];
    expect(d.message).toMatch(/Unknown attribute bogus=/);
    expect(d.span.col).toBe('&t over=&(scan(2 2 1 2 2 2 1) '.length + 1);
  });
});

describe('fractional ratios', () => {
  it('step=&m*2/3: triplets, three steps per two', () => {
    const r = compileSource('&m step=1\n&tri map=amp step=&m*2/3 1\n&hh s=white\n&mix [&tri * &hh]\n&out loop=SAMPLE_RATE map=sample &mix');
    expect(events(r, 0, 1.99).map((e) => +e.at.toFixed(3))).toEqual([0, 0.667, 1.333]);
  });
});

describe('easy retirements', () => {
  it('a voice’s pitch is loop= (step= is gone for voices)', () => {
    const msgs = compileSource('&m step=1\n&t step=&m 0\n&v s=tri step=440\n&mix [&t * &v]\n&out loop=SAMPLE_RATE map=sample &mix').diagnostics.map((d) => d.message);
    expect(msgs.join()).toMatch(/A voice's pitch is loop=/);
  });
});

describe('switching off', () => {
  it('anything switched off cuts its edges: nothing below it stays lit through it (every example, every cell)', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      const g = buildGraph(r);
      for (const n of g.nodes) {
        const routed = routing(r, new Set([n.id])).nodes;
        expect(routed.has(n.id), `${key}: ${n.id} switched off but routed`).toBe(false);
      }
    }
  });
  it('switching off one channel’s mix silences only that channel', () => {
    const r = compileSource(PRESETS.stereo.source);
    const p = plan(r, codeShifts(r), new Set(['cell:left']));
    const e = eventsBetween(p, 0, 2).find((x) => (x.instrument ?? x.voice) === 'bell')!;
    expect(e.gains[0]).toBe(0);
    expect(e.gains[1]).toBeGreaterThan(0);
    // and the sound card off silences everything
    expect(eventsBetween(plan(r, codeShifts(r), new Set(['cell:out'])), 0, 2)).toEqual([]);
  });
});

describe('map=lin: values ramp', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&v s=tri loop=C4\n';
  const out = (mix: string) => `${mix}\n&out loop=SAMPLE_RATE map=sample &mix`;
  it('a ramped volume fades from step to step: 1 → 0 over a note, ramping', () => {
    const r = compileSource(base + '&fade map=lin loop=&t 1 0\n' + out('&mix [&t * &fade * &v]'));
    const e = events(r, 0, 0.9)[0];
    expect(e.levels[0]).toEqual({ at: 0, level: 1 });
    expect(e.levels.slice(1).every((l) => l.ramp)).toBe(true);
    // half way to the second step it's half way down
    expect(e.levels.find((l) => Math.abs(l.at - 0.5) < 1e-6)!.level).toBeCloseTo(0);
    expect(e.levels.find((l) => Math.abs(l.at - 0.5) < 1e-6)!.ramp).toBe(true);
  });
  it('inside a pitch sum, a map=lin cell is a smooth pitch: the vibrato glides', () => {
    const r = compileSource(base + '&vib map=lin loop=4 0 .5 0 -.5\n' + out('&mix [(&t + &vib) * &v]'));
    expect(r.outputs[0].mods.map((m) => m.cell)).toEqual(['vib']);
    expect(r.outputs[0].levels).toEqual([]);
    const e = events(r, 0, 0.9)[0];
    expect(e.bends.length).toBeGreaterThan(2);
    expect(e.bends.filter((b) => b.ramp).length).toBeGreaterThan(e.bends.length / 2); // glides (each restart is a step)
    expect(Math.max(...e.bends.map((b) => b.cents))).toBeCloseTo(50);
  });
  it('as a bare factor, the same cell is a volume', () => {
    const r = compileSource(base + '&vib map=lin loop=4 0 .5 0 -.5\n' + out('&mix [&t * &vib * &v]'));
    expect(r.outputs[0].levels.map((m) => m.cell)).toEqual(['vib']);
  });
});

describe('map=lin: the last value holds', () => {
  it('an envelope fades and stays down until the next note (no swell back up)', () => {
    const r = compileSource('&m step=1\n&t step=&m 0 7\n&v s=tri loop=C4\n&env map=lin loop=&t 1 .5 0\n&mix loop=SAMPLE_RATE map=sample [&t * &env * &v]');
    const e = events(r, 0, 0.99)[0];
    const at = (t: number) => {
      let i = 0;
      for (let k = 0; k < e.levels.length; k++) if (e.levels[k].at <= t + 1e-9) i = k;
      return e.levels[i].level;
    };
    expect(at(2 / 3)).toBe(0); // reached 0 at the third step
    expect(e.levels[e.levels.length - 1].level).toBe(0); // and held to the end of the note
  });
});

describe('map=adsr: an envelope per note', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&v s=tri loop=C4\n';
  it('shapes each note it multiplies, in seconds', () => {
    const r = compileSource(base + '&mix loop=SAMPLE_RATE map=sample [&t * &(map=adsr .01 .2 .5 .8) * &v]');
    expect(r.diagnostics).toEqual([]);
    expect(events(r, 0, 1.9).map((e) => e.env)).toEqual([
      { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 },
      { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 },
    ]);
    // written inside the mix: a petal of it
    const g = buildGraph(r);
    expect(g.nodes.find((n) => n.cell.lambda)!.petalOf).toBe('cell:mix');
  });
  it('takes four numbers; one per note; not a pitch', () => {
    const msgs = (s: string) => compileSource(base + s).diagnostics.map((d) => d.message).join('\n');
    expect(msgs('&e map=adsr .1 .2\n&mix loop=SAMPLE_RATE map=sample [&t * &e * &v]')).toMatch(/map=adsr takes four numbers/);
    expect(msgs('&e map=adsr .1 .2 1.5 .3')).toMatch(/sustain a level/);
    expect(msgs('&e map=adsr .1 .2 .5 .3\n&f map=adsr .1 .2 .5 .3\n&mix loop=SAMPLE_RATE map=sample [&t * &e * &f * &v]')).toMatch(/One envelope per note/);
    expect(msgs('&e map=adsr .1 .2 .5 .3\n&mix loop=SAMPLE_RATE map=sample [(&t + &e) * &v]')).toMatch(/keep it out of pitch sums/);
  });
});

describe('mixes used like voices: instruments', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&b step=&m 0\n&saw s=saw loop=C4\n&sub s=sine loop=C3\n';
  it('a pitch acting on a mix acts on each of its voices, gains multiplying', () => {
    const r = compileSource(base + '&pad [&saw * 0.5, &sub * 0.8]\n&mix loop=SAMPLE_RATE map=sample [&t * &pad, (&b + 12) * &pad * 0.5]');
    expect(r.diagnostics).toEqual([]);
    expect(r.outputs.map((o) => [o.voice, o.cell, o.offset, o.gains[0], o.through])).toEqual([
      ['saw', 't', 0, 0.5, ['pad']],
      ['sub', 't', 0, 0.8, ['pad']],
      ['saw', 'b', 12, 0.25, ['pad']],
      ['sub', 'b', 12, 0.4, ['pad']],
    ]);
  });
  it('an instrument carries its envelope to every melody that plays it', () => {
    const r = compileSource(base + '&pluck [&(map=adsr .005 .2 0 .3) * &saw]\n&mix loop=SAMPLE_RATE map=sample [&t * &pluck, &b * &pluck]');
    expect(r.outputs.map((o) => o.envelope?.decay)).toEqual([0.2, 0.2]);
  });
  it('switching the instrument off silences what plays through it', () => {
    const r = compileSource(base + '&pad [&saw]\n&mix loop=SAMPLE_RATE map=sample [&t * &pad, &b * &sub]');
    const voices = (off: string[]) => [...new Set(eventsBetween(plan(r, codeShifts(r), new Set(off)), 0, 2).map((e) => e.voice))];
    expect(voices([])).toEqual(['saw', 'sub']);
    expect(voices(['cell:pad'])).toEqual(['sub']);
  });
  it('a mix can’t play itself', () => {
    const r = compileSource(base + '&a [&t * &bb]\n&bb [&t * &a]\n&mix loop=SAMPLE_RATE map=sample [&a]');
    expect(r.diagnostics.map((d) => d.message).join()).toMatch(/plays itself/);
  });
});

describe('Ricercar: a study in counterpoint, from strict to free', () => {
  // the pitches sounding at a time, per voice (the theme on the organ; above, the flute; below, the bourdon)
  const passOf = (r: R, n: number) => {
    const bar = (4 * 60) / 66;
    return events(r, n * 5 * bar, (n + 1) * 5 * bar - 1e-3);
  };
  const midiOf = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
  const CONS = new Set([0, 3, 4, 7, 8, 9]);
  /** The rules, on what sounds: on the theme's notes every pair consonant (a fourth only between upper voices); between, a dissonance passes by step; no parallel fifths or octaves. */
  function problems(ev: ReturnType<typeof events>) {
    const voices = ['organ', 'flute', 'bourdon'];
    const lines = Object.fromEntries(voices.map((v) => [v, ev.filter((e) => e.voice === v).sort((a, b) => a.at - b.at)]));
    const at = (v: string, t: number) => lines[v].find((e) => e.at <= t + 1e-6 && t < e.at + e.dur - 1e-6);
    const out: string[] = [];
    const strong = new Set(lines.organ.map((e) => e.at.toFixed(4)));
    for (const v of ['flute', 'bourdon']) {
      const l = lines[v];
      l.forEach((e, i) => {
        for (const o of voices.filter((x) => x !== v)) {
          const other = at(o, e.at);
          if (!other) continue;
          const iv = Math.abs(midiOf(e.freq) - midiOf(other.freq)) % 12; // from the lower note up
          const fourthOk = o === 'organ' && v === 'flute' && !!at('bourdon', e.at); // between upper voices, over a bass
          if (CONS.has(iv) || (fourthOk && iv === 5)) continue;
          const onBeat = strong.has(e.at.toFixed(4));
          const prev = l[i - 1];
          const next = l[i + 1];
          const step = (a?: (typeof l)[number], b?: (typeof l)[number]) => !!a && !!b && Math.abs(midiOf(a.freq) - midiOf(b.freq)) <= 2 && midiOf(a.freq) !== midiOf(b.freq);
          if (onBeat || !step(prev, e) || !step(e, next)) out.push(`${v} ${midiOf(e.freq)} against ${o} ${midiOf(other.freq)} at ${e.at.toFixed(2)}`);
        }
      });
      // parallel perfect intervals between consecutive theme-note onsets, against the theme
      const beats = lines.organ.map((e) => e.at);
      for (let k = 1; k < beats.length; k++) {
        const [a0, b0, a1, b1] = [at(v, beats[k - 1]), at('organ', beats[k - 1]), at(v, beats[k]), at('organ', beats[k])];
        if (!a0 || !b0 || !a1 || !b1) continue;
        const i0 = Math.abs(midiOf(a0.freq) - midiOf(b0.freq)) % 12;
        const i1 = Math.abs(midiOf(a1.freq) - midiOf(b1.freq)) % 12;
        if ((i1 === 0 || i1 === 7) && i0 === i1 && midiOf(a0.freq) !== midiOf(a1.freq)) out.push(`parallel ${i1 === 0 ? 'octaves' : 'fifths'}: ${v} at ${beats[k].toFixed(2)}`);
      }
    }
    return out;
  }
  const r = compileSource(PRESETS.ricercar.source);
  it('compiles clean', () => expect(r.diagnostics).toEqual([]));
  it('a pass each: alone · above · below · two against one · four against one · three voices', () => {
    const who = (n: number) => [...new Set(passOf(r, n).map((e) => e.voice))].sort().join(' ');
    expect([0, 1, 2, 3, 4, 5].map(who)).toEqual(['organ', 'flute organ', 'bourdon organ', 'flute organ', 'flute organ', 'bourdon flute organ']);
    const perTheme = (n: number) => passOf(r, n).filter((e) => e.voice === 'flute').length;
    expect([perTheme(1), perTheme(3), perTheme(4)]).toEqual([11, 17, 34]); // 1:1, 2:1, 4:1 (the theme has 11 notes)
  });
  it('every pass obeys the rules of counterpoint', () => {
    for (let n = 0; n < 6; n++) expect(problems(passOf(r, n)), `pass ${n + 1}`).toEqual([]);
  });
  it('per tonos: raised, every voice climbs together — and still obeys', () => {
    const climbing = compileSource(setFree(PRESETS.ricercar.source, r.cells.get('key')!.frees[0], 5));
    for (let n = 0; n < 6; n++) expect(problems(passOf(climbing, n)), `pass ${n + 1}`).toEqual([]);
    const first = (rr: R, n: number) => midiOf(passOf(rr, n).find((e) => e.voice === 'organ')!.freq);
    expect(first(climbing, 1) - first(r, 1)).toBe(5);
  });
});

describe('petals', () => {
  it('an edge through a petal is drawn to its parent — unless it loops back or repeats', () => {
    // &organ holds an unnamed pipe: &theme plays it, so the graph draws &theme → &organ
    const g = buildGraph(compileSource(PRESETS.ricercar.source));
    const petals = g.nodes.filter((n) => n.petalOf);
    expect(petals.length).toBeGreaterThan(0);
    expect(g.edges.some((e) => petals.some((p) => p.id === e.source || p.id === e.target))).toBe(false);
    expect(g.edges.some((e) => e.source === 'cell:theme' && e.target === 'cell:organ')).toBe(true);
    expect(g.edges.some((e) => e.source === e.target)).toBe(false);
  });
});

describe('a voice’s own env= and pitch=', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&u step=&m 4\n';
  it('env= shapes every note the voice plays — the same as the envelope written in the mix', () => {
    const own = compileSource(base + '&v s=tri loop=C4 env=&(map=adsr .01 .2 .5 .3)\n&mix loop=SAMPLE_RATE map=sample [&t * &v]');
    const mixed = compileSource(base + '&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &(map=adsr .01 .2 .5 .3) * &v]');
    expect(own.diagnostics).toEqual([]);
    expect(events(own, 0, 1.9).map((e) => e.env)).toEqual(events(mixed, 0, 1.9).map((e) => e.env));
    // written in place, the envelope hangs as a petal of the voice
    expect(buildGraph(own).nodes.find((n) => n.cell.lambda)!.petalOf).toBe('cell:v');
  });
  it('one named envelope, shared by two voices', () => {
    const r = compileSource(base + '&pluck map=adsr .005 .3 0 .2\n&a s=tri loop=C4 env=&pluck\n&b s=saw loop=C3 env=&pluck\n&mix loop=SAMPLE_RATE map=sample [&t * &a, &u * &b]');
    expect(r.outputs.map((o) => [o.voice, o.envelope?.decay])).toEqual([['a', 0.3], ['b', 0.3]]);
  });
  it('pitch= is added to every note: a vibrato that belongs to the instrument', () => {
    const r = compileSource(base + '&v s=tri loop=C4 pitch=&(map=lin loop=4 0 .5 0 -.5 0)\n&mix loop=SAMPLE_RATE map=sample [&t * &v]');
    expect(r.outputs[0].mods).toHaveLength(1);
    const e = events(r, 0, 0.9)[0];
    expect(Math.max(...e.bends.map((b) => b.cents))).toBeCloseTo(50);
    expect(e.bends.some((b) => b.ramp)).toBe(true);
  });
  it('take the right kind of cell', () => {
    const msgs = (s: string) => compileSource(base + s).diagnostics.map((d) => d.message).join('\n');
    expect(msgs('&p 0 1\n&v s=tri env=&p')).toMatch(/env= takes a volume/);
    expect(msgs('&v s=tri pitch=&(map=adsr .1 .1 .5 .1)')).toMatch(/pitch= takes a pitch/);
    expect(msgs('&v s=tri env=&nope')).toMatch(/Unknown cell &nope/);
  });
});

describe('swing: a meter driven by the bar, its intervals free', () => {
  const src = '&bar scan(1 1 1 1) step=120bpm\n&swing scan(free(2, 1..3) 1) step=&bar/2\n&t step=&swing 0 1 2 3\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
  it('two eighths a beat, long then short: 2:1 is the triplet swing', () => {
    const r = compileSource(src);
    expect(r.diagnostics).toEqual([]);
    expect(events(r, 0, 0.99).map((e) => +e.at.toFixed(3))).toEqual([0, 0.333, 0.5, 0.833]);
  });
  it('the ratio is a slider: 1:1 is straight; moving it rewrites the scan', () => {
    const r = compileSource(src);
    const f = r.cells.get('swing')!.frees[0];
    expect(f).toMatchObject({ key: 'interval', value: 2, lo: 1, hi: 3 });
    const straight = setFree(src, f, 1);
    expect(straight).toContain('&swing scan(free(1, 1..3) 1)');
    expect(events(compileSource(straight), 0, 0.99).map((e) => +e.at.toFixed(3))).toEqual([0, 0.25, 0.5, 0.75]);
  });
});

describe('swing blues', () => {
  const r = compileSource(PRESETS.jazz.source);
  const beat = 60 / 132;
  const line = (voice: string, from: number, to: number) => events(r, from, to).filter((e) => e.voice === voice);
  const pc = (f: number) => NAMES[((midi(f) % 12) + 12) % 12];
  it('compiles clean', () => expect(r.diagnostics).toEqual([]));
  it('the eighths swing 2:1 — each beat long, then short', () => {
    const ride = line('cym', 0, 4 * beat - 1e-3).map((e) => +(e.at / beat).toFixed(3));
    expect(ride).toEqual([0, 1, 1.667, 2, 3, 3.667]); // ding, ding-a ding, ding-a: the "a" two-thirds into the beat
  });
  it('the riff in the blues scale, the turnaround in the pentatonic', () => {
    const horn = (bar: number, bars: number) => line('horn', bar * 4 * beat, (bar + bars) * 4 * beat - 1e-3).map((e) => pc(e.freq));
    expect(horn(0, 2)).toEqual(['C', 'Eb', 'F', 'F#', 'G', 'Bb', 'G', 'F', 'Eb', 'C']);
    const blues = new Set(['C', 'Eb', 'F', 'F#', 'G', 'Bb']);
    expect(horn(0, 8).every((n) => blues.has(n))).toBe(true);
    const penta = new Set(['C', 'Eb', 'F', 'G', 'Bb']);
    expect(horn(8, 4).every((n) => penta.has(n))).toBe(true);
  });
  it('the changes move the walking bass: I, then IV in bar 5, V in bar 9', () => {
    const root = (bar: number) => pc(line('bass', bar * 4 * beat, (bar + 1) * 4 * beat - 1e-3)[0].freq);
    expect([root(0), root(4), root(6), root(8), root(9), root(11)]).toEqual(['C', 'F', 'C', 'G', 'F', 'G']);
  });
});

describe('Five: 5/4, felt 3 + 2', () => {
  const r = compileSource(PRESETS.five.source);
  const beat = 60 / 172;
  const line = (voice: string, from: number, to: number) => events(r, from, to).filter((e) => e.voice === voice);
  const pc = (f: number) => NAMES[((midi(f) % 12) + 12) % 12];
  it('compiles clean; five beats a bar', () => {
    expect(r.diagnostics).toEqual([]);
    expect(line('bass', 0, 5 * beat - 1e-3)).toHaveLength(5);
  });
  it('3 + 2: the comping turns to the minor fifth on beat 4', () => {
    const chords = line('piano', 0, 5 * beat - 1e-3);
    const before = chords.filter((e) => e.at < 3 * beat - 1e-3).map((e) => pc(e.freq));
    const after = chords.filter((e) => e.at >= 3 * beat - 1e-3).map((e) => pc(e.freq));
    expect(new Set(before)).toEqual(new Set(['Eb', 'F#', 'Bb'])); // Eb minor (Gb spelled F#)
    expect(new Set(after)).toEqual(new Set(['Bb', 'C#', 'Ab'])); // Bb minor 7th: Bb Db Ab (Db spelled C#)
  });
  it('the swing: the second eighth of each beat two-thirds in', () => {
    const ride = line('cym', 0, 2 * beat - 1e-3).map((e) => +(e.at / beat).toFixed(3));
    expect(ride).toEqual([0, 1, 1.667]);
  });
  it('the tune: Eb minor pentatonic; the answer is the call a step up the scale', () => {
    const bar = (n: number) => line('horn', n * 5 * beat, (n + 1) * 5 * beat - 1e-3).map((e) => midi(e.freq));
    const penta = new Set(['Eb', 'F#', 'Ab', 'Bb', 'C#']); // Eb Gb Ab Bb Db
    for (const n of [0, 1, 2, 3]) expect(bar(n).every((m) => penta.has(NAMES[((m % 12) + 12) % 12]))).toBe(true);
    const scale = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22].map((x) => x + 63); // Eb4 upward
    const degree = (m: number) => scale.indexOf(m);
    expect(bar(1).map(degree)).toEqual(bar(0).map((m) => degree(m) + 1));
  });
});

describe('Metronome: any meter — the bar written as levels (meter(…)), read through a kit', () => {
  const src = (PRESETS as Record<string, { source: string }>).metronome.source;
  const clicks = (code: string, seconds = 2.45) => {
    const r = compileSource(code);
    expect(r.diagnostics).toEqual([]);
    return events(r, 0, seconds).map((e) => `${e.at.toFixed(2)}:${e.voice}`);
  };
  it('4/4, a click a beat, 100 a minute: the downbeat, then the beats', () => {
    expect(clicks(src)).toEqual(['0.00:down', '0.60:beatc', '1.20:beatc', '1.80:beatc', '2.40:down']);
  });
  it('eighths, swung: the off-beats two thirds through', () => {
    const c = clicks(src.replace('free(0, 0..3, "1 2 3 4")', 'free(1, 0..3, "1 2 3 4")').replace('swing=free(.5,', 'swing=free(.67,'));
    expect(c.slice(0, 4)).toEqual(['0.00:down', '0.40:sub', '0.60:beatc', '1.00:sub']);
  });
  it('6/8: two beats a bar, three eighths each — the bpm counts the beats', () => {
    const c = clicks(src.replace('free(2, 0..7,', 'free(4, 0..7,'), 1.25);
    expect(c).toEqual(['0.00:down', '0.20:sub', '0.40:sub', '0.60:beatc', '0.80:sub', '1.00:sub', '1.20:down']);
  });
  it('the levels: * the bar, + a beat, . a subdivision, , finer', () => {
    expect(meterLevels('4/4', 2)).toBe('*.+.+.+.');
    expect(meterLevels('4/4', 4)).toBe('*,.,+,.,+,.,+,.,');
    expect(meterLevels('3/4', 3)).toBe('*..+..+..');
    expect(meterLevels('7/8', 1)).toBe('*.+.+..');
    expect(meterLevels('*.+.+..', 1)).toBe('*.+.+..');
  });
});

describe('five more examples', () => {
  const P = PRESETS as Record<string, { source: string }>;
  const notes = (r: R, voice: string, from: number, to: number) =>
    events(r, from, to).filter((e) => e.voice === voice).map((e) => NAMES[((midi(e.freq) % 12) + 12) % 12]);

  it('Korobeiniki: the tune on a 25% pulse; an arpeggio on the chords', () => {
    const r = compileSource(P.korobeiniki.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 144;
    expect(notes(r, 'pulse', 0, 2 * bar - 1e-3)).toEqual(['E', 'B', 'C', 'D', 'C', 'B', 'A', 'A', 'C', 'E', 'D', 'C']);
    const w = waveform(r, 'pulse', codeShifts(r), 64);
    expect(w.filter((x) => x > 0).length / w.length).toBeCloseTo(0.25, 1); // high a quarter of the cycle
    // the chords move it (the changes), and its own pitch= arpeggiates them
    expect(r.outputs.find((o) => o.voice === 'square')!.mods.map((m) => m.cell.startsWith('λ') ? 'arpeggio' : m.cell).sort()).toEqual(['arpeggio', 'changes']);
  });

  it('Coltrane changes: the keys turn B → G → Eb → B, a bar each', () => {
    const r = compileSource(P.coltrane.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 220;
    const root = (n: number) => notes(r, 'bass', n * bar, (n + 1) * bar - 1e-3)[0];
    expect([0, 1, 2, 3].map(root)).toEqual(['B', 'G', 'Eb', 'B']);
    // and the line ends each bar on the next key's dominant: in B, it's D7's b7 (C)
    expect(notes(r, 'sax', 0, bar - 1e-3)).toEqual(['B', 'C#', 'Eb', 'F#', 'D', 'F#', 'A', 'C']);
  });

  it('Bossa nova: the clave strikes x..x..x...x..x.. — and the guitar with it', () => {
    const r = compileSource(P.bossa.source);
    expect(r.diagnostics).toEqual([]);
    const sixteenth = 60 / 128 / 4;
    const at = (voice: string) => events(r, 0, 32 * sixteenth - 1e-3).filter((e) => e.voice === voice).map((e) => Math.round(e.at / sixteenth));
    expect(at('click')).toEqual([0, 3, 6, 10, 13, 16, 19, 22, 26, 29]);
    expect([...new Set(at('guitar'))]).toEqual([0, 3, 6, 10, 13, 16, 19, 22, 26, 29]);
  });

  it('Bell and scale: one scan is both the bell’s rhythm and the melody’s scale', () => {
    const r = compileSource(P.bell.source);
    expect(r.diagnostics).toEqual([]);
    const pulse = 60 / 100 / 3;
    const strokes = events(r, 0, 12 * pulse - 1e-3).filter((e) => e.voice === 'gankogui').map((e) => Math.round(e.at / pulse));
    expect(strokes).toEqual([0, 2, 4, 5, 7, 9, 11]); // x.x.xx.x.x.x
    const song = events(r, 0, 24 * pulse - 1e-3).filter((e) => e.voice === 'voice');
    // the melody lands on the bell's strokes …
    expect(song.slice(0, 7).map((e) => Math.round(e.at / pulse))).toEqual([0, 2, 4, 5, 7, 9, 11]);
    // … and reads the same scan as its scale: C major, every note
    const major = new Set(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(song.every((e) => major.has(NAMES[((midi(e.freq) % 12) + 12) % 12]))).toBe(true);
    expect(song.slice(0, 7).map((e) => NAMES[((midi(e.freq) % 12) + 12) % 12])).toEqual(['G', 'G', 'A', 'G', 'E', 'D', 'C']);
  });

  it('Bach, Prelude in C: one figure reading a turning table of chords', () => {
    const r = compileSource(P.prelude.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 66;
    const fig = (n: number) => events(r, n * bar, n * bar + bar / 2 - 1e-3).filter((e) => e.voice === 'saw').map((e) => midi(e.freq) - 60);
    expect(fig(0)).toEqual([0, 4, 7, 12, 16, 7, 12, 16]); // C E G C E G C E
    expect(fig(1)).toEqual([0, 2, 9, 14, 17, 9, 14, 17]); // C D A D F A D F
    expect(fig(11)).toEqual([-5, -2, 4, 7, 13, 4, 7, 13]); // G Bb E G C#
    expect(fig(19)).toEqual(fig(0)); // round again
  });
});

describe('three more: Pachelbel, pop, IDM', () => {
  const P = PRESETS as Record<string, { source: string }>;
  const pc = (f: number) => NAMES[((midi(f) % 12) + 12) % 12];

  it('Pachelbel: the ground, then the violins one at a time, each a variation behind', () => {
    const r = compileSource(P.pachelbel.source);
    expect(r.diagnostics).toEqual([]);
    const beat = 60 / 66;
    const pass = 8 * beat;
    const cello = events(r, 0, pass - 1e-3).filter((e) => e.voice === 'cello' && e.gains[0] > 0);
    expect(cello.map((e) => pc(e.freq))).toEqual(['D', 'A', 'B', 'F#', 'G', 'D', 'G', 'A']);
    const violins = (n: number) => events(r, n * pass, (n + 1) * pass - 1e-3).filter((e) => e.voice === 'violin' && e.levels[0].level > 0);
    expect(violins(0)).toEqual([]); // the ground alone
    const first = violins(1).filter((e) => e.gains[0] === 0.35); // the first violin: left, at .35
    expect(first.map((e) => pc(e.freq))).toEqual(['F#', 'E', 'D', 'C#', 'B', 'A', 'B', 'C#']);
    // a ground later the second enters with that line, while the first goes on to the next
    const pass2 = violins(2);
    expect(pass2.filter((e) => e.gains[0] === 0.25).map((e) => pc(e.freq))).toEqual(['F#', 'E', 'D', 'C#', 'B', 'A', 'B', 'C#']);
    expect(pass2.filter((e) => e.gains[0] === 0.35).map((e) => pc(e.freq))).toEqual(['D', 'C#', 'B', 'A', 'G', 'F#', 'G', 'E']);
  });

  it('Pop: C – G – Am – F, a bar each; the hook a step up in bar 3 (heard in the first chorus)', () => {
    const r = compileSource(P.pop.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 100;
    const chorus = 3 * 4 * bar; // the fourth section: everything plays
    const inBar = (voice: string, n: number) => events(r, chorus + n * bar, chorus + (n + 1) * bar - 1e-3).filter((e) => e.voice === voice);
    expect([0, 1, 2, 3].map((n) => pc(inBar('bass', n)[0].freq))).toEqual(['C', 'G', 'A', 'F']);
    expect(new Set(inBar('keys', 2).map((e) => pc(e.freq)))).toEqual(new Set(['A', 'C', 'E'])); // A minor
    const hook = (n: number) => inBar('lead', n).slice(0, 4).map((e) => pc(e.freq));
    expect(hook(0)).toEqual(['G', 'G', 'A', 'G']); // degrees 4 4 5 4
    expect(hook(2)).toEqual(['A', 'A', 'B', 'A']); // the same hook, a step up the scale
  });

  it('IDM: every other bar the break backwards; ratchets; hats seven to the bar', () => {
    const r = compileSource(P.idm.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 160;
    const drums = (n: number) => events(r, n * bar, (n + 1) * bar - 1e-3).filter((e) => ['bd', 'sd', 'ch'].includes(e.voice));
    const hits = (n: number) => drums(n).map((e) => e.voice);
    // backwards, step by step (a ratchet's hits stay a ratchet)
    const steps = (n: number) => {
      const out: string[] = [];
      for (const e of drums(n)) {
        const s = Math.floor((e.at - n * bar) / (bar / 16) + 1e-6);
        out[s] = e.voice;
      }
      return out.map((v) => v ?? '~');
    };
    expect(steps(1)).toEqual([...steps(0)].reverse());
    expect(hits(0).length).toBeGreaterThan(16); // the ratchets add hits within steps
    const hats = events(r, 0, bar - 1e-3).filter((e) => e.voice === 'tick');
    expect(hats).toHaveLength(7);
  });
});

describe('other grids: Carlos’ alpha, a study after Studie II', () => {
  const P = PRESETS as Record<string, { source: string }>;
  it('Alpha: triads that ring true — 5 steps ≈ 5:4, 9 = 3:2 — and no octave', () => {
    const r = compileSource(P.alpha.source);
    expect(r.diagnostics).toEqual([]);
    const first = events(r, 0, 0.1).filter((e) => e.voice === 'pad').map((e) => e.freq).sort((a, b) => a - b);
    expect(first[1] / first[0]).toBeCloseTo(Math.pow(1.5, 5 / 9), 6); // ≈ 1.253 (5:4 is 1.25)
    expect(first[2] / first[0]).toBeCloseTo(1.5, 6); // a pure fifth
  });
  it('Studie: 25 steps to 5:1 from 100 Hz; mixtures of five; durations from the series; the second player backwards', () => {
    const r = compileSource(P.studie.source);
    expect(r.diagnostics).toEqual([]);
    const step = Math.pow(5, 1 / 25);
    const fwd = events(r, 0, 60).filter((e) => e.voice === 'swell');
    // the first sound: a mixture of five sines one step apart, from 100 Hz
    const firstMix = fwd.filter((e) => e.at === fwd[0].at).map((e) => e.freq).sort((a, b) => a - b);
    expect(firstMix).toHaveLength(5);
    firstMix.forEach((f, i) => expect(f).toBeCloseTo(100 * Math.pow(step, i), 6));
    // durations in the ratios of the series
    const starts = [...new Set(fwd.map((e) => e.at))].sort((a, b) => a - b).slice(0, 6);
    const durs = starts.slice(1).map((t, i) => t - starts[i]);
    expect(durs.map((d) => +(d / durs[0]).toFixed(2))).toEqual([1, 1.9, 1.38, 3.62, 2.63]);
    // the second player: the last mixture first (spacing 5, from step 20), eight steps up
    const bwd = events(r, 0, 1).filter((e) => e.voice === 'fade').map((e) => e.freq).sort((a, b) => a - b);
    expect(bwd[0]).toBeCloseTo(100 * Math.pow(step, 28), 6);
    expect(bwd[1] / bwd[0]).toBeCloseTo(Math.pow(step, 5), 6);
  });
});

describe('switched off, live', () => {
  it('while playing, no live edge touches a switched-off cell (every example, every cell)', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      const g = buildGraph(r);
      for (const n of g.nodes) {
        const off = new Set([n.id]);
        for (const t of [0.3, 1.7, 4.1]) {
          const live = liveAt(r, codeShifts(r), off, t);
          const bad = [...live.edges].filter((id) => g.edges.some((e) => e.id === id && (e.source === n.id || e.target === n.id)));
          expect(bad, `${key}: ${n.id} off, at ${t}s`).toEqual([]);
        }
      }
    }
  });
});

describe('Just intonation: pure and tempered', () => {
  const r = compileSource((PRESETS as Record<string, { source: string }>).just.source);
  const chord = (side: 0 | 1, n: number) => {
    const bar = (4 * 60) / 48;
    return events(r, n * bar, n * bar + 0.1)
      .filter((e) => e.gains[side] > 0)
      .map((e) => e.freq)
      .sort((a, b) => a - b);
  };
  it('compiles clean', () => expect(r.diagnostics).toEqual([]));
  it('left: pure — the third 5/4, the fifth 3/2; right: tempered', () => {
    const [c, e, g] = chord(0, 0);
    expect(e / c).toBeCloseTo(5 / 4, 9);
    expect(g / c).toBeCloseTo(3 / 2, 9);
    const [c2, e2] = chord(1, 0);
    expect(e2 / c2).toBeCloseTo(Math.pow(2, 4 / 12), 9); // the tempered third: 14 cents wide
  });
  it('ii in just C major: its fifth is 40/27 — about 680 cents, out of tune', () => {
    const [d, , a] = chord(0, 2);
    expect(a / d).toBeCloseTo(40 / 27, 9);
    expect(1200 * Math.log2(a / d)).toBeCloseTo(680.4, 0);
  });
});

describe('Bach, Prelude and Fugue in C minor, BWV 847: every note, against the encoding', () => {
  const r = compileSource((PRESETS as Record<string, { source: string }>).bwv847.source);
  // the CCARH encoding's notes, voice by voice: [onset, length (sixteenths), semitones from C4]
  const reference = bwv847Reference as Record<string, number[][]>;
  it('compiles clean', () => expect(r.diagnostics).toEqual([]));
  // what sounds, voice by voice: onset and length in sixteenths (back through the tempo map), semitones from C4
  const tm = timeMap(r, r.clocks.get('tempo')!, codeShifts(r));
  const lap = (tm.q(1120) - tm.q(0)) - 1e-3;
  const sounding = events(r, 0, lap);
  const VOICE: Record<string, string> = { rh: 'saw', lh: 'pulse', soprano: 'reed', alto: 'brass', bass: 'moog' };
  for (const line of ['rh', 'lh', 'soprano', 'alto', 'bass']) {
    it(`&${line}: every note as it sounds — when, how long, which`, () => {
      const played = sounding
        .filter((e) => e.voice === VOICE[line])
        .map((e) => {
          const at = Math.round(tm.stepAt(e.at));
          return [at + 0, Math.round(tm.stepAt(e.at + e.dur)) - at + 0, Math.round(12 * Math.log2(e.freq / 261.6256)) + 0]; // (+ 0: no −0)
        })
        .sort((x, y) => x[0] - y[0] || x[2] - y[2]);
      expect(played).toEqual(reference[line].sort((x, y) => x[0] - y[0] || x[2] - y[2]));
    });
  }
  it('the tempo map: the prelude at ♩=108, the fugue at ♩=72, together 70 bars of sixteenths', () => {
    expect(r.cells.get('tempo')!.units.length).toBe(1120);
    const at = (step: number) => timeMap(r, r.clocks.get('tempo')!, codeShifts(r)).q(step);
    expect(at(4) - at(0)).toBeCloseTo(60 / 108, 2); // a quarter of the prelude
    expect(at(628) - at(624)).toBeCloseTo(60 / 72, 2); // a quarter of the fugue (356 a minute: within a thousandth)
  });
});

describe('sound parameters that move', () => {
  const base = '&bar step=120bpm 0 0 0 0\n&t step=&bar 0 2 4 5\n';
  const play = (src: string) => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return events(r, 0, 1.99).filter((e) => e.voice === 'v');
  };
  const mix = '\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
  it('lpf=&cell: the cell’s values, held per step', () => {
    const e = play(base + '&cut step=&bar 400 800 1600 3200\n&v s=saw lpf=&cut' + mix);
    expect(e.map((x) => (x.params!.lpf.kind === 'points' ? x.params!.lpf.points[0].value : null))).toEqual([400, 800, 1600, 3200]);
  });
  it('map=lin: it glides within the note', () => {
    const e = play(base + '&cut map=lin step=&bar 400 800 1600 3200\n&v s=saw lpf=&cut' + mix);
    const t = e[0].params!.lpf;
    expect(t.kind === 'points' && t.points.some((x) => x.ramp)).toBe(true);
    expect(t.kind === 'points' && t.points[t.points.length - 1].value).toBeCloseTo(800, 0);
  });
  it('a range times an envelope: per note, from the bottom to the top — the top scaled by an accent', () => {
    const e = play(base + '&acc step=&bar 1 .5 1 .25\n&v s=saw lpf=200..3200 * &(map=adsr .005 .2 .1 .1) * &acc' + mix);
    expect(e.map((x) => x.params!.lpf)).toEqual([1, 0.5, 1, 0.25].map((a) => ({ kind: 'env', from: 200, peak: 200 + 3000 * a, attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.1 })));
  });
  it('several parameters at once, and resonance too', () => {
    const e = play(base + '&q step=&bar 2 12 2 12\n&v s=saw lpf=200..3200 * &(map=adsr .005 .2 .1 .1) lpq=&q' + mix);
    expect(Object.keys(e[0].params!).sort()).toEqual(['lpf', 'lpq']);
    expect(e.map((x) => (x.params!.lpq.kind === 'points' ? x.params!.lpq.points[0].value : null))).toEqual([2, 12, 2, 12]);
  });
  it('says what it needs', () => {
    const msg = (s: string) => compileSource(base + s + mix).diagnostics.map((d) => d.message).join(' | ');
    expect(msg('&v s=saw lpf=&nope')).toMatch(/Unknown cell &nope/);
    expect(msg('&v s=saw lpf=&(map=adsr .01 .1 .5 .1)')).toMatch(/give it a range: lpf=200..3000 \* &env/);
    expect(msg('&e1 map=adsr .01 .1 .5 .1\n&e2 map=adsr .01 .1 .5 .1\n&v s=saw lpf=1..2 * &e1 * &e2')).toMatch(/one envelope \(map=adsr\) at most/);
    expect(msg('&c step=&bar 1\n&v s=saw penv=&c')).toMatch(/penv= can't move/);
    expect(parse('&v lpf=200..3000').diagnostics[0].message).toMatch(/a range is scaled by cells/);
  });
  it('delaytime=&clock: one step of it in seconds — following the tempo', () => {
    const at = (bpm: number) => compileSource(`&bar step=${bpm}bpm 0 0 0 0\n&v s=saw delaytime=&bar/2 delayfeedback=.4`).cells.get('v')!.params;
    expect(at(120)).toMatchObject({ delaytime: 0.25, delayfeedback: 0.4 }); // an eighth at 120
    expect(at(90).delaytime).toBeCloseTo(1 / 3, 5);
    expect(compileSource('&bar step=120bpm 0\n&v s=saw delaytime=&bar*3/4').cells.get('v')!.params.delaytime).toBeCloseTo(0.375, 6); // a dotted eighth
  });
  it('the graph: parameter cells feed their voice, labelled', () => {
    const g = buildGraph(compileSource(base + '&cut step=&bar 400 800\n&v s=saw lpf=&cut' + mix));
    expect(g.edges.find((x) => x.source === 'cell:cut' && x.target === 'cell:v')!.pick).toBe('lpf');
  });
});

describe('IDM, Acid-Cell, Zelluläre Aktivität: parameters that move, in pieces', () => {
  const P = PRESETS as Record<string, { source: string }>;
  const pc = (f: number) => NAMES[((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12];
  it('IDM: the lead plays the chord’s own tones — and the chord moves', () => {
    const r = compileSource(P.idm.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 160;
    for (const twoBars of [0, 1, 2]) {
      const from = twoBars * 2 * bar;
      const ev = events(r, from, from + 2 * bar - 1e-3);
      const chord = new Set(ev.filter((e) => e.voice === 'pad1').map((e) => pc(e.freq)));
      const lead = ev.filter((e) => e.voice === 'bleep').map((e) => pc(e.freq));
      expect(lead.length).toBeGreaterThan(0);
      expect(lead.every((n) => chord.has(n)), `bars ${twoBars * 2 + 1}–${twoBars * 2 + 2}: ${lead} in ${[...chord]}`).toBe(true);
    }
    const chordAt = (n: number) => [...new Set(events(r, n * 2 * bar, n * 2 * bar + 0.1).filter((e) => e.voice === 'pad1').map((e) => pc(e.freq)))].sort().join(' ');
    expect(chordAt(0)).not.toBe(chordAt(1));
    const acid = events(r, 0, bar - 1e-3).filter((e) => e.voice === 'saw303');
    expect(acid.every((e) => e.params?.lpf.kind === 'env')).toBe(true);
  });
  it('Acid-Cell: every note opens the filter — as far as accent and knob allow; the resonance turns', () => {
    const r = compileSource(P.acid.source);
    expect(r.diagnostics).toEqual([]);
    const ev = events(r, 0, (4 * 60) / 126 - 1e-3).filter((e) => e.voice === 'tb303');
    expect(ev.length).toBeGreaterThan(10);
    for (const e of ev) {
      const t = e.params!.lpf;
      expect(t.kind).toBe('env');
      if (t.kind === 'env') {
        expect(t.from).toBe(110);
        expect(t.peak).toBeGreaterThan(110);
        expect(t.peak).toBeLessThanOrEqual(3800);
      }
      expect(e.params!.lpq.kind).toBe('points');
    }
    // accented notes (1) open further than the soft ones (.4) at the same knob
    const peaks = ev.map((e) => (e.params!.lpf.kind === 'env' ? e.params!.lpf.peak : 0));
    expect(peaks[0]).toBeGreaterThan(peaks[1]);
    expect(r.cells.get('tb303')!.params.delaytime).toBeCloseTo((60 / 126) * 0.75, 5); // a dotted eighth
  });
  it('Zelluläre Aktivität: the bass through A F C G by transposing; the arpeggio on each chord, by the scale', () => {
    const r = compileSource(P.zell.source);
    expect(r.diagnostics).toEqual([]);
    const bar = (4 * 60) / 112;
    const full = 4 * 8 * bar; // the fifth section: everything plays (each section starts the parts again)
    const first = (voice: string, n: number) => pc(events(r, full + n * bar, full + (n + 1) * bar - 1e-3).find((e) => e.voice === voice)!.freq);
    expect([0, 2, 4, 6].map((n) => first('bass', n))).toEqual(['A', 'F', 'C', 'G']);
    const chords = [['A', 'C', 'E'], ['F', 'A', 'C'], ['C', 'E', 'G'], ['G', 'B', 'D']];
    chords.forEach((chord, k) => {
      const notes = new Set(events(r, full + 2 * k * bar, full + (2 * k + 2) * bar - 1e-3).filter((e) => e.voice === 'arpeggio').map((e) => pc(e.freq)));
      expect([...notes].sort()).toEqual([...chord].sort());
    });
    expect(r.cells.get('lead')!.params.delaytime).toBeCloseTo(60 / 112, 5); // an echo a beat later
  });
});

describe('arranged: the pop song and Zelluläre Aktivität, section by section', () => {
  const P = PRESETS as Record<string, { source: string }>;
  const who = (key: string, sec: number, n: number) => {
    const r = compileSource(P[key].source);
    return [...new Set(events(r, n * sec, (n + 1) * sec - 1e-3).map((e) => e.voice))].sort().join(' ');
  };
  it('pop: intro · verse · verse · chorus · chorus · break · chorus · chorus · outro · end — and then it stops', () => {
    const sec = (16 * 60) / 100;
    expect([0, 1, 3, 5, 6, 8, 9, 10].map((n) => who('pop', sec, n))).toEqual([
      'hh keys',
      'bass bd hh keys sd',
      'bass bd hh keys lead sd',
      'keys lead',
      'bass bd hh keys lead sd',
      'keys',
      'keys',
      '',
    ]);
    const r = compileSource(P.pop.source);
    expect(plan(r, codeShifts(r)).end).toBeCloseTo(10 * sec, 6);
  });
  it('Zelluläre Aktivität builds layer by layer, breaks, returns — and ends', () => {
    const sec = (32 * 60) / 112;
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => who('zell', sec, n))).toEqual([
      'metal',
      'bass metal',
      'bass bd metal sd',
      'arpeggio bass bd metal sd',
      'arpeggio bass bd lead metal sd',
      'arpeggio bass',
      'arpeggio bass bd lead metal sd',
      'metal',
      '',
    ]);
  });
  it('BWV 847 and the Ricercar end: the fugue’s last chord, the sixth pass', () => {
    const end = (key: string) => {
      const r = compileSource(P[key].source);
      return plan(r, codeShifts(r)).end;
    };
    const b = compileSource(P.bwv847.source);
    expect(end('bwv847')).toBeCloseTo(timeMap(b, b.clocks.get('tempo')!, codeShifts(b)).q(1120), 6);
    expect(end('ricercar')).toBeCloseTo(30 * ((4 * 60) / 66), 1); // thirty bars of a bent meter
  });
});

describe('selectors: reading a table of parts splices', () => {
  // two parts; a selector reading them, a section (two seconds) a step
  const src = (song: string) => `&bar step=120bpm 0 0 0 0
&a step=&bar 0 2 4 5 7
&b step=&bar 12
&partA [&a * &v]
&partB [&b * &w]
&parts &partA &partB
&song over=&parts step=&bar*4 ${song}
&v s=tri loop=C4
&w s=sine loop=C4
&out loop=SAMPLE_RATE map=sample &song`;
  const notes = (r: R, from: number, to: number, voice: string) =>
    events(r, from, to - 1e-3).filter((e) => e.voice === voice).map((e) => Math.round(12 * Math.log2(e.freq / 261.6256)) + 0); // (+ 0: no −0)
  it('picks parts by number; a chord layers them; a rest is silence', () => {
    const r = compileSource(src('0 [0,1] ~ 1'));
    expect(r.diagnostics).toEqual([]);
    expect([notes(r, 0, 2, 'v'), notes(r, 0, 2, 'w')]).toEqual([[0, 2, 4, 5], []]);
    expect(notes(r, 2, 4, 'w')).toEqual([12, 12, 12, 12]);
    expect([notes(r, 4, 6, 'v'), notes(r, 4, 6, 'w')]).toEqual([[], []]);
    expect([notes(r, 6, 8, 'v'), notes(r, 6, 8, 'w')]).toEqual([[], [12, 12, 12, 12]]);
  });
  it('a picked part starts again from its beginning — each time (reading splices)', () => {
    const r = compileSource(src('0 0 1 1'));
    // &a has five steps; a section has four: picked again, it starts from 0, not from 7
    expect(notes(r, 0, 2, 'v')).toEqual([0, 2, 4, 5]);
    expect(notes(r, 2, 4, 'v')).toEqual([0, 2, 4, 5]);
  });
  it('… where a gate lets a part run on', () => {
    const gated = compileSource(`&bar step=120bpm 0 0 0 0
&a step=&bar 0 2 4 5 7
&g map=amp step=&bar*4 1 1
&v s=tri loop=C4
&out loop=SAMPLE_RATE map=sample [&a * &g * &v]`);
    expect(notes(gated, 2, 4, 'v')).toEqual([7, 0, 2, 4]); // it kept running: the fifth note, then round again
  });
  it('a note is cut where its section ends', () => {
    const r = compileSource(src('0 1').replace('&a step=&bar 0 2 4 5 7', '&a step=&bar 0@8'));
    const e = events(r, 0, 1.9).filter((x) => x.voice === 'v');
    expect(e[0].dur).toBeCloseTo(2, 6); // eight beats long, but the section is four
  });
  it('laps=1: the piece ends — nothing after, and the plan knows when', () => {
    const r = compileSource(src('0 [0,1] ~ 1').replace('step=&bar*4 0 [0,1]', 'step=&bar*4 laps=1 0 [0,1]'));
    expect(r.diagnostics).toEqual([]);
    expect(notes(r, 6, 8, 'w')).toEqual([12, 12, 12, 12]);
    expect(events(r, 8, 20)).toEqual([]);
    expect(plan(r, codeShifts(r)).end).toBeCloseTo(8, 6);
    // without it, it loops: no end
    expect(plan(compileSource(src('0 1')), codeShifts(compileSource(src('0 1')))).end).toBe(Infinity);
  });
  it('the parts list says what it needs', () => {
    expect(parse('&song laps=0 0').diagnostics[0].message).toMatch(/laps= takes a count of laps, 1 or more/);
  });
});

describe('selectors, live', () => {
  it('a part is live only while the selector picks it; nothing after the end', () => {
    const r = compileSource(`&bar step=120bpm 0 0 0 0
&a step=&bar 0 2 4 5
&b step=&bar 12
&partA [&a * &v]
&partB [&b * &w]
&parts &partA &partB
&song over=&parts step=&bar*4 laps=1 0 1
&v s=tri loop=C4
&w s=sine loop=C4
&out loop=SAMPLE_RATE map=sample &song`);
    const live = (t: number) => [...liveAt(r, codeShifts(r), new Set(), t).voices].sort();
    expect(live(0.5)).toEqual(['cell:v']);
    expect(live(2.5)).toEqual(['cell:w']);
    expect(live(4.5)).toEqual([]);
    // the selector, its table and the part are on the way: the graph draws them reached
    expect(r.outputs.find((o) => o.voice === 'v')!.via).toEqual(expect.arrayContaining(['song', 'parts', 'partA']));
  });
});

describe('Korobeiniki in Tetris form', () => {
  const r = compileSource((PRESETS as Record<string, { source: string }>).korobeiniki.source);
  const sec = (32 * 60) / 144;
  const pc = (f: number) => NAMES[((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12];
  it('A · A · B · B · A — and round again', () => {
    const who = (n: number) => [...new Set(events(r, n * sec, (n + 1) * sec - 1e-3).map((e) => e.voice))].sort().join(' ');
    expect([0, 1, 2, 3, 4, 5].map(who)).toEqual([
      'pulse tri',
      'noise pulse square tri',
      'pulse50 square tri',
      'noise pulse50 square tri',
      'noise pulse square tri',
      'pulse tri',
    ]);
  });
  it('B, our own: half notes, each bar’s first note in its chord (Am, Em …)', () => {
    const bar = sec / 8;
    const chords = [['A', 'C', 'E'], ['E', 'G', 'B'], ['A', 'C', 'E'], ['E', 'G', 'B'], ['A', 'C', 'E'], ['E', 'G', 'B'], ['A', 'C', 'E'], ['A', 'C', 'E']];
    const lead = events(r, 2 * sec, 3 * sec - 1e-3).filter((e) => e.voice === 'pulse50');
    expect(lead).toHaveLength(15);
    // the bar's first note sits in its chord (bar 2's A over Em: a suspension, resolving to G)
    const firsts = chords.map((_, k) => pc(lead.find((e) => e.at >= 2 * sec + k * bar - 1e-6)!.freq));
    expect(firsts.filter((n, k) => chords[k].includes(n)).length).toBeGreaterThanOrEqual(6);
  });
  it('the selector’s playhead: which section, which parts', () => {
    const live = liveAt(r, codeShifts(r), new Set(), 2.5 * sec).cells.get('tetris')!;
    expect(live.local).toBeCloseTo(2.5, 6); // half way through the third section
    expect([...live.entries].sort()).toEqual([1, 3, 5]);
    // a selector steps through its sections; it doesn't turn like a table
    expect(liveAt(r, codeShifts(r), new Set(), 2.5 * sec).shifts('tetris')).toBe(0);
  });
});

describe('Cellscape: a cycle of twelve', () => {
  const r = compileSource((PRESETS as Record<string, { source: string }>).cellscape.source);
  const sec = (32 * 60) / 72;
  const midiOf = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
  const pc = (f: number) => NAMES[((midiOf(f) % 12) + 12) % 12];
  it('compiles clean; twelve scenes, gathering and thinning — then round again', () => {
    expect(r.diagnostics).toEqual([]);
    const who = (n: number) => [...new Set(events(r, n * sec, (n + 1) * sec - 1e-3).map((e) => e.voice))].sort().join(' ');
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(who)).toEqual([
      'padv',
      'bell padv',
      'arpv bell padv',
      'arpv padv voiceA',
      'arpv padv voiceA voiceB',
      'arpv bass padv voiceA voiceB',
      'bass bell glass padv voiceA voiceB',
      'arpv bass bell glass padv voiceA voiceB',
      'bell glass padv voiceB',
      'arpv bass glass padv',
      'bell glass padv',
      'glass padv',
    ]);
    expect(who(12)).toBe(who(0));
  });
  it('each scene a fifth from the last: all twelve keys, and home', () => {
    const root = (n: number) => pc(Math.min(...events(r, n * sec, n * sec + 0.1).filter((e) => e.voice === 'padv').map((e) => e.freq)));
    expect(Array.from({ length: 13 }, (_, n) => root(n))).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F', 'C']);
  });
  it('the canon agrees with itself wherever its voices start notes (in every key it passes)', () => {
    const CONS = new Set([0, 3, 4, 7, 8, 9]);
    for (const n of [4, 5, 6, 7]) {
      const ev = events(r, n * sec, (n + 1) * sec - 1e-3);
      const lead = ev.filter((e) => e.voice === 'voiceA' && e.gains[0] > 0);
      const follow = ev.filter((e) => e.voice === 'voiceB' && e.gains[1] > 0);
      const at = (line: typeof lead, t: number) => line.find((e) => e.at <= t + 1e-6 && t < e.at + e.dur - 1e-6);
      for (const e of [...lead, ...follow]) {
        const a = at(lead, e.at);
        const b = at(follow, e.at);
        if (!a || !b) continue;
        expect(CONS.has(Math.abs(midiOf(a.freq) - midiOf(b.freq)) % 12), `scene ${n + 1} at ${e.at.toFixed(2)}`).toBe(true);
      }
    }
  });
  it('the score both barrels read is reached, not dimmed', () => {
    expect(routing(r, new Set()).nodes.has('cell:scenes')).toBe(true);
  });
  it('one score, read for each ear: the leader mostly left, the follower mostly right', () => {
    const g = (voice: string) => r.outputs.filter((o) => o.voice === voice).reduce((a, o) => [a[0] + o.gains[0], a[1] + o.gains[1]], [0, 0]);
    expect(g('voiceA')[0]).toBeGreaterThan(g('voiceA')[1]);
    expect(g('voiceB')[1]).toBeGreaterThan(g('voiceB')[0]);
  });
});

describe('chance: x?p, [a|b|c], chance=, seed= — reproducible, and new each lap', () => {
  const play = (body: string, laps = 400, extra = '') => {
    const r = compileSource(`&t step=10${extra} ${body}\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]`);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const steps = r.cells.get('t')!.steps;
    return { r, ev: events(r, 0, (laps * steps) / 10 - 1e-6), steps };
  };
  const semis = (f: number) => Math.round(12 * Math.log2(f / 261.6256)) + 0;
  it('x?p sounds about p of the time; x? about half; the rest always', () => {
    const { ev } = play('0 4?.25 7?', 800);
    const count = (n: number) => ev.filter((e) => semis(e.freq) === n).length / 800;
    expect(count(0)).toBe(1);
    expect(count(4)).toBeGreaterThan(0.2);
    expect(count(4)).toBeLessThan(0.3);
    expect(count(7)).toBeGreaterThan(0.44);
    expect(count(7)).toBeLessThan(0.56);
  });
  it('chance= sets what a bare ? means', () => {
    const { ev } = play('0? 4?', 800, ' chance=.1');
    expect(ev.length / 1600).toBeLessThan(0.14);
    expect(ev.length / 1600).toBeGreaterThan(0.06);
  });
  it('the same every time it’s played — different each lap', () => {
    const a = play('0? 4? 7? 11?', 50).ev.map((e) => [e.at, e.freq]);
    const b = play('0? 4? 7? 11?', 50).ev.map((e) => [e.at, e.freq]);
    expect(a).toEqual(b);
    const { ev } = play('0? 4? 7? 11?', 50);
    const lapsSeen = new Set(Array.from({ length: 50 }, (_, lap) => ev.filter((e) => Math.floor(e.at / 0.4 + 1e-9) === lap).map((e) => semis(e.freq)).join(' ')));
    expect(lapsSeen.size).toBeGreaterThan(8);
    // a seed throws differently
    const seeded = play('0? 4? 7? 11?', 50, ' seed=7').ev.map((e) => [e.at, e.freq]);
    expect(seeded).not.toEqual(a);
  });
  it('[a|b|c] chooses each, about evenly', () => {
    const { ev } = play('[0|4|7]', 900);
    const share = (n: number) => ev.filter((e) => semis(e.freq) === n).length / 900;
    for (const n of [0, 4, 7]) {
      expect(share(n)).toBeGreaterThan(0.27);
      expect(share(n)).toBeLessThan(0.4);
    }
  });
  it('a chord sounds or rests together', () => {
    const { ev } = play('[0,4,7]?', 300);
    const perStep = new Map<number, number>();
    for (const e of ev) perStep.set(+e.at.toFixed(6), (perStep.get(+e.at.toFixed(6)) ?? 0) + 1);
    expect([...perStep.values()].every((n) => n === 3)).toBe(true);
  });
  it('chance=free(…): a slider for how often', () => {
    const src = '&t step=10 chance=free(.3, 0..1) 0? 4?\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
    const r = compileSource(src);
    expect(r.cells.get('t')!.chance).toBe(0.3);
    const f = parse(src).cells[0]!.frees![0]!;
    expect(f.key).toBe('chance');
    expect(setFree(src, f, 0.8)).toContain('chance=free(0.8, 0..1)');
  });
  it('says what it needs', () => {
    expect(parse('&t 0?2').diagnostics[0].message).toMatch(/A probability is from 0 to 1/);
    expect(parse('&t [0|]').diagnostics.length).toBeGreaterThan(0);
    expect(parse('&t [0|4').diagnostics[0].message).toMatch(/choice/);
    expect(parse('&t chance=3 0?').diagnostics[0].message).toMatch(/chance= is a probability/);
  });
});

describe('Cellscape II feat. Stockhausen', () => {
  const src = (PRESETS as Record<string, { source: string }>).cellscape2.source;
  const r = compileSource(src);
  const ev = events(r, 0, 240);
  it('compiles clean; every layer sounds within four minutes', () => {
    expect(r.diagnostics).toEqual([]);
    expect([...new Set(ev.map((e) => e.voice))].sort()).toEqual(['droneA', 'droneB', 'glint', 'noise', 'ripple', 'sine']);
  });
  it('no octaves: every pitch is a step of 25 to 5:1, from 100 Hz (what slides drifts within its own swing)', () => {
    const DRIFT: Record<string, number> = { glint: 40, droneA: 30, droneB: 30 }; // cents: their pitch= LFOs
    const STEP = (1200 * Math.log2(5)) / 25; // about 111 cents
    for (const e of ev.filter((x) => x.voice !== 'noise')) {
      const step = (25 * Math.log(e.freq / 100)) / Math.log(5);
      const off = Math.abs(step - Math.round(step));
      expect(off, `${e.voice} ${e.freq}`).toBeLessThan((DRIFT[e.voice] ?? 0) / STEP + 1e-6);
    }
  });
  it('no beat: no meter; each layer its own clock, a prime number of steps', () => {
    expect([...r.clocks.values()].some((c) => c.positional)).toBe(false);
    expect(['constellations', 'glints', 'ripples'].map((n) => r.cells.get(n)!.steps)).toEqual([11, 7, 13]);
    expect(new Set(['constellations', 'glints', 'ripples'].map((n) => r.cells.get(n)!.clock)).size).toBe(3);
  });
  it('chance: the mixtures differ from pass to pass — and every playing is the same', () => {
    const pass = (k: number) => events(r, k * 100, (k + 1) * 100 - 1e-6).filter((e) => e.voice === 'sine' && e.gains[0] > 0).map((e) => `${(e.at - k * 100).toFixed(2)}:${e.freq.toFixed(1)}`).join(' ');
    expect(new Set([0, 1, 2, 3].map(pass)).size).toBeGreaterThan(1);
    expect(events(compileSource(src), 0, 240).map((e) => e.freq)).toEqual(ev.map((e) => e.freq));
  });
  it('the mirror: the mixtures backwards, 8 steps higher (when it sounds, its first is the last, raised)', () => {
    const first = events(r, 0, 9).filter((e) => e.voice === 'sine' && e.gains[1] > 0).map((e) => Math.round(25 * Math.log(e.freq / 100) / Math.log(5)));
    if (first.length) expect(first.sort((a, b) => a - b)).toEqual([9, 13, 17, 21, 25]); // [1,5,9,13,17] + 8
  });
  it('the glints’ chance is a slider', () => {
    expect(parse(src).cells.find((c) => c.name === 'glints')!.frees!.map((f) => f.key)).toEqual(['chance']);
  });
});

describe('Baustelle', () => {
  const r = compileSource((PRESETS as Record<string, { source: string }>).baustelle.source);
  const sec = (16 * 60) / 118;
  it('compiles clean; builds, breaks, comes back, collapses — and ends', () => {
    expect(r.diagnostics).toEqual([]);
    const who = (n: number) => [...new Set(events(r, n * sec, (n + 1) * sec - 1e-3).map((e) => e.voice))].sort().join(' ');
    expect(who(0)).toBe('beamv pipev');
    expect(who(7)).toBe('bassfeder'); // the spring alone
    expect(who(10)).toBe('bassfeder beamv breath drillv grinder grit pipev platev sub voice');
    expect(who(12)).toBe('beamv crash platev sub'); // the crash
    expect(plan(r, codeShifts(r)).end).toBeCloseTo(13 * sec, 6);
    expect(events(r, 13 * sec, 13 * sec + 10)).toEqual([]);
  });
  it('each metal rings at its own partials (inharmonic: no octaves in a beam)', () => {
    const chord = (voice: string, n: number) => {
      const fs = [...new Set(events(r, 3 * sec, 4 * sec).filter((e) => e.voice === voice).map((e) => +e.freq.toFixed(3)))].sort((a, b) => a - b);
      return fs.slice(0, n).map((f) => +(f / fs[0]).toFixed(3));
    };
    expect(chord('beamv', 4)).toEqual([1, 2.756, 5.404, 8.933]);
    expect(chord('pipev', 4)).toEqual([1, 2.42, 4.37, 6.71]);
    expect(chord('platev', 6)).toEqual([1, 1.59, 2.14, 2.3, 2.65, 2.92]);
  });
  it('the grinder swells within its notes (noise follows a volume, now)', () => {
    const g = events(r, sec, 2 * sec).filter((e) => e.voice === 'grinder');
    expect(g.length).toBeGreaterThan(0);
    expect(new Set(g[0].levels.map((l) => l.level)).size).toBeGreaterThan(2);
  });
  it('the hand: the metal varies from bar to bar (chance), the same every playing', () => {
    const bar = sec / 4;
    const hits = (k: number) => events(r, k * bar, (k + 1) * bar - 1e-6).filter((e) => e.voice === 'beamv').map((e) => (e.at - k * bar).toFixed(3)).join(' ');
    expect(new Set([0, 1, 2, 3, 4, 5, 6, 7].map(hits)).size).toBeGreaterThan(1);
    expect(events(compileSource((PRESETS as Record<string, { source: string }>).baustelle.source), 0, 20).length).toBe(events(r, 0, 20).length);
  });
  it('grit: distort= and crush= are numbers on the voice', () => {
    expect(r.cells.get('grit')!.params).toMatchObject({ distort: 0.85, crush: 6 });
  });
});

describe('five more: Cell in Focus, Hypercell, One more Cell, Cellular Brothers, Ghost-Cells', () => {
  const P = PRESETS as Record<string, { source: string }>;
  const R = (k: string) => compileSource(P[k].source);
  const pc = (f: number) => NAMES[((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12];
  it('all compile clean', () => {
    for (const k of ['focus', 'hypercell', 'onemore', 'brothers', 'ghosts']) expect(R(k).diagnostics, k).toEqual([]);
  });
  it('Cell in Focus: the bells play the chord under them (Dmaj7 · Bm9 · Gmaj7 · A6), and it loops', () => {
    const r = R('focus');
    const four = (16 * 60) / 62;
    const chords = [['D', 'F#', 'A', 'C#'], ['B', 'D', 'F#', 'A', 'C#'], ['G', 'B', 'D', 'F#'], ['A', 'C#', 'E', 'F#']];
    chords.forEach((c, k) => {
      const bells = events(r, k * four, (k + 1) * four - 1e-3).filter((e) => e.voice === 'bell').map((e) => pc(e.freq));
      expect(bells.length).toBeGreaterThan(10);
      expect(bells.every((n) => c.includes(n)), `chord ${k + 1}: ${[...new Set(bells)]}`).toBe(true);
    });
    expect(plan(r, codeShifts(r)).end).toBe(Infinity);
  });
  it('Hypercell: intro, builds, drops, breaks — three minutes, then it ends', () => {
    const r = R('hypercell');
    const sec = (32 * 60) / 160;
    const who = (n: number) => [...new Set(events(r, n * sec, (n + 1) * sec - 1e-3).map((e) => e.voice))].sort().join(' ');
    expect(who(0)).toBe('bd cp hh');
    expect(who(3)).toBe('bass bd cp hh sawA sawB stab'); // the drop
    expect(who(10)).toBe('padv'); // the break
    expect(plan(r, codeShifts(r)).end).toBeCloseTo(180, 6);
  });
  it('One more Cell: one chord shape (maj7) on F, G, A, B♭ — and it pumps on every beat', () => {
    const r = R('onemore');
    const bar = 240 / 122;
    ['F', 'G', 'A', 'Bb'].forEach((root, k) => {
      const c = [...new Set(events(r, 2 * k * bar, 2 * k * bar + bar / 4 - 1e-3).filter((e) => e.voice === 'keys').map((e) => pc(e.freq)))];
      const i = NAMES.indexOf(root);
      expect(c.sort()).toEqual([0, 4, 7, 11].map((d) => NAMES[(i + d) % 12]).sort());
    });
    const levels = events(r, 0, bar - 1e-3).filter((e) => e.voice === 'keys').map((e) => e.levels[0].level);
    expect(Math.max(...levels)).toBeGreaterThan(2 * Math.min(...levels)); // ducked on the beat, open after
  });
  it('Cellular Brothers: break, bass, acid, builds, all — and it ends', () => {
    const r = R('brothers');
    const sec = (32 * 60) / 112;
    const who = (n: number) => [...new Set(events(r, n * sec, (n + 1) * sec - 1e-3).map((e) => e.voice))].sort().join(' ');
    expect(who(0)).toBe('bd ch sd');
    expect(who(3)).toBe('riser sn'); // a build
    expect(who(5)).toBe('bd ch sd siren1 stab subv tb'); // everything
    expect(plan(r, codeShifts(r)).end).toBeCloseTo(9 * sec, 6);
  });
  it('Ghost-Cells: seven against eight — the piano comes back a step later every bar; it loops', () => {
    const r = R('ghosts');
    const bar = 240 / 76;
    const eighth = bar / 8;
    expect(r.cells.get('phrase')!.steps).toBe(7);
    // where the phrase begins (every seventh eighth): a different eighth of the bar each time — eight phrases
    // in seven bars, so every eighth of the bar has its turn before they line up again
    const starts = events(r, 0, 7 * bar - 1e-3)
      .filter((e) => e.voice === 'piano')
      .map((e) => Math.round(e.at / eighth))
      .filter((i) => i % 7 === 0);
    expect(new Set(starts.map((i) => i % 8)).size).toBe(8);
    expect(plan(r, codeShifts(r)).end).toBe(Infinity);
  });
});

describe('FM: fm=&op, ratio=, index=', () => {
  const base = '&bar step=120bpm 0 0 0 0\n&t step=&bar 0 4 7\n';
  const mix = '\n&out loop=SAMPLE_RATE map=sample [&t * &car]';
  it('a carrier names its modulator; the modulator is a voice with a ratio; the graph shows it', () => {
    const r = compileSource(base + '&op s=sine ratio=3.5\n&car s=sine loop=C4 fm=&op index=2' + mix);
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.get('car')!.params).toMatchObject({ fm: 'op', index: 2 });
    expect(r.cells.get('op')!.params).toMatchObject({ ratio: 3.5 });
    const g = buildGraph(r);
    expect(g.edges.find((e) => e.source === 'cell:op' && e.target === 'cell:car')!.pick).toBe('fm');
  });
  it('the index moves: a range under an envelope, per note', () => {
    const r = compileSource(base + '&op s=sine ratio=1\n&car s=sine loop=C4 fm=&op index=.5..5 * &(map=adsr .001 .2 .1 .1)' + mix);
    const e = events(r, 0, 1.4).filter((x) => x.voice === 'car');
    expect(e[0].params!.index).toMatchObject({ kind: 'env', from: 0.5, peak: 5 });
  });
  it('chains (an operator modulating a modulator) — but no loops', () => {
    expect(compileSource(base + '&a s=sine ratio=2\n&b s=sine ratio=1 fm=&a\n&car s=sine fm=&b' + mix).diagnostics).toEqual([]);
    const loop = compileSource(base + '&a s=sine ratio=2 fm=&car\n&car s=sine fm=&a' + mix);
    expect(loop.diagnostics.map((d) => d.message).join()).toMatch(/FM chains can't loop/);
    expect(compileSource(base + '&car s=sine fm=&t' + mix).diagnostics.map((d) => d.message).join()).toMatch(/a modulator is a voice/);
  });
  it('Cell Tines compiles clean, and every voice sounds', () => {
    const r = compileSource((PRESETS as Record<string, { source: string }>).tines.source);
    expect(r.diagnostics).toEqual([]);
    expect([...new Set(events(r, 0, 12).map((e) => e.voice))].sort()).toEqual(['bell', 'body', 'fmbass', 'tine']);
  });
});

describe('Cell Phase: a ratio of clocks, not a nudged tempo', () => {
  const r = compileSource((PRESETS as Record<string, { source: string }>).phase.source);
  it('compiles clean', () => expect(r.diagnostics).toEqual([]));
  it('the right player is a note ahead every 81 of its notes, and in unison again after 81 rounds', () => {
    const at = (voice: string) => events(r, 0, 200).filter((e) => e.voice === voice).map((e) => e.at);
    const L = at('pianoL');
    const R = at('pianoR');
    expect(R[81]).toBeCloseTo(L[80], 9); // 81 of the right's notes take as long as 80 of the left's
    expect(R[162]).toBeCloseTo(L[160], 9);
    // pitches: after 12 × 81 notes of the right (12 × 80 of the left) both start the pattern together
    const p = (voice: string) => events(r, 0, 120).filter((e) => e.voice === voice);
    expect(p('pianoR')[12 * 81].freq).toBeCloseTo(p('pianoL')[12 * 80].freq, 6);
    expect(p('pianoR')[12 * 81].at).toBeCloseTo(p('pianoL')[12 * 80].at, 9);
  });
  it('euclid(5, 12) marks the left player’s twelve', () => {
    const w = events(r, 0, (12 * 60) / 144 / 4 - 1e-6).filter((e) => e.voice === 'woodv');
    expect(w.length).toBe(5);
  });
});

describe('DTMF: a number typed, then dialled — spell(free("…"), &keys, "names")', () => {
  const src = (PRESETS as Record<string, { source: string }>).dtmf.source;
  const dialled = (code: string, seconds = 1.2) => {
    const r = compileSource(code);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const by = new Map<number, number[]>();
    for (const e of events(r, 0, seconds)) by.set(Math.round(e.at * 7), [...(by.get(Math.round(e.at * 7)) ?? []), e.freq]);
    return by;
  };
  const near = (got: number[] | undefined, want: number[]) => {
    expect(got?.length).toBe(2);
    [...got!].sort((a, b) => a - b).forEach((f, i) => expect(Math.abs(f / want[i] - 1)).toBeLessThan(0.015));
  };
  it('each character a key — its row and its column — then a pause; a space a rest', () => {
    const d = dialled(src);
    near(d.get(0), [852, 1336]); // 8
    near(d.get(2), [770, 1477]); // 6
    near(d.get(4), [852, 1209]); // 7
    expect(d.has(6)).toBe(false); // the space: a rest
    near(d.get(8), [770, 1336]); // 5
  });
  it('the letters and the symbols too; anything not on the keypad rests', () => {
    const d = dialled(src.replace('free("867 5309 ABCD .#")', 'free("A.#*D")'));
    near(d.get(0), [697, 1633]); // A
    expect(d.has(2)).toBe(false); // . — not a key: a rest
    near(d.get(4), [941, 1477]); // #
    near(d.get(6), [941, 1209]); // *
    near(d.get(8), [941, 1633]); // D
  });
  it('typing rewrites the text in the code', () => {
    const r = compileSource(src);
    const f = r.cells.get('dial')!.frees[0];
    expect(f.key).toBe('text');
    expect(f.text).toBe('867 5309 ABCD .#');
    expect(setFree(src, f, '555 0199')).toContain('spell(free("555 0199"), &keys,');
  });
  it('a keypad (free() with named choices) still works for any table', () => {
    const r = compileSource('&k shift=free(2, 0..3, "a b c d") 0 1 2 3');
    expect(r.cells.get('k')!.frees[0].labels).toEqual(['a', 'b', 'c', 'd']);
    const errors = (code: string) => compileSource(code).diagnostics.filter((d) => d.severity === 'error');
    expect(errors('&k shift=free(0, 0..6, "a b c d") 0 1 2 3')).toEqual([]); // every 2nd
    expect(errors('&k shift=free(0, 0..4, "a b c d") 0 1 2 3').map((d) => d.message).join()).toMatch(/4 names need 3 equal whole steps/);
  });
});
