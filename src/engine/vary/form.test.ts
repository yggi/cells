// Vary on a form and a song plan (decision 052, point 10; #51): the slot operators every level shares (rotate, reverse,
// swap, substitute) on the 6 seed forms' letters and the 7 seed song plans' sections, a song's plan of who plays carried
// slot for slot. Every variation compiles, splices other slots than its source and the others (a form's letters played
// as other notes), keeps its first and last slot, carries its partner, does what its operator says, and is given back by
// its `by:`. A frontend's mask (`fixed`) moves the anchors at every scale alike: a form's, a song's, a progression's.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileSource } from '../compile';
import { declWords } from '../edit';
import { flatten } from '../flatten';
import { codeShifts } from '../program';
import { resolveSeed } from '../../repository/library';
import { seedFragments } from '../../repository/seed';
import { FORM_OPERATORS, HARMONY_OPERATORS, PITCHED_OPERATORS, RHYTHM_OPERATORS, variationBy, variations, type Variation } from '.';

// (a form's holes filled by two motifs that differ in every note, so letters that splice differently play differently)
const FORM_BENCH = '&bar meter("4/4") step=120bpm\n&key scale(major, C)\n&a over=&key step=8n 0 2 4 2\n&call over=&key step=8n 7 5 3 1';
const SONG_BENCH = '&bar meter("4/4") step=120bpm\n&song .55';
const FORMS = seedFragments('forms').map((f) => ({ ...f, bench: FORM_BENCH }));
const SONGS = seedFragments('songs').map((f) => ({ ...f, bench: SONG_BENCH }));
/**
 * How many of the 186 have a reference: those whose forms written are no longer than the lines written out. The other
 * 6 are rotations and retrogrades that change every inner slot (AABA's rotation, A B A A, `base=&chorus = &b &a` beside
 * `&chorus step=8n &a &b &a &a`).
 */
const REFERRED = 180;
const OPTIONS = (bench: string) => ({ workbench: bench, operators: FORM_OPERATORS, resolve: resolveSeed });

/**
 * Each seed's variations: 186 in all, 42 of the forms and 144 of the songs. A form of two letters has none: both are
 * anchors. The rounded binary's bridge moved up (`&bridge^1`) plays its close (`&call^-2`): a slot given either is one.
 */
const COUNTS: Record<string, number> = {
  call_and_answer: 0,
  sentence: 2,
  period: 0,
  AABA: 3,
  ternary: 12,
  rounded_binary: 25,
  verse_chorus: 31,
  build_drop: 37,
  groove_breakdown: 17,
  head_solos_head: 18,
  strophic: 8,
  vamp: 30,
  binary: 3,
};

const compiled = (bench: string, text: string) => {
  const result = compileSource(`${bench}\n${text}`, undefined, { resolve: resolveSeed });
  if (!result.ok) throw new Error(`does not compile:\n${text}`);
  return result;
};

/** A form's notes as it plays them: each note's onset, length and degree. */
const played = (bench: string, text: string, cell: string) => {
  const result = compiled(bench, text);
  return flatten(result, cell, codeShifts(result))
    .map((e) => `${e.step}:${e.duration}:${e.value}`)
    .join(' ');
};

/** A cell's slots as written in a text. */
const slotsOf = (text: string, cell: string) => declWords(text, cell)!.braid;

describe('Vary on a form and a song plan (decision 052, point 10)', () => {
  for (const { id, text, bench } of [...FORMS, ...SONGS])
    describe(id, () => {
      const all = variations(text, OPTIONS(bench));

      it(`gives ${COUNTS[id]} variations, each compiling and given back by its by:`, () => {
        expect(all.length).toBe(COUNTS[id]);
        for (const v of all) {
          compiled(bench, v.apply(text));
          expect(variationBy(text, v.by, OPTIONS(bench))?.after, v.by).toBe(v.after);
        }
      });

      it('splices other slots than its source and the others; a form plays other notes', () => {
        const seen = new Set([variationKey(text, all[0])]);
        for (const v of all) {
          const key = variationKey(v.apply(text), v);
          expect(seen.has(key), v.by).toBe(false);
          seen.add(key);
        }
        if (bench === FORM_BENCH) {
          const heard = new Set<string>();
          for (const v of all) {
            const cell = v.line.slice(1);
            heard.add(played(bench, text, cell));
            const notes = played(bench, v.apply(text), cell);
            expect(heard.has(notes), v.by).toBe(false);
            heard.add(notes);
          }
        }
      });

      it('keeps its first and last slot, carries its partner, and does what its operator says', () => {
        for (const v of all) check(v, text);
      });
    });

  // (each fragment's in under 15 ms: a wall-clock ceiling, in `timing.slow.test.ts`)
  it('gives 186 in all', () => {
    let n = 0;
    for (const { text, bench } of [...FORMS, ...SONGS]) n += variations(text, OPTIONS(bench)).length;
    expect(n).toBe(186);
  });

  it('leaves a form be where only the line operators are asked', () => {
    for (const { text, bench } of [...FORMS, ...SONGS])
      for (const operators of [RHYTHM_OPERATORS, PITCHED_OPERATORS]) expect(variations(text, { ...OPTIONS(bench), operators })).toEqual([]);
  });
});

