// The motifs and the forms (#294, #369): forty-six motifs, two at each of Jambot's ten presets, one at each point of a
// meter that had none, six general-purpose, four more near Spooky's, and the six lines of Twinkle and Hänschen klein, each a line over the key and a bar of its meter; six forms, each a braid
// of holes. Every form over every motif compiles over its motif's meter and a key with no diagnostic and plays its length
// in bars, through the lead performer; and recognition reads the answer of a call and answer as the call transposed two
// degrees down, by one operator.
import { describe, expect, it } from 'vitest';
import { compileSource as compiledWithOldUse } from '../engine/compile';
import { bodyOf } from '../engine/use';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { PITCHED_OPERATORS, variations } from '../engine/vary';
import { fitsAs } from './fit';
import { expand } from '../engine/use';
import type { Resolve } from '../engine/program';
import { createRepository, pointDistance, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { fromId, headOf, LIBRARY, ofFacet, resolveSeed } from './library';
import { newPoint } from '../engine/migrate/axes';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, KINDERLIED, SPOOKY, STYLES, stylePoint, SWING_JAZZ, SYNTH_POP, TECHNO } from './styles';
import { createRecogniser } from './recognise';
import { seedFragments } from './seed';

const MOTIF_FRAGMENTS = ofFacet('motif');
const FORM_FRAGMENTS = seedFragments('forms');

/** A fragment's text taken onto a workbench by its signature (`fitsAs`, decisions 065 and 075), as the fragment `x`, and written out (#588). */
const takenOn = (text: string, bench: string, main?: string) => {
  const resolve: Resolve = (id) => (id === 'x' ? text : resolveSeed(id));
  const fit = fitsAs('x', bench, { resolve, ...(main ? { main } : {}) });
  return { ...fit, union: { text: expand(fit.text, resolve) } };
};

