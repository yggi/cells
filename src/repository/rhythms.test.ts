// The rhythms (#138): E31's eight drum bars, lifted word for word but their `&bar`, play E31's 144 hits under a host's
// meter; the claves play their patterns on General MIDI's claves (#140); every rhythm is open on its meter and finds its place by its association.
import { describe, expect, it } from 'vitest';
import e31 from '../../fixtures/jambot-e31.json';
import vectors from '../../fixtures/jambot-swing.json';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { soundsIdentical } from '../engine/sameness';
import { createRepository, type StylePoint } from './fragments';
import { fitOf } from './fit';
import { holesOf } from './holes';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

/** One drum hit as MIDI out sends it: its note, its step and length in sixteenths of the bar, its velocity. */
interface Hit {
  note: number;
  step: number;
  length: number;
  velocity: number;
}

const rhythms = createRepository(RHYTHM_FRAGMENTS);
const meters = createRepository(METER_FRAGMENTS);
const byId = (id: string) => RHYTHM_FRAGMENTS.find((f) => f.id === id)!;
const meterText = (id: string) => METER_FRAGMENTS.find((f) => f.id === id)!.text;
/** The core kit's lines: every voice the rhythms leave as a hole (#244). */
const coreKit = INSTRUMENT_FRAGMENTS.find((f) => f.id === 'core kit')!.text;

/** The host's text: its `&bar`, a meter fragment at a tempo (`setTiming`, as a host sets one), then the fragments. */
const hosted = (meter: string, bpm: number, ...fragments: string[]) => [setTiming(meter, 'bar', 'step', `${bpm}bpm`), ...fragments].join('\n');

/** What a text sends on channel 10 in its first `steps` sixteenths at a tempo, as E31's `cellsDrums` reads it, and what its compiler said. */
function played(text: string, bpm: number, steps = 16): { hits: Hit[]; diagnostics: string[] } {
  const plan = planOf(text);
  const sixteenth = 60 / bpm / 4;
  const route = router(plan.result, channelTable(plan.result));
  const hits = windowAt(plan, 0, steps * sixteenth - 1e-9).events.flatMap((e) =>
    routesOf(route(e)).flatMap((r) => {
      const note = midiNote(e, r);
      if (!note || note.channel !== 10) return [];
      const step = note.at / sixteenth;
      return [{ note: note.note, step, length: note.end / sixteenth - step, velocity: note.velocity }];
    }),
  );
  return { hits: hits.sort((a, b) => a.step - b.step || a.note - b.note), diagnostics: plan.result.diagnostics.map((d) => d.message) };
}

const sorted = (hits: readonly Hit[]) => [...hits].sort((a, b) => a.step - b.step || a.note - b.note);

/** E31's check: the same note, step, written length and velocity, a step's time within a millionth of a step. */
const sameHit = (a: Hit, b: Hit) => a.note === b.note && Math.abs(a.step - b.step) < 1e-6 && Math.abs(a.length - b.length) < 1e-6 && a.velocity === b.velocity;

// Each preset's point and its swing (yggi/jambot packages/engine/src/style.ts @ 7b078e8, unchanged at 327d6a8).
const PRESETS: Record<string, { point: StylePoint; swing: number }> = {
  'Synth-pop': { point: SYNTH_POP, swing: 0 },
  Techno: { point: TECHNO, swing: 0 },
  'Deep house': { point: DEEP_HOUSE, swing: 0.3 },
  Ambient: { point: AMBIENT, swing: 0.05 },
  'Lo-fi hip hop': { point: LO_FI, swing: 0.45 },
  Funk: { point: FUNK, swing: 0.3 },
  'Bossa nova': { point: BOSSA_NOVA, swing: 0 },
  'Swing jazz': { point: SWING_JAZZ, swing: 1 },
};

