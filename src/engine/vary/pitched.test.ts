// Vary's pitched operators (decision 052, rung 2; #208, yggi/jambot#423): on the five bass seeds (#211), each on its own
// workbench, every variation plays other notes than its source and the others, keeps the root on each chord change, its
// holes and every line but its own, and plays on its other notes what the language's own form plays: `&x^n` for each n,
// `degree(inverse(&x), 2f)`, the retrograde within each span between anchors, the note before the last moved `^n` on
// the last (bend, #267), the last left out (trim). Of the 30 (5 × 6) the first three give, 24, the 6 left out playing
// their source's notes; bend and trim add 20 more, the root bass's 4 bends each one of its transpositions.
import { describe, expect, it, vi } from 'vitest';
import { compileSource } from '../compile';
import { planOf } from '../host';
import { channelTable, midiNote, router, routesOf } from '../midi';
import { playsSameNotes } from '../sameness';
import { windowAt } from '../schedule';
import { unionOf } from '../../repository/fit';
import { holesOf } from '../../repository/holes';
import { BASS_FRAGMENTS } from '../../repository/bass';
import { INSTRUMENT_FRAGMENTS } from '../../repository/instruments';
import { anchorsOf, PITCHED_OPERATORS, readVariations, variations, varied } from '.';

vi.mock('../compile', async (original) => {
  const actual = await original<typeof import('../compile')>();
  return { ...actual, compileSource: vi.fn(actual.compileSource) };
});

// The bass seeds' workbenches (`src/repository/bass.test.ts`): 4/4 at 120 bpm in C major, one chord a bar.
// (the bass lines leave `&bassV`, their voice, as a hole: the bass instrument fills it, #244)
const HOST = `&bar meter("4/4") step=120bpm\n&key scale(major, C)\n${INSTRUMENT_FRAGMENTS.find((f) => f.id === 'bass')!.text}`;
const PROGRESSIONS: Record<string, { harm: string; bars: number }> = {
  'I–vi–IV–V': { harm: '&harm over=key step=1m [0,2,4] [5,7,9] [3,5,7] [4,6,8]', bars: 4 },
  'ii–V–I': { harm: '&harm over=key step=1m [1,3,5,7] [4,6,8,10] [0,2,4,6]', bars: 3 },
};
const OPTIONS = (name: string) => ({ workbench: `${HOST}\n${PROGRESSIONS[name]!.harm}`, operators: PITCHED_OPERATORS });
const SEEDS = BASS_FRAGMENTS.map((f) => ({ id: f.id, fragment: f.text }));

/** Each seed's variations, as `by` names them, on either workbench: 24 of the first three's 30, the rest playing their source's notes; then the bends and the trim. */
const ENDS = (last: number) => ['bend &bass -2', 'bend &bass -1', 'bend &bass 1', 'bend &bass 2', `trim &bass ${last}`];
const EXPECTED: Record<string, readonly string[]> = {
  'root bass': ['transpose &bass -2', 'transpose &bass -1', 'transpose &bass 1', 'transpose &bass 2'],
  'pumping bass': ['transpose &bass -2', 'transpose &bass -1', 'transpose &bass 1', 'transpose &bass 2', 'reverse &bass', ...ENDS(7)],
  'eighths bass': ['transpose &bass -2', 'transpose &bass -1', 'transpose &bass 1', 'transpose &bass 2', ...ENDS(7)],
  'funk bass': ['transpose &bass -2', 'transpose &bass -1', 'transpose &bass 1', 'transpose &bass 2', 'reverse &bass', ...ENDS(14)],
  'walking bass': ['transpose &bass -2', 'transpose &bass -1', 'transpose &bass 1', 'transpose &bass 2', 'invert &bass', 'reverse &bass', ...ENDS(3)],
};
/** Each seed's line: its tap and its lap in steps, and its anchored steps (the root on the downbeat, where each chord changes). */
const LINE: Record<string, { tap: string; steps: number; anchored: readonly number[] }> = {
  'root bass': { tap: '2n', steps: 2, anchored: [0] },
  'pumping bass': { tap: '8n', steps: 8, anchored: [] },
  'eighths bass': { tap: '8n', steps: 8, anchored: [0] },
  'funk bass': { tap: '16n', steps: 16, anchored: [0] },
  'walking bass': { tap: '4n', steps: 4, anchored: [0] },
};