// (these texts take fragments the old way, `use`, which still reads for a release and warns that it is the old way,
// decision 065: what is tested here is what it reads, so that warning is set aside; `from.test.ts` tests the new way)
const OLD_USE = /^use is the old way/;
const compileSource = (...args: Parameters<typeof compiledWithOldUse>): ReturnType<typeof compiledWithOldUse> => {
  const r = compiledWithOldUse(...args);
  const diagnostics = r.diagnostics.filter((d) => !OLD_USE.test(d.message));
  return { ...r, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
};

// (the points as they were placed, on the axes before decision 076, sync harm artic energy, held as the library holds
// them, moved by its rule, #572: bite their articulation, mood the style's they were placed for or the mode's found
// there, a form's none)
const held = (sync: number, harm: number, artic: number, energy: number): StylePoint => newPoint({ sync, harm, artic, energy });
const heldForm = (sync: number, harm: number, artic: number, energy: number): StylePoint => newPoint({ sync, harm, artic, energy }, false);
/** A point 0.1 higher in energy, on the axes then: 0.1 higher in bite now, its energy offset (#572); at a bite of 1, lower. */
const above = (p: StylePoint): StylePoint => ({ ...p, bite: Math.round((p.bite! < 1 ? p.bite! + 0.1 : p.bite! - 0.1) * 1000) / 1000 });
/** A point moved along bite by its energy offset from the point it was placed beside (decision 076's rule, #572). */
const offset = (p: StylePoint, bite: number): StylePoint => ({ ...p, bite: Math.round((p.bite! + bite) * 1000) / 1000 });
/** Each motif, the point it sits at, and the meter it is a bar of (4/4 where none is named). */
const MOTIFS: Record<string, { point: StylePoint; meter?: Meter; also?: readonly StylePoint[] }> = {
  hook: { point: SYNTH_POP },
  octaves: { point: TECHNO },
  sigh: { point: DEEP_HOUSE },
  rising: { point: AMBIENT },
  lazy: { point: LO_FI },
  riff: { point: FUNK },
  tresillo: { point: BOSSA_NOVA },
  bebop: { point: SWING_JAZZ },
  gypsy: { point: ELECTRO_SWING },
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
  waltzBar: { point: held(0, 0.7, 0.3, 0), meter: '3/4' },
  musicBox: { point: offset(held(0.2, 0.9, 0.3, 0.43), 0.08), meter: '3/4' },
  rocking: { point: held(0.3, 0.2, 0.2, 0), meter: '6/8' },
  sway: { point: offset(held(0.2, 0.9, 0.3, 0.27), -0.08), meter: '6/8' },
  fivefold: { point: held(0.4, 0.9, 0.5, 0.3), meter: '5/4' },
  limp: { point: held(0.8, 0.6, 1, 1), meter: '7/8' },
  dancer: { point: held(0.6, 0.9, 0.8, 0.9), meter: '10/8' },
  shuffle: { point: held(0.7, 0.6, 0, 0.2), meter: '12/8' },
  // (and at March's point, #542, so the style finds it first)
  march: { point: held(0, 0.1, 0.6, 1), meter: '2/4', also: [stylePoint('march')] },
  fanfare: { point: held(0.2, 0.6, 0.9, 1), meter: 'alla breve' },
  // (six general-purpose: the centre, and 0.2 from it on one axis each)
  // (a call, where call and answer's idiom is, its form's point, naming no mood: no longer at the centre, #540)
  question: { point: { sync: 0.75, harm: 0.35, bite: 0.65 } },
  reply: { point: held(0.5, 0.5, 0.5, 0.3) },
  arpeggio: { point: held(0.5, 0.3, 0.5, 0.5) },
  run: { point: held(0.5, 0.7, 0.5, 0.5) },
  neighbour: { point: held(0.5, 0.5, 0.3, 0.5) },
  leap: { point: held(0.5, 0.5, 0.7, 0.5) },
  // (four ghost-house idioms near Spooky's point, each 0.03 to 0.11 from it, nearer than the second, toll; wail 0.03 below in
  // bite, its energy offset's 0.05 on lament's point, #674)
  wail: { point: offset(held(0.2, 0.9, 0.3, 0.3), -0.03) },
  haunt: { point: held(0.15, 0.9, 0.25, 0.35) },
  lament: { point: held(0.2, 0.9, 0.25, 0.3) },
  peek: { point: held(0.3, 0.9, 0.3, 0.3) },
  // (read from the examples for the styles they stand for, #572: each at its style, the melodie 0.1 below Elektro in bite)
  raveHook: { point: stylePoint('happyHardcore') },
  sequencer: { point: stylePoint('elektro') },
  melodie: { point: { ...stylePoint('elektro'), bite: 0.75 } },
  ghostPhrase: { point: stylePoint('darkAmbient') },
  // (#542's first four styles' tunes, each at its style)
  royalTheme: { point: stylePoint('baroque') },
  bluesRiff: { point: stylePoint('bluesShuffle') },
  drunkenSailor: { point: stylePoint('seaShanty') },
  korobeinikiBar: { point: stylePoint('chiptune') },
  // (#542's second four: the two tunes written for the styles placed by hand, each at its style)
  guajeo: { point: stylePoint('salsa') },
  smoke: { point: stylePoint('tripHop') },
  // (two children's songs in pieces, their calls and answers, at the point proposed for a preset of them and 0.1 from it:
  // the parts Kinderlieder gives, decision 082, listed after the seed's motifs)
  'kinderlied/twinkle': { point: KINDERLIED },
  'kinderlied/wonder': { point: offset(held(0.1, 0.12, 0.5, 0.25), -0.1) },
  // (#674: 0.05 up in bite, between hinein and weinet; its energy offset's 0.1 was weinet's point)
  'kinderlied/haenschen': { point: offset(held(0.1, 0.12, 0.6, 0.45), 0.05) },
  'kinderlied/hinein': { point: held(0.1, 0.12, 0.6, 0.35) },
  // (placed by hand at bite .55, #572: its energy offset would have set it on Kinderlied's point, beside twinkle)
  'kinderlied/heim': { point: offset(held(0.1, 0.12, 0.6, 0.25), -0.05) },
  'kinderlied/weinet': { point: held(0.1, 0.12, 0.7, 0.45) },
};
/** Each form: its head, the hole it reads, its length in bars over a one-bar motif, and its point. */
const FORMS: Record<string, { head: string; hole: string; bars: number; point: StylePoint; weight?: number }> = {
  // (each where its idiom is, naming no mood: #371, the owner, 2026-11-09, "form follows idiom")
  call_and_answer: { head: 'phrase', hole: 'call', bars: 2, point: { sync: 0.75, harm: 0.35, bite: 0.65 } },
  sentence: { head: 'sentence', hole: 'call', bars: 4, point: { sync: 0.2, harm: 0.55, bite: 0.5 } },
  period: { head: 'period', hole: 'call', bars: 4, point: { sync: 0.15, harm: 0.4, bite: 0.3 } },
  AABA: { head: 'chorus', hole: 'a', bars: 4, point: { sync: 0.45, harm: 0.85, bite: 0.4 } },
  // (Twinkle's and Hänschen klein's, at their tunes' points, #371)
  ternary: { head: 'song', hole: 'call', bars: 6, point: { sync: KINDERLIED.sync!, harm: KINDERLIED.harm!, bite: KINDERLIED.bite! }, weight: 0.5 },
  rounded_binary: { head: 'song', hole: 'call', bars: 8, point: heldForm(0.1, 0.12, 0.6, 0.45), weight: 0.5 },
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
  'alla breve': { bench: '&bar meter("2/2", 2) step=120bpm', bar: 1 },
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
    `&${headOf(motif)} from ${fromId(motif)} &key`,
    `&${head} from ${/^\w+$/.test(form) ? form : `"${form}"`} &${hole}`,
    '&lead, &leadOut from lead_performer(leadLevel=&leadLevel) &leadline',
    benchOf(motif),
    `&${hole} step=8n &${headOf(motif)}`,
    `&leadline step=8n &${head}`,
    '&leadLevel map=amp .5',
    '&leadV s=sine loop=C4',
    '&out map=sample [&leadOut]',
  ].join('\n');
};