describe("a form's variation by reference", () => {
  it('plays what its variation plays, read beside its source, its partner beside it: each of the 186 that has one', () => {
    let n = 0;
    let referred = 0;
    for (const { id, text, bench } of [...FORMS, ...SONGS])
      for (const v of variations(text, OPTIONS(bench))) {
        n++;
        const ref = v.reference;
        if (!ref) continue;
        referred++;
        const cells = v.after.split('\n').map((l) => l.split(' ')[0]!.slice(1));
        expect(ref.form, `${id} ${v.by}`).toMatch(new RegExp(`^base=&${cells[0]} `));
        const kept = [text, ref.line('varied'), ...(ref.partner ? [ref.partner.line('variedPartner')] : [])].join('\n');
        expect(played(bench, kept, 'varied'), `${id} ${v.by}`).toBe(played(bench, v.apply(text), cells[0]!));
        if (cells[1]) expect(played(bench, kept, 'variedPartner'), `${id} ${v.by}`).toBe(played(bench, v.apply(text), cells[1]));
      }
    expect([n, referred]).toEqual([186, REFERRED]);
  });

  it('writes only the slots it changes', () => {
    const AABA = FORMS.find((f) => f.id === 'AABA')!;
    expect(variationBy(AABA.text, 'substitute &chorus 1 2', OPTIONS(FORM_BENCH))!.reference?.form).toBe('base=&chorus = &b');
    const song = SONGS.find((f) => f.id === 'verse_chorus')!;
    const ref = variationBy(song.text, 'swap &verseChorus 1', OPTIONS(SONG_BENCH))!.reference!;
    expect([ref.form, ref.partner?.of, ref.partner?.form]).toEqual([
      'base=&verseChorus = &chorus &verse',
      '&verseChorusPlays',
      'base=&verseChorusPlays = &chorusPlays &versePlays',
    ]);
  });
});

describe('the slot operators, one set at every scale', () => {
  const AABA = FORMS.find((f) => f.id === 'AABA')!;
  const bys = (text: string, bench: string, fixed?: Record<string, readonly number[]>) => variations(text, { ...OPTIONS(bench), ...(fixed ? { fixed } : {}) }).map((v) => v.by);

  it('AABA: its inner letters turned, and each given the other letter; its first and last A kept', () => {
    expect(bys(AABA.text, FORM_BENCH)).toEqual(['rotate &chorus', 'substitute &chorus 1 2', 'substitute &chorus 2 0']);
    expect(variationBy(AABA.text, 'rotate &chorus', OPTIONS(FORM_BENCH))!.after).toBe('&chorus step=8n &a &b &a &a');
    expect(variationBy(AABA.text, 'substitute &chorus 1 2', OPTIONS(FORM_BENCH))!.after).toBe('&chorus step=8n &a &b &b &a');
  });

  it('a mask moves the anchors: AABA with none fixed, or with its first two', () => {
    // (with none fixed its swap of the second and third letters, A B A A, is its retrograde, given first)
    expect(bys(AABA.text, FORM_BENCH, { '&chorus': [] })).toEqual([
      'rotate &chorus',
      'reverse &chorus',
      'substitute &chorus 0 2',
      'substitute &chorus 1 2',
      'substitute &chorus 2 0',
      'substitute &chorus 3 2',
    ]);
    // (its first two letters and its last fixed, the B alone is free: given the A, A A A A)
    expect(bys(AABA.text, FORM_BENCH, { chorus: [0, 1, -1] })).toEqual(['substitute &chorus 2 0']);
  });

  it('a song plan swaps two sections, who plays them carried with them', () => {
    const song = SONGS.find((f) => f.id === 'verse_chorus')!;
    const v = variationBy(song.text, 'swap &verseChorus 1', OPTIONS(SONG_BENCH))!;
    expect(slotsOf(v.apply(song.text), 'verseChorus')).toEqual(['&intro', '&chorus', '&verse', '&verse', '&chorus', '&bridge', '&chorus', '&outro']);
    expect(slotsOf(v.apply(song.text), 'verseChorusPlays')).toEqual([
      '&introPlays',
      '&chorusPlays',
      '&versePlays',
      '&versePlays',
      '&chorusPlays',
      '&bridgePlays',
      '&chorusPlays',
      '&outroPlays',
    ]);
  });

  it('the same mask on a progression: its first and last bar fixed, as a form’s, in place of its cadence', () => {
    const text = '&harm over=&key step=1m cycle=4 [0,2,4] [5,7,9] [3,5,7] [4,6,8]';
    const bench = '&bar meter("4/4") step=120bpm\n&key scale(major, C)';
    const options = { workbench: bench, operators: ['rotate', 'reverse', 'swap', 'substitute'] as const, fixed: { '&harm': [0, -1] } };
    const asForm = variations(text, { ...options, operators: [...options.operators] }).map((v) => v.by);
    // (its two inner bars turned are the two swapped: one variation)
    expect(asForm).toEqual([
      'rotate &harm',
      'substitute &harm 1 0',
      'substitute &harm 1 2',
      'substitute &harm 1 3',
      'substitute &harm 2 0',
      'substitute &harm 2 1',
      'substitute &harm 2 3',
    ]);
    // (with its cadence, the default, the first bar may move and the last may not)
    expect(variations(text, { workbench: bench, operators: HARMONY_OPERATORS }).some((v) => v.by === 'swap &harm 0')).toBe(true);
  });
});