/** What a text sends on channel 2 over `bars` bars of 4/4 at 120 bpm: each note's sixteenth from the start, and its MIDI note. */
function played(text: string, bars: number): Map<number, number[]> {
  const plan = planOf(text);
  const sixteenth = 60 / 120 / 4;
  const route = router(plan.result, channelTable(plan.result));
  const out = new Map<number, number[]>();
  for (const e of windowAt(plan, 0, bars * 16 * sixteenth - 1e-9).events)
    for (const r of routesOf(route(e))) {
      const note = midiNote(e, r);
      if (!note || note.channel !== 2) continue;
      const at = Math.round(note.at / sixteenth);
      out.set(
        at,
        [...(out.get(at) ?? []), note.note].sort((a, b) => a - b),
      );
    }
  return out;
}

/** The text with its card playing a form of `&bass` instead (`&t step=<tap> <form>`): the language's own reading of an operator. */
const asForm = (text: string, tap: string, form: string) => text.replace('[&bass * &bassV]', '[&t * &bassV]') + `\n&t step=${tap} ${form}`;

for (const name of Object.keys(PROGRESSIONS)) {
  const options = OPTIONS(name);
  const bars = 2 * PROGRESSIONS[name]!.bars;
  describe(`the bass seeds' pitched variations over ${name}`, () => {
    for (const { id, fragment } of SEEDS) {
      const { tap, steps, anchored } = LINE[id]!;
      const all = variations(fragment, options);
      const source = unionOf(fragment, options.workbench).text;
      const before = played(source, bars);
      const sixteenths = 16 / steps;
      /** The sixteenths, over the bars played, where an anchored step falls. */
      const fixed = new Set([...before.keys()].filter((at) => anchored.includes(Math.round((at % 16) / sixteenths))));

      describe(id, () => {
        it(`its anchors: the root on the downbeat, where each chord changes (${anchored.length ? 'step 0' : 'none: the pump rests there'})`, () => {
          expect(anchorsOf(fragment, options.workbench)).toEqual(anchored.map((step) => ({ line: '&bass', step, reason: 'root' })));
        });

        it(`its variations: ${EXPECTED[id]!.length}, as named`, () => {
          expect(all.map((v) => v.by)).toEqual(EXPECTED[id]);
          expect(all.every((v) => v.tool === 'vary' && v.line === '&bass')).toBe(true);
        });

        for (const [k, v] of all.entries())
          describe(v.by, () => {
            const text = unionOf(v.apply(fragment), options.workbench).text;
            const after = played(text, bars);

            it('compiles on its workbench with no diagnostic, and changes only its line', () => {
              expect(compileSource(text).diagnostics.map((d) => d.message)).toEqual([]);
              const changed = v
                .apply(fragment)
                .split('\n')
                .filter((l, j) => l !== fragment.split('\n')[j]);
              expect(changed.map((l) => l.split(' ')[0])).toEqual(['&bass']);
            });

            it('plays other notes than its source and than the variations before it (S2)', () => {
              expect(playsSameNotes(source, text)).toBe(false);
              for (const other of all.slice(0, k)) expect(playsSameNotes(unionOf(other.apply(fragment), options.workbench).text, text), other.by).toBe(false);
            });

            it("keeps its source's holes, and the root on each chord change", () => {
              expect(holesOf(v.apply(fragment), compileSource)).toEqual(holesOf(fragment, compileSource));
              for (const at of fixed) expect(after.get(at), `sixteenth ${at}`).toEqual(before.get(at));
            });

            it('reads back as the notes it was built from', () => {
              const sorted = (notes: readonly { at: number | null; key: string }[]) => notes.map((n) => `${n.at} ${n.key}`).sort();
              expect(sorted(readVariations(v.apply(fragment), options).notes!)).toEqual(sorted(readVariations(fragment, options).variations[k]!.notes));
            });

            it(`plays on its other notes what the language's own form plays`, () => {
              const free = (m: Map<number, number[]>) => [...m].filter(([at]) => !fixed.has(at));
              // (the last note's sixteenth in each bar, and the one before it: every seed is a bar long)
              const [prev, last] = fragment
                .split('\n')[0]!
                .split(' ')
                .slice(3)
                .flatMap((t, step) => (t === '~' ? [] : Array.from({ length: Number(/!(\d+)$/.exec(t)?.[1] ?? 1) }, (_, j) => (step + j) * sixteenths)))
                .slice(-2);
              const lasts = (m: Map<number, number[]>) => [...m.keys()].filter((at) => at % 16 === last);
              if (v.rule === 'bend') {
                // the last note plays what the note before it plays moved `^n`; every other note as it was
                const moved = played(asForm(source, tap, `&bass^${v.by.split(' ').at(-1)}`), bars);
                expect(lasts(after).map((at) => after.get(at))).toEqual(lasts(before).map((at) => moved.get(at - last! + prev!)));
                expect([...after].filter(([at]) => at % 16 !== last)).toEqual([...before].filter(([at]) => at % 16 !== last));
              } else if (v.rule === 'trim') expect(after).toEqual(new Map([...before].filter(([at]) => at % 16 !== last)));
              else if (v.rule === 'transpose' || v.rule === 'invert') {
                const form = v.rule === 'transpose' ? `&bass^${v.by.split(' ').at(-1)}` : `inverse(&bass)`; // (f is the root, 0)
                expect(free(after)).toEqual(free(played(asForm(source, tap, form), bars)));
              } else if (!anchored.length) expect(after).toEqual(played(asForm(source, tap, '&bass[::-1]'), bars));
              else {
                // one chord a bar, so a note plays the same at every step of its bar: each free note is its mirror's
                // within the span after the downbeat's anchor
                const mirror = (at: number) => {
                  const bar = at - (at % 16);
                  const step = Math.round((at % 16) / sixteenths);
                  return bar + (steps - step) * sixteenths;
                };
                expect(free(after)).toEqual(
                  free(before)
                    .map(([at, notes]) => [mirror(at), notes] as [number, number[]])
                    .sort((a, b) => a[0] - b[0]),
                );
              }
            });
          });
      });
    }
  });
}

