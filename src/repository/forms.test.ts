// The motifs and the forms (#294, #369): thirty-six motifs, two at each of Jambot's ten presets, one at each point of a
// meter that had none, and six general-purpose, each a line over the key and a bar of its meter; four forms, each a braid
// of holes. Every form over every motif compiles over its motif's meter and a key with no diagnostic and plays its length
// in bars, through the lead performer; and recognition reads the answer of a call and answer as the call transposed two
// degrees down, by one operator.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { bodyOf } from '../engine/use';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { PITCHED_OPERATORS, variations } from '../engine/vary';
import { FORM_FRAGMENTS } from './forms';
import { fitOf } from './fit';
import { createRepository, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed } from './library';
import { MOTIF_FRAGMENTS } from './motifs';
import { at, AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { createRecogniser } from './recognise';

/** The point proposed for an Electro swing preset, as the electroswing seeds' files write it: no preset of Jambot's (decision 041). */
const PROPOSED = at(0.55, 0.75, 0.6, 0.75);
/** A point 0.1 higher in energy, to the hundredth. */
const above = (p: StylePoint): StylePoint => ({ ...p, energy: Math.round((p.energy + 0.1) * 100) / 100 });
/** Each motif, the point it sits at, and the meter it is a bar of (4/4 where none is named). */
const MOTIFS: Record<string, { point: StylePoint; meter?: Meter }> = {
  hook: { point: SYNTH_POP },
  octaves: { point: TECHNO },
  sigh: { point: DEEP_HOUSE },
  rising: { point: AMBIENT },
  lazy: { point: LO_FI },
  riff: { point: FUNK },
  tresillo: { point: BOSSA_NOVA },
  bebop: { point: SWING_JAZZ },
  gypsy: { point: PROPOSED },
  diesIrae: { point: SPOOKY },
  // (#369: a second near each preset's point, 0.1 higher in energy, so a query at the point finds the first first)
  refrain: { point: above(SYNTH_POP) },
  pulse: { point: above(TECHNO) },
  soul: { point: above(DEEP_HOUSE) },
  drift: { point: above(AMBIENT) },
  dusty: { point: above(LO_FI) },
  slap: { point: above(FUNK) },
  saudade: { point: above(BOSSA_NOVA) },
  blue: { point: above(SWING_JAZZ) },
  lindy: { point: above(ELECTRO_SWING) },
  toll: { point: above(SPOOKY) },
  // (one at each point of a meter with none, a bar of it)
  waltz: { point: at(0, 0.7, 0.3, 0), meter: '3/4' },
  musicBox: { point: at(0.2, 0.9, 0.3, 0.43), meter: '3/4' },
  rocking: { point: at(0.3, 0.2, 0.2, 0), meter: '6/8' },
  sway: { point: at(0.2, 0.9, 0.3, 0.27), meter: '6/8' },
  fivefold: { point: at(0.4, 0.9, 0.5, 0.3), meter: '5/4' },
  limp: { point: at(0.8, 0.6, 1, 1), meter: '7/8' },
  dancer: { point: at(0.6, 0.9, 0.8, 0.9), meter: '10/8' },
  shuffle: { point: at(0.7, 0.6, 0, 0.2), meter: '12/8' },
  march: { point: at(0, 0.1, 0.6, 1), meter: '2/4' },
  fanfare: { point: at(0.2, 0.6, 0.9, 1), meter: 'alla breve' },
  // (six general-purpose: the centre, and 0.2 from it on one axis each)
  question: { point: at(0.5, 0.5, 0.5, 0.5) },
  reply: { point: at(0.5, 0.5, 0.5, 0.3) },
  arpeggio: { point: at(0.5, 0.3, 0.5, 0.5) },
  run: { point: at(0.5, 0.7, 0.5, 0.5) },
  neighbour: { point: at(0.5, 0.5, 0.3, 0.5) },
  leap: { point: at(0.5, 0.5, 0.7, 0.5) },
};
/** Each form: its head, the hole it reads, and its length in bars over a one-bar motif. */
const FORMS: Record<string, { head: string; hole: string; bars: number }> = {
  'call and answer': { head: 'phrase', hole: 'call', bars: 2 },
  sentence: { head: 'sentence', hole: 'call', bars: 4 },
  period: { head: 'period', hole: 'call', bars: 4 },
  AABA: { head: 'chorus', hole: 'a', bars: 4 },
};

type Meter = '4/4' | '3/4' | '6/8' | '5/4' | '7/8' | '10/8' | '12/8' | '2/4' | 'alla breve';
/** Each meter's bench at 120 bpm, and its bar in seconds there. */
const METERS: Record<Meter, { bench: string; bar: number }> = {
  '4/4': { bench: '&bar meter("4/4") step=120bpm', bar: 2 },
  '3/4': { bench: '&bar meter("3/4") step=120bpm', bar: 1.5 },
  '6/8': { bench: '&bar meter("6/8") step=120bpm', bar: 1 },
  '5/4': { bench: '&bar meter("5/4") step=120bpm', bar: 2.5 },
  '7/8': { bench: '&bar meter("7/8") step=120bpm', bar: 1.5 },
  '10/8': { bench: '&bar meter("10/8") step=120bpm', bar: 2 },
  '12/8': { bench: '&bar meter("12/8") step=120bpm', bar: 2 },
  '2/4': { bench: '&bar meter("2/4") step=120bpm', bar: 1 },
  'alla breve': { bench: '&bar meter("4/4") step=120bpm beat=2', bar: 1 },
};
const KEY = '&key scale(major, C)';
const BENCH = `${METERS['4/4'].bench}\n${KEY}`;
/** A motif's bench: its meter's and the key. */
const benchOf = (motif: string) => `${METERS[MOTIFS[motif]!.meter ?? '4/4'].bench}\n${KEY}`;
const seed = { resolve: resolveSeed };

/** A form over a motif, as a piece writes it: the motif as the form's hole, the form as the lead's line. */
const piece = (form: string, motif: string) => {
  const { head, hole } = FORMS[form]!;
  return [
    `use &${motif}`,
    `use &${head} from ${/^\w+$/.test(form) ? form : `"${form}"`}`,
    'use &lead, &leadV from "lead performer"',
    benchOf(motif),
    `&${hole} step=8n &${motif}`,
    `&leadline step=8n &${head}`,
    '&leadLevel map=amp .5',
    '&leadV s=sine loop=C4',
    '&out map=sample [&leadOut]',
  ].join('\n');
};

/** A motif's braid moved n degrees: each degree's number, its length and the rests kept. */
const moved = (braid: string, n: number) => braid.replace(/(^|\s)(-?\d+)/g, (_, space: string, d: string) => `${space}${Number(d) + n}`);

describe('the motifs', () => {
  it('are thirty-six, each a line over the key named for its fragment, at its point as the facet motif', () => {
    expect(MOTIF_FRAGMENTS.map((f) => f.id)).toEqual(Object.keys(MOTIFS));
    for (const f of MOTIF_FRAGMENTS) {
      expect(bodyOf(f.text), f.id).toMatch(new RegExp(`^&${f.id} over=&key step=8n `));
      expect(f.association, f.id).toEqual([{ point: MOTIFS[f.id]!.point, weight: 1, facet: 'motif' }]);
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual(['&key']);
    }
  });

  // (cells breaks a tie by id, so a second motif sits off the point: at it, the first is found first, alone at distance 0)
  it('find each preset’s first motif first at its point, alone at distance 0, and its second 0.05 away', () => {
    const motifs = createRepository(MOTIF_FRAGMENTS);
    const firsts = Object.keys(MOTIFS).slice(0, 10);
    const seconds = Object.keys(MOTIFS).slice(10, 20);
    firsts.forEach((id, i) => {
      const found = motifs.query(MOTIFS[id]!.point, 36, {}, { facet: 'motif' });
      expect(found[0]!.fragment.id, id).toBe(id);
      expect(found.filter((f) => f.distance === 0).length, id).toBe(1);
      expect(found.find((f) => f.fragment.id === seconds[i])!.distance, seconds[i]).toBeCloseTo(0.05, 9);
    });
  });

  it('are each varied by the pitched operators, held notes and all: transpose and invert keep every note’s place and length', () => {
    for (const f of MOTIF_FRAGMENTS) {
      const by = variations(f.text, { workbench: benchOf(f.id), operators: PITCHED_OPERATORS }).map((v) => v.by.split(' ')[0]);
      expect(by, f.id).toContain('transpose');
      if (f.text.includes('@')) expect(new Set(by), f.id).toEqual(new Set(['transpose', 'invert']));
    }
  });
});

describe('the forms', () => {
  it('are call and answer, the sentence, the period and AABA, at the centre of style space as the facet form', () => {
    expect(FORM_FRAGMENTS.map((f) => f.id)).toEqual(Object.keys(FORMS));
    for (const f of FORM_FRAGMENTS) {
      expect(f.association, f.id).toEqual([{ point: { sync: 0.5, harm: 0.5, artic: 0.5, energy: 0.5 }, weight: 1, facet: 'form' }]);
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual([`&${FORMS[f.id]!.hole}`]);
    }
  });

  // (#314: a form's hole is a line, which a piece fills with a motif, not a sound an instrument fills)
  it('each read their hole as a line, not a sound: the fit asks for it, not for an instrument', () => {
    for (const f of FORM_FRAGMENTS) {
      const hole = `&${FORMS[f.id]!.hole}`;
      const h = holesOf(f.text, compileSource);
      expect([h.lines, h.sounds], f.id).toEqual([[hole], []]);
      const fit = fitOf(f.text, BENCH);
      expect([fit.fits, fit.missing, fit.sounds], f.id).toEqual([false, [hole], []]);
      // (filled by a line, nothing is missing and no instrument asked for; its clock need is #322's)
      const filled = fitOf(f.text, `${BENCH}\nuse &gypsy\n${hole} step=8n &gypsy`, undefined, resolveSeed);
      expect([filled.missing, filled.sounds, filled.diagnostics], f.id).toEqual([[], [], []]);
    }
  });

  // (#294's bound: each of the four forms over each motif, 2 to 8 bars, with no diagnostic)
  for (const form of Object.keys(FORMS))
    it(`${form} over each motif compiles with no diagnostic and plays ${FORMS[form]!.bars} bars`, () => {
      for (const motif of Object.keys(MOTIFS)) {
        const BAR = METERS[MOTIFS[motif]!.meter ?? '4/4'].bar;
        const r = compileSource(piece(form, motif), undefined, seed);
        expect(r.diagnostics, motif).toEqual([]);
        const events = eventsBetween(plan(r, codeShifts(r)), 0, 16 * BAR);
        // (its lap: the line comes round after its bars, so the first notes play again there)
        // (a microsecond's margin: an eighth of 7/8 is 3/14 s, so a bar's end lands a rounding either side)
        const firsts = events.filter((e) => e.at < BAR - 1e-6).map((e) => `${e.at.toFixed(3)} ${e.freq.toFixed(2)}`);
        const again = events.filter((e) => e.at >= FORMS[form]!.bars * BAR - 1e-6 && e.at < (FORMS[form]!.bars + 1) * BAR - 1e-6);
        expect(
          again.map((e) => `${(e.at - FORMS[form]!.bars * BAR).toFixed(3)} ${e.freq.toFixed(2)}`),
          motif,
        ).toEqual(firsts);
        expect(Math.max(...events.filter((e) => e.at < FORMS[form]!.bars * BAR).map((e) => e.at)), motif).toBeGreaterThan((FORMS[form]!.bars - 1) * BAR);
      }
    });

  it('AABA’s bridge is a piece’s to override by naming it, with no diagnostic', () => {
    const text = piece('AABA', 'gypsy').replace('use &chorus from AABA', 'use &chorus, &b from AABA') + '\n&b step=8n &a^-3';
    expect(compileSource(text, undefined, seed).diagnostics).toEqual([]);
  });
});

describe('recognition reads an answer as an operator on its call (#294)', () => {
  const recogniser = createRecogniser();
  it.each(MOTIF_FRAGMENTS.map((f) => [f.id, f.text] as const))('the answer of %s, two degrees down, is the motif transposed by -2', (id, text) => {
    const braid = bodyOf(text).replace(/^&\w+ over=&key step=8n /, '');
    const heard = `&heard over=&key step=8n ${moved(braid, -2)}`;
    const found = recogniser.recognise(heard, LIBRARY, { workbench: benchOf(id) });
    const mine = found.find((r) => r.fragment.id === id);
    expect([mine?.path.map((s) => s.by), mine?.distance]).toEqual([[`transpose &${id} -2`], 0]);
    // (and the call itself is the motif, by no operator)
    const call = recogniser.recognise(`&heard over=&key step=8n ${braid}`, LIBRARY, { workbench: benchOf(id) }).find((r) => r.fragment.id === id);
    expect([call?.path, call?.distance]).toEqual([[], 0]);
  });
});
