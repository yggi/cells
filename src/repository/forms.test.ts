// The motifs and the forms (#294): nine motifs, eight at Jambot's presets and the electroswing example's call, each a line
// over the key; four forms, each a braid of holes. Every form over every motif compiles over a meter and a key with no
// diagnostic and plays its length in bars, through the lead performer; and recognition reads the answer of a call and
// answer as the call transposed two degrees down, by one operator.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { PITCHED_OPERATORS, variations } from '../engine/vary';
import { FORM_FRAGMENTS } from './forms';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed } from './library';
import { MOTIF_FRAGMENTS } from './motifs';
import { at, AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { createRecogniser } from './recognise';

/** The point proposed for an Electro swing preset, as the electroswing seeds' files write it: no preset of Jambot's (decision 041). */
const PROPOSED = at(0.55, 0.75, 0.6, 0.75);
/** Each motif and the point it sits at. */
const MOTIFS = { hook: SYNTH_POP, octaves: TECHNO, sigh: DEEP_HOUSE, rising: AMBIENT, lazy: LO_FI, riff: FUNK, tresillo: BOSSA_NOVA, bebop: SWING_JAZZ, gypsy: PROPOSED };
/** Each form: its head, the hole it reads, and its length in bars over a one-bar motif. */
const FORMS: Record<string, { head: string; hole: string; bars: number }> = {
  'call and answer': { head: 'phrase', hole: 'call', bars: 2 },
  sentence: { head: 'sentence', hole: 'call', bars: 4 },
  period: { head: 'period', hole: 'call', bars: 4 },
  AABA: { head: 'chorus', hole: 'a', bars: 4 },
};

const BAR = 2; // (seconds: 4/4 at 120 bpm)
const BENCH = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
const seed = { resolve: resolveSeed };

/** A form over a motif, as a piece writes it: the motif as the form's hole, the form as the lead's line. */
const piece = (form: string, motif: string) => {
  const { head, hole } = FORMS[form]!;
  return [
    `use &${motif}`,
    `use &${head} from ${/^\w+$/.test(form) ? form : `"${form}"`}`,
    'use &lead, &leadV from "lead performer"',
    BENCH,
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
  it('are nine, each a line over the key named for its fragment, at its point as the facet motif', () => {
    expect(MOTIF_FRAGMENTS.map((f) => f.id)).toEqual(Object.keys(MOTIFS));
    for (const f of MOTIF_FRAGMENTS) {
      expect(f.text, f.id).toMatch(new RegExp(`^&${f.id} over=&key step=8n `));
      expect(f.association, f.id).toEqual([{ point: MOTIFS[f.id as keyof typeof MOTIFS], weight: 1, facet: 'motif' }]);
      expect(holesOf(f.text, compileSource).uses, f.id).toEqual(['&key']);
    }
  });

  it('are each varied by the pitched operators, held notes and all: transpose and invert keep every note’s place and length', () => {
    for (const f of MOTIF_FRAGMENTS) {
      const by = variations(f.text, { workbench: BENCH, operators: PITCHED_OPERATORS }).map((v) => v.by.split(' ')[0]);
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

  // (#294's bound: each of the four forms over each motif, 2 to 8 bars, with no diagnostic)
  for (const form of Object.keys(FORMS))
    it(`${form} over each motif compiles with no diagnostic and plays ${FORMS[form]!.bars} bars`, () => {
      for (const motif of Object.keys(MOTIFS)) {
        const r = compileSource(piece(form, motif), undefined, seed);
        expect(r.diagnostics, motif).toEqual([]);
        const events = eventsBetween(plan(r, codeShifts(r)), 0, 16 * BAR);
        // (its lap: the line comes round after its bars, so the first notes play again there)
        const firsts = events.filter((e) => e.at < BAR).map((e) => `${e.at.toFixed(3)} ${e.freq.toFixed(2)}`);
        const again = events.filter((e) => e.at >= FORMS[form]!.bars * BAR && e.at < (FORMS[form]!.bars + 1) * BAR);
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
    const braid = text.replace(/^&\w+ over=&key step=8n /, '');
    const heard = `&heard over=&key step=8n ${moved(braid, -2)}`;
    const found = recogniser.recognise(heard, LIBRARY, { workbench: BENCH });
    const mine = found.find((r) => r.fragment.id === id);
    expect([mine?.path.map((s) => s.by), mine?.distance]).toEqual([[`transpose &${id} -2`], 0]);
    // (and the call itself is the motif, by no operator)
    const call = recogniser.recognise(`&heard over=&key step=8n ${braid}`, LIBRARY, { workbench: BENCH }).find((r) => r.fragment.id === id);
    expect([call?.path, call?.distance]).toEqual([[], 0]);
  });
});