/** A motif's braid moved n degrees: each degree's number, its length and the rests kept. */
const moved = (braid: string, n: number) => braid.replace(/(^|\s)(-?\d+)/g, (_, space: string, d: string) => `${space}${Number(d) + n}`);

describe('the motifs', () => {
  it('are fifty-six, each a line over the key named for its fragment, at its point as the facet motif (the march at March’s too)', () => {
    expect(MOTIF_FRAGMENTS.map((f) => f.id)).toEqual(Object.keys(MOTIFS));
    for (const f of MOTIF_FRAGMENTS) {
      expect(bodyOf(f.text), f.id).toMatch(new RegExp(`^&${headOf(f.id)} over=&key step=8n `));
      expect(f.association, f.id).toEqual([MOTIFS[f.id]!.point, ...(MOTIFS[f.id]!.also ?? [])].map((point) => ({ point, weight: 1, facet: 'motif' })));
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual(['&key']);
    }
  });

  // (cells breaks a tie by id, so a second motif sits off the point: at it, the first is found first, alone at distance 0)
  // (0.1 off in bite, its energy offset since decision 076 (#572), one of four axes: 0.05 away, as it was)
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
  it('are call and answer, the sentence, the period and AABA where their idioms are, and the ternary and the rounded binary song at their tunes’ points, as the facet form', () => {
    expect(FORM_FRAGMENTS.map((f) => f.id)).toEqual(Object.keys(FORMS));
    for (const f of FORM_FRAGMENTS) {
      expect(f.association, f.id).toEqual([{ point: FORMS[f.id]!.point, weight: FORMS[f.id]!.weight ?? 1, facet: 'form' }]);
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual([`&${FORMS[f.id]!.hole}`]);
    }
  });

  // (#371: the four placed by idiom no longer tie at the centre, where a query found AABA first everywhere, by its id)
  it('are each found first at their own point, alone, and the four placed by idiom are at least 0.1 apart', () => {
    const repository = createRepository(LIBRARY);
    for (const [id, { point }] of Object.entries(FORMS)) {
      const [first, second] = repository.query(point, 2, {}, { facet: 'form' });
      expect([first!.fragment.id, first!.distance], id).toEqual([id, 0]);
      expect(second!.distance, id).toBeGreaterThan(0);
    }
    const four = ['call_and_answer', 'sentence', 'period', 'AABA'];
    for (const a of four) for (const b of four) if (a < b) expect(pointDistance(FORMS[a]!.point, FORMS[b]!.point), `${a}, ${b}`).toBeGreaterThanOrEqual(0.1);
  });

  // (the form each style finds first, by idiom: a change here changes the lead's form Jambot plays there, yggi/jambot#547 rung 4)
  it('are found first at each style of styles by its idiom, with no tie', () => {
    const repository = createRepository(LIBRARY);
    const found = Object.fromEntries(
      STYLES.map((s) => {
        const [first, second] = repository.query(s.point, 2, {}, { facet: 'form' });
        expect(second!.distance - first!.distance, s.id).toBeGreaterThan(0);
        return [s.id, first!.fragment.id];
      }),
    );
    expect(found).toEqual({
      synthPop: 'sentence',
      techno: 'sentence',
      deepHouse: 'sentence',
      ambient: 'period',
      lofi: 'AABA',
      funk: 'call_and_answer',
      bossaNova: 'AABA',
      swingJazz: 'AABA',
      electroSwing: 'AABA',
      spooky: 'AABA',
      kinderlied: 'ternary',
      acid: 'call_and_answer',
      happyHardcore: 'sentence',
      elektro: 'sentence',
      darkAmbient: 'period',
      baroque: 'sentence',
      bluesShuffle: 'call_and_answer',
      seaShanty: 'rounded_binary',
      chiptune: 'sentence',
      salsa: 'call_and_answer',
      waltz: 'sentence',
      march: 'rounded_binary',
      tripHop: 'call_and_answer',
    });
  });

  // (#314: a form's hole is a line, which a piece fills with a motif, not a sound an instrument fills)
  it('each read their hole as a line, not a sound: the fit asks for it, not for an instrument', () => {
    for (const f of FORM_FRAGMENTS) {
      const hole = `&${FORMS[f.id]!.hole}`;
      const h = holesOf(f.text, compileSource);
      expect([h.lines, h.sounds], f.id).toEqual([[hole], []]);
      const fit = takenOn(f.text, '');
      expect([fit.fits, fit.missing, fit.sounds], f.id).toEqual([false, [hole], []]);
      // (filled by a line, nothing is missing and no instrument asked for; its clock need is #322's)
      const filled = takenOn(f.text, `${BENCH}\n&gypsy from gypsy &key\n${hole} step=8n &gypsy`, hole);
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

  it('AABA’s bridge is a piece’s to give as its optional argument, with no diagnostic', () => {
    const text = piece('AABA', 'gypsy').replace('&chorus from AABA &a', '&chorus from AABA(b=&b) &a') + '\n&b step=8n &a^-3';
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
    expect([mine?.path.map((s) => s.by), mine?.distance]).toEqual([[`transpose &${headOf(id)} -2`], 0]);
    // (and the call itself is the motif, by no operator)
    const call = recogniser.recognise(`&heard over=&key step=8n ${braid}`, LIBRARY, { workbench: benchOf(id) }).find((r) => r.fragment.id === id);
    expect([call?.path, call?.distance]).toEqual([[], 0]);
  });
});