describe('the pitched operators', () => {
  const options = OPTIONS('I–vi–IV–V');

  it('are 24 of the 30 on the five seeds, the 6 left out each playing its source’s notes; and 20 bends and trims', () => {
    const all = SEEDS.flatMap(({ fragment }) => variations(fragment, options));
    expect(all.filter((v) => v.rule !== 'bend' && v.rule !== 'trim')).toHaveLength(24);
    expect(all.filter((v) => v.rule === 'bend' || v.rule === 'trim')).toHaveLength(20);
    // the left out: an inversion about a root that is every note's (the root, the eighths, the pump, the funk: all 0, and
    // the funk's anticipation, mirrored round its own table's root, is that root); a retrograde of one note (the root's
    // half) or of eight alike (the eighths)
    expect(SEEDS.flatMap(({ id }) => ['invert &bass', 'reverse &bass'].filter((by) => !EXPECTED[id]!.includes(by)).map((by) => `${id}: ${by}`))).toEqual([
      'root bass: invert &bass',
      'root bass: reverse &bass',
      'pumping bass: invert &bass',
      'eighths bass: invert &bass',
      'eighths bass: reverse &bass',
      'funk bass: invert &bass',
    ]);
  });

  it('a chord change on the half bar anchors the root there too: the root bass, both its notes anchored, has no variation', () => {
    const halves = { workbench: `${HOST}\n&harm over=key step=2n [0,2,4] [3,5,7]`, operators: PITCHED_OPERATORS };
    const root = SEEDS.find((s) => s.id === 'root bass')!.fragment;
    expect(anchorsOf(root, halves.workbench).map((a) => a.step)).toEqual([0, 1]);
    expect(variations(root, halves)).toEqual([]);
  });

  it('a note on a change that is not its root is no anchor', () => {
    const fifth = '&bass over=&harm step=2n 2 0\n&bassV loop=C2\n&bassOut map=midi(2) [&bass * &bassV]';
    expect(anchorsOf(fifth, options.workbench)).toEqual([]);
  });

  it('a line over the key, not a harmony, has no root to keep', () => {
    const scale = '&bass over=key step=4n 0 1 2 4\n&bassV loop=C2\n&bassOut map=midi(2) [&bass * &bassV]';
    expect(anchorsOf(scale, options.workbench)).toEqual([]);
    expect(variations(scale, options).map((v) => v.by)).toContain('invert &bass');
  });

  it('act on pitched lines only, and the rhythm operators on lines of hits only', () => {
    for (const { fragment } of SEEDS) expect(variations(fragment, { workbench: options.workbench })).toEqual([]);
    const drums = '&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~\n&hat step=16n ~ &hh ~ &hh ~ &hh ~ &hh\n&drums map=midi(10) [&kick, &hat]\n&bd s=white\n&hh s=white';
    expect(variations(drums, { workbench: HOST, operators: PITCHED_OPERATORS })).toEqual([]);
  });

  // (a lead's line, one bar over the key, as Jambot writes it: yggi/jambot#424)
  const lead = (steps: string) => `&lead over=key step=16n ${steps}\n&leadV loop=C4\n&leadOut map=midi(3) [&lead * &leadV]`;

  it('bend and trim: the last note moved to 1 or 2 degrees either side of the note before it, or left out (#267)', () => {
    // the last note, 0 on step 12, after a 4: bent to 2, 3, 5 and 6, then left out
    const shape = lead('0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ 0 ~ ~ ~');
    const ends = variations(shape, { workbench: HOST, operators: ['bend', 'trim'] });
    expect(ends.map((v) => [v.by, v.after.split('\n')[0]])).toEqual([
      ['bend &lead -2', '&lead over=key step=16n 0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ 2 ~ ~ ~'],
      ['bend &lead -1', '&lead over=key step=16n 0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ 3 ~ ~ ~'],
      ['bend &lead 1', '&lead over=key step=16n 0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ 5 ~ ~ ~'],
      ['bend &lead 2', '&lead over=key step=16n 0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ 6 ~ ~ ~'],
      ['trim &lead 12', '&lead over=key step=16n 0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ ~ ~ ~ ~'],
    ]);
    // after the other pitched operators, in their order
    expect(
      variations(shape, { workbench: HOST, operators: PITCHED_OPERATORS })
        .map((v) => v.by)
        .slice(-5),
    ).toEqual(ends.map((v) => v.by));
    for (const v of ends) expect(compileSource(unionOf(v.apply(shape), HOST).text).diagnostics).toEqual([]);
  });

  it('trim keeps two notes: a line of two gives bends and no trim', () => {
    expect(variations(lead('0 ~ ~ ~ ~ ~ ~ ~ 4 ~ ~ ~ ~ ~ ~ ~'), { workbench: HOST, operators: ['bend', 'trim'] }).map((v) => v.by)).toEqual([
      'bend &lead -2',
      'bend &lead -1',
      'bend &lead 1',
      'bend &lead 2',
    ]);
  });

  it('a bend that plays the last note it bends is left out (S2)', () => {
    // the last note, 3, is a degree below the 4 before it: bent down 1, it is its source
    expect(variations(lead('0 ~ ~ 2 ~ -1 ~ ~ 4 ~ ~ ~ 3 ~ ~ ~'), { workbench: HOST, operators: ['bend'] }).map((v) => v.by)).toEqual([
      'bend &lead -2',
      'bend &lead 1',
      'bend &lead 2',
    ]);
  });

  it('a last note that is an anchor, a root on a chord change, is neither bent nor trimmed', () => {
    const changes = `${HOST}\n&harm over=key step=4n [0,2,4] [0,2,4] [0,2,4] [3,5,7]`;
    const walk = '&bass over=&harm step=4n 0 1 2 0\n&bassOut map=midi(2) [&bass * &bassV]';
    expect(anchorsOf(walk, changes).map((a) => a.step)).toEqual([0, 3]);
    expect(variations(walk, { workbench: changes, operators: ['bend', 'trim'] })).toEqual([]);
    // (the same line on one chord: its last note is no anchor, and is bent, but for the bend to 0 it plays, and trimmed)
    expect(variations(walk, { workbench: `${HOST}\n&harm over=key step=1m [0,2,4]`, operators: ['bend', 'trim'] }).map((v) => v.by)).toEqual([
      'bend &bass -1',
      'bend &bass 1',
      'bend &bass 2',
      'trim &bass 3',
    ]);
  });

  it('transpose by the degrees a frontend names, in its order', () => {
    const walk = SEEDS.find((s) => s.id === 'walking bass')!.fragment;
    expect(variations(walk, { ...options, operators: ['transpose'], degrees: [2] }).map((v) => v.after)).toEqual(['&bass over=&harm step=4n 0 3 4 degree(&bassNext^$-1, 2)']);
  });

  it('a draw picks among them as among the rhythm ones', () => {
    const walk = SEEDS.find((s) => s.id === 'walking bass')!.fragment;
    expect(varied(walk, 0, options)!.by).toBe('transpose &bass -2');
    expect(varied(walk, 0.999, options)!.by).toBe('trim &bass 3');
  });

  it('cost one compile a call, the fragment under its workbench; applying them, none', async () => {
    // (the modules loaded afresh: with isolate off, another file may have loaded Vary over the real compile)
    vi.resetModules();
    const { compileSource: compile } = await import('../compile');
    const vary = await import('.');
    const calls = vi.mocked(compile);
    const counts = SEEDS.map(({ fragment }) => {
      calls.mockClear();
      vary.variations(fragment, options).forEach((v) => v.apply(fragment));
      return calls.mock.calls.length;
    });
    vi.resetModules(); // (and afresh again for the files after this one)
    expect(counts).toEqual(SEEDS.map(() => 1));
  });
});