// Each clave's strokes, in sixteenths of 4/4 over its bars: over two, a stroke on every eighth of the cut-time pattern
// (x..x..x...x.x... doubled); over one, the cut-time pattern itself.
const CLAVES: Record<string, { bars: number; strokes: number[] }> = {
  'son clave 3-2': { bars: 2, strokes: [0, 6, 12, 20, 24] },
  'son clave 2-3': { bars: 2, strokes: [4, 8, 16, 22, 28] },
  'rumba clave 3-2': { bars: 2, strokes: [0, 6, 14, 20, 24] },
  'bossa nova clave': { bars: 2, strokes: [0, 6, 12, 20, 26] },
  'bossa nova clave (one bar)': { bars: 1, strokes: [0, 3, 6, 10, 13] },
};

const drumBars = e31.witnesses.map((w) => ({ ...w, fragment: byId(`${w.preset} drums`) }));

describe('the rhythm fragments', () => {
  it('are E31’s eight drum bars, one per preset, and five claves, every point associated as the facet rhythm', () => {
    expect(RHYTHM_FRAGMENTS.map((f) => f.id)).toEqual([...Object.keys(PRESETS).map((p) => `${p} drums`), ...Object.keys(CLAVES)]);
    expect(RHYTHM_FRAGMENTS.flatMap((f) => f.association.map((wp) => wp.facet))).toEqual(RHYTHM_FRAGMENTS.map(() => 'rhythm'));
  });

  it.each(drumBars.map((w) => [w.preset, w] as const))('%s: its drum bar is E31’s text word for word, without its &bar line and its stand-in voices', (_, w) => {
    const [bar, ...rest] = w.text.split('\n');
    expect(bar).toMatch(/^&bar scan\(1 1 1 1\) step=\d+bpm$/);
    // (the stand-in voices `&bd s=white` …, E31's own, are holes the kit fills: #244)
    expect(w.fragment.text).toBe(rest.filter((l) => !/^&\w+ s=white$/.test(l)).join('\n'));
  });

  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s is open on its meter: no meter of its own, and alone it asks for one', (_, text) => {
    expect(text).not.toMatch(/&bar|meter\(|scan\(/);
    const alone = compileSource([text, coreKit].join('\n'));
    expect(alone.mainMeter).toBeUndefined();
    expect(alone.diagnostics.map((d) => d.message).join('\n')).toMatch(/taps the piece's main meter, and it has none/);
    const filled = compileSource(hosted(meterText('7/8'), 90, text, coreKit));
    expect(filled.diagnostics).toEqual([]);
    expect(filled.mainMeter).toBe('bar');
  });
});

describe('E31’s drum bars, under a host’s meter, play E31’s hits', () => {
  it('there are 144 of them, in eight bars', () => {
    expect(drumBars).toHaveLength(8);
    expect(drumBars.reduce((n, w) => n + w.hits.length, 0)).toBe(144);
  });

  // (the host writes the repository's 4/4 first, at the preset's bpm: E31's own meter, the bar the band writes its hits in)
  it.each(drumBars.map((w) => [w.preset, w] as const))('%s: every hit, its note, step, written length and velocity, under 4/4 at its bpm', (_, w) => {
    const { hits, diagnostics } = played(hosted(meterText('4/4'), w.bpm, w.fragment.text, coreKit), w.bpm);
    expect(diagnostics).toEqual([]);
    const want = sorted(w.hits);
    expect(hits).toHaveLength(want.length);
    want.forEach((h, i) => expect(sameHit(hits[i]!, h), `${JSON.stringify(h)}, played ${JSON.stringify(hits[i])}`).toBe(true));
  });

  it('144 of 144, counted', () => {
    const matched = drumBars.reduce((n, w) => {
      const { hits } = played(hosted(meterText('4/4'), w.bpm, w.fragment.text, coreKit), w.bpm);
      return n + sorted(w.hits).filter((h, i) => hits[i] && sameHit(hits[i], h)).length;
    }, 0);
    expect(matched).toBe(144);
  });

  // Under the meter the repository finds at the preset's point, which plays the preset's swing: each hit where Jambot's
  // leanMap puts its sixteenth, as long as from there to the next sixteenth's onset, at E31's note and velocity. All but
  // the rim, where a meter leans the sixteenths (Lo-fi hip hop's, Funk's): a Euclid on 1m doesn't swing with its meter
  // (#121), so its strokes stay straight, and on a sixteenth the meter leans, the level line they are multiplied by, which
  // does swing, reads 0 (velocity 1). 132 of the 144 swing as Jambot's band does; 5 of the 12 rim strokes lose their level.
  const RIM_UNSWUNG = ['Lo-fi hip hop', 'Funk'];
  const underOwnMeter = (w: (typeof drumBars)[number]) => {
    const { point, swing } = PRESETS[w.preset]!;
    const onsets = [...vectors.vectors.find((v) => v.s === swing)!.onsets, 16];
    const rimUnswung = (h: Hit) => RIM_UNSWUNG.includes(w.preset) && h.note === 37;
    const want = sorted(
      w.hits.map((h) => (rimUnswung(h) ? { ...h, velocity: h.step % 2 ? 1 : h.velocity } : { ...h, step: onsets[h.step]!, length: onsets[h.step + 1]! - onsets[h.step]! })),
    );
    return { want, rimUnswung, ...played(hosted(meters.query(point, 1)[0]!.fragment.text, w.bpm, w.fragment.text, coreKit), w.bpm) };
  };
  it.each(drumBars.map((w) => [w.preset, w] as const))('%s: under its own meter, every hit through Jambot’s swing but the unswung rim (#121)', (_, w) => {
    const { hits, diagnostics, want } = underOwnMeter(w);
    expect(diagnostics).toEqual([]);
    expect(hits).toHaveLength(want.length);
    want.forEach((h, i) =>
      expect(Math.abs(hits[i]!.step - h.step) < 1e-9 && Math.abs(hits[i]!.length - h.length) < 1e-9, `${JSON.stringify(h)}, played ${JSON.stringify(hits[i])}`).toBe(true),
    );
    want.forEach((h, i) => expect([hits[i]!.note, hits[i]!.velocity]).toEqual([h.note, h.velocity]));
  });

  it('under their own meters, 132 of 144 swing as the band does, and 12 rim strokes stay straight, 5 of them at velocity 1 (#121)', () => {
    const counts = drumBars.map((w) => {
      const { rimUnswung } = underOwnMeter(w);
      const rims = w.hits.filter(rimUnswung);
      return { rims: rims.length, levelLost: rims.filter((h) => h.step % 2).length, rest: w.hits.length - rims.length };
    });
    const sum = (key: 'rims' | 'levelLost' | 'rest') => counts.reduce((n, c) => n + c[key], 0);
    expect([sum('rest'), sum('rims'), sum('levelLost')]).toEqual([132, 12, 5]);
  });
});

describe('the claves', () => {
  it.each(Object.entries(CLAVES))('%s plays its five strokes over its bars, and comes round', (id, { bars, strokes }) => {
    const { hits, diagnostics } = played(hosted(meterText('4/4'), 120, byId(id).text, coreKit), 120, 32 * bars);
    expect(diagnostics).toEqual([]);
    expect(hits.map((h) => h.step)).toEqual([...strokes, ...strokes.map((s) => s + 16 * bars)]);
    expect(new Set(hits.map((h) => [h.note, h.length, h.velocity].join()))).toEqual(new Set(['75,1,90']));
  });

  it.each(Object.keys(CLAVES).flatMap((clave) => drumBars.map((w) => [clave, w.preset, clave, w] as const)))('%s layers on %s drums in one text', (_, __, clave, w) => {
    const both = played(hosted(meterText('4/4'), w.bpm, w.fragment.text, byId(clave).text, coreKit), w.bpm, 32);
    expect(both.diagnostics).toEqual([]);
    const drums = played(hosted(meterText('4/4'), w.bpm, w.fragment.text, coreKit), w.bpm, 32).hits;
    const strokes = played(hosted(meterText('4/4'), w.bpm, byId(clave).text, coreKit), w.bpm, 32).hits;
    expect(both.hits).toEqual(sorted([...drums, ...strokes]));
    // (a line of its own with a sound of its own: the clave's note is none the drum bar strikes, so a shared step is two sounds, #140)
    expect(drums.filter((h) => h.note === 75)).toEqual([]);
  });
});

// Decision 054, rung 2 (#244): no rhythm carries a voice of its own. Every name a rhythm strikes (`&bd`, `&claves`) is a
// hole read only as a sound, which an instrument fills: the core kit, or the General MIDI kit. The eight drum bars' 30
// `&bd s=white …` lines, bare white noise standing in for a kick and a hat alike, and the five claves' `&claves` (the
// core kit's line word for word) are gone: 35 lines.
const STRUCK: Record<string, string[]> = {
  'Synth-pop drums': ['&bd', '&hh', '&sd'],
  'Techno drums': ['&bd', '&hh', '&oh', '&sd'],
  'Deep house drums': ['&bd', '&hh', '&sd'],
  'Ambient drums': ['&bd', '&hh', '&sd'],
  'Lo-fi hip hop drums': ['&bd', '&hh', '&rim', '&sd'],
  'Funk drums': ['&bd', '&hh', '&oh', '&rim', '&sd'],
  'Bossa nova drums': ['&bd', '&hh', '&rim', '&sd'],
  'Swing jazz drums': ['&bd', '&ph', '&rd', '&sd'],
};

describe('the rhythms’ holes (decision 054, rung 2)', () => {
  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s defines no voice, and every name it strikes is a sound hole', (id, text) => {
    expect(text.split('\n').filter((l) => / (s|loop)=/.test(l))).toEqual([]);
    const holes = holesOf(text, compileSource);
    expect(holes.uses).toEqual(STRUCK[id] ?? ['&claves']);
    expect(holes.sounds).toEqual(holes.uses);
  });

  it('is no line of the 35: the voice lines the rhythms carried are gone', () => {
    expect(Object.values(STRUCK).flat()).toHaveLength(30);
    expect(RHYTHM_FRAGMENTS.flatMap((f) => f.text.split('\n')).filter((l) => /^&\w+ s=/.test(l))).toEqual([]);
  });

  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s fits a workbench with a meter and no kit, and with the core kit, and the kit fills every hole', (_, text) => {
    expect(fitOf(text, hosted(meterText('4/4'), 120)).fits).toBe(true);
    const withKit = fitOf(text, hosted(meterText('4/4'), 120, coreKit));
    expect([withKit.fits, withKit.sounds]).toEqual([true, []]);
  });

  it.each(Object.keys(CLAVES))('%s with the core kit sounds identical (S1, the whole window) to the clave with its line written out', (id) => {
    const out = hosted(meterText('4/4'), 120, byId(id).text, coreKit);
    const was = hosted(meterText('4/4'), 120, byId(id).text.replace('&percussion', `&claves s=sine loop=D7 env=&(map=adsr 0 .06 0 .03)\n&percussion`));
    expect(soundsIdentical(was, out)).toBe(true);
  });
});