describe("decision 052's point 10, its examples", () => {
  const DECISION = resolve(import.meta.dirname, '../../../docs/decisions/052-variations-as-operators.md');
  const point = readFileSync(DECISION, 'utf8').split('\n### 10.')[1]!.split('\n## Why')[0]!;
  const blocks = [...point.matchAll(/^```cells\n([\s\S]*?)^```/gm)].map((m) => m[1]!.trimEnd().split('\n'));
  const parts = (lines: readonly string[]) => {
    const blank = lines.indexOf('');
    return { bench: lines.slice(1, blank).join('\n'), fragment: lines.slice(blank + 1).join('\n') };
  };

  it('are a source and two variations, each what variationBy writes for its by:, compiling with no error', () => {
    const [source, ...rest] = blocks;
    expect(source![0]).toMatch(/^# source:/);
    expect(rest.map((b) => b[0])).toEqual(['# by: rotate &chorus', '# by: substitute &chorus 1 2']);
    const { bench, fragment } = parts(source!);
    for (const b of [source!, ...rest]) expect(compileSource(b.slice(1).join('\n')).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const b of rest) {
      const by = b[0]!.slice('# by: '.length);
      expect(variationBy(fragment, by, OPTIONS(bench))?.apply(fragment), by).toBe(parts(b).fragment);
    }
  });
});

/** What a variation splices: the slots of the line it varies, and its partner's. */
function variationKey(text: string, v: Variation | undefined): string {
  if (!v) return '';
  return v.after
    .split('\n')
    .map((l) => slotsOf(text, l.split(' ')[0]!.slice(1)).join(' '))
    .join('|');
}

/** Its first and last slot kept, its partner moved slot for slot with it, and what its operator says done. */
function check(v: Variation, text: string) {
  const cells = v.after.split('\n').map((l) => l.split(' ')[0]!.slice(1));
  const [before, after] = [slotsOf(text, cells[0]!), slotsOf(v.apply(text), cells[0]!)];
  const n = before.length;
  expect([after[0], after[n - 1]], v.by).toEqual([before[0], before[n - 1]]);
  // (where each slot came from, by the line it varies; its partner's slots came from the same places)
  const [operator, , ...amounts] = v.by.split(' ');
  const [i, j] = amounts.map(Number) as [number, number];
  if (operator === 'swap') expect([after[i], after[i + 1]], v.by).toEqual([before[i + 1], before[i]]);
  else if (operator === 'substitute') expect(after[i], v.by).toBe(before[j]);
  else if (operator === 'reverse') expect(after.slice(1, -1), v.by).toEqual(before.slice(1, -1).reverse());
  else if (operator === 'rotate') expect(after.slice(1, -1), v.by).toEqual([before[n - 2], ...before.slice(1, -2)]);
  if (cells[1]) {
    const [pb, pa] = [slotsOf(text, cells[1]), slotsOf(v.apply(text), cells[1])];
    const pairOf = new Map(before.map((s, k) => [s, pb[k]]));
    expect(pa, v.by).toEqual(after.map((s) => pairOf.get(s)));
  }
}