describe('where the rhythms are found', () => {
  const first = (point: StylePoint, ids = RHYTHM_FRAGMENTS.map((f) => f.id)) => rhythms.query(point, RHYTHM_FRAGMENTS.length).find((f) => ids.includes(f.fragment.id))!.fragment.id;

  it.each(Object.entries(PRESETS))('at %s, its drum bar first', (preset, { point }) => {
    expect(first(point)).toBe(`${preset} drums`);
  });

  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.association[0]!.point] as const))('%s is found first at its own point', (id, point) => {
    expect(first(point)).toBe(id);
  });

  it('the claves nearest Bossa nova are the bossa nova claves, the one-bar first; nearest Funk the rumba clave; the son clave 3-2 as near both', () => {
    const claves = Object.keys(CLAVES);
    expect(first(BOSSA_NOVA, claves)).toBe('bossa nova clave (one bar)');
    expect(first(BOSSA_NOVA, claves.slice(0, 4))).toBe('bossa nova clave');
    expect(first(FUNK, claves)).toBe('rumba clave 3-2');
    const son = byId('son clave 3-2');
    expect(rhythms.query(BOSSA_NOVA, 12).find((f) => f.fragment === son)!.distance).toBeCloseTo(rhythms.query(FUNK, 12).find((f) => f.fragment === son)!.distance, 12);
  });
});
