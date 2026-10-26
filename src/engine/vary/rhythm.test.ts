// Vary's rhythm operators (decision 052, rung 1; #208): on E31's eight drum bars they reproduce Jambot's variations hit
// for hit and in order, play other notes than their source and each other, keep the anchors and the holes, and pick by a
// draw as Jambot's `pick` does; the anchors are the kick's and the backbeat's lines, and the backbeat is Jambot's on every
// meter of the seed library; and every variation of a bar costs one compile.
import { describe, expect, it, vi } from 'vitest';
import e31 from '../../../fixtures/jambot-e31.json';
import { compileSource } from '../compile';
import { planOf } from '../host';
import { channelTable, midiNote, router, routesOf } from '../midi';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { playsSameNotes, sameNotes } from '../sameness';
import { windowAt } from '../schedule';
import { rewriteAll } from '../rewrite';
import { unionOf } from '../../repository/fit';
import { heard } from '../../repository/heard';
import { holesOf } from '../../repository/holes';
import { resolveSeed } from '../../repository/library';
import { METER_FRAGMENTS } from '../../repository/meters';
import { RHYTHM_FRAGMENTS } from '../../repository/rhythms';
import { anchorsOf, backbeatOf, drawn, variations, varied, type Variation } from '.';

vi.mock('../compile', async (original) => {
  const actual = await original<typeof import('../compile')>();
  return { ...actual, compileSource: vi.fn(actual.compileSource) };
});

/** The workbench Jambot reads a drum bar under: 4/4 played straight, at its reading tempo (`straight('4/4')`). */
const WORKBENCH = '&bar meter("4/4") step=120bpm';
const OPTIONS = { workbench: WORKBENCH, keep: ['&fill'], fewest: 3 };
/** E31's bars: each preset's drum part without its `&bar`, the seed's rhythm fragment word for word. */
const BARS = e31.witnesses.map((w) => ({ preset: w.preset, fragment: w.text.split('\n').slice(1).join('\n'), hits: w.hits }));
const under = (fragment: string) => unionOf(fragment, WORKBENCH).text;
/** A bar under its workbench, its stand-ins (`&hh s=white`) left out for the core kit's voices. */
const inKit = (fragment: string) => `use "core kit"\n${under(fragment.replace(/^&\w+ s=white\n?/gm, ''))}`;

// ---- Lifted from yggi/jambot @ 0a56da9: the reference, kept here as code, not imported.

/** A hit of a fragment as the band reads it (packages/engine/src/rhythm-query.ts, `FragmentHit`). */
interface FragmentHit {
  readonly role: string;
  readonly note: number;
  readonly step: number;
  readonly velocity: number;
}

// Lifted from yggi/jambot packages/engine/src/muse-groove.ts @ 0a56da9: `GROOVE_FEWEST`.
const GROOVE_FEWEST = 3;

// Lifted from yggi/jambot packages/engine/src/novelty.ts @ 0a56da9: `GROOVE_ANCHORS`, `UNVARIED`, `inOrder`, `patternOf`
// and `variations`, as written there.
const GROOVE_ANCHORS: readonly string[] = ['kick', 'backbeat'];
const UNVARIED: readonly string[] = [...GROOVE_ANCHORS, 'fill'];
const inOrder = (hits: readonly FragmentHit[]): FragmentHit[] => [...hits].sort((a, b) => a.step - b.step || a.note - b.note);
const patternOf = (hits: readonly FragmentHit[]) =>
  inOrder(hits)
    .map((h) => `${h.role}:${h.note}:${h.step}:${h.velocity}`)
    .join(' ');
function jambotVariations(hits: readonly FragmentHit[], steps: number): FragmentHit[][] {
  const bar = inOrder(hits);
  const seen = new Set([patternOf(bar)]);
  const out: FragmentHit[][] = [];
  const keep = (varied: readonly FragmentHit[]) => {
    if (varied.length < GROOVE_FEWEST) return;
    const strikes = new Set(varied.map((h) => `${h.step}:${h.note}`));
    if (strikes.size < varied.length) return;
    const pattern = patternOf(varied);
    if (seen.has(pattern)) return;
    seen.add(pattern);
    out.push(inOrder(varied));
  };
  const roles = [...new Set(bar.map((h) => h.role))].filter((r) => !UNVARIED.includes(r));
  for (const role of roles) {
    const line = bar.filter((h) => h.role === role);
    const rest = bar.filter((h) => h.role !== role);
    keep([...rest, ...line.map((h) => ({ ...h, step: (h.step + 1) % steps }))]);
    for (const dropped of line) keep(bar.filter((h) => h !== dropped));
    const { note } = line[0]!;
    const loudest = Math.max(...line.map((h) => h.velocity));
    for (let step = 0; step < steps; step++) if (!bar.some((h) => h.note === note && h.step === step)) keep([...bar, { role, note, step, velocity: loudest }]);
  }
  return out;
}

// Lifted from yggi/jambot packages/engine/src/random.ts @ 0a56da9: `QUANTUM` and `pick`.
const QUANTUM = 2 ** -16;
function pick(draw: number, weights: readonly number[]): number {
  if (!(draw >= 0 && draw < 1)) throw new Error(`pick: draw ${draw} is outside [0, 1)`);
  const counts = weights.map((w) => Math.round(w / QUANTUM));
  const total = counts.reduce((a, b) => a + b, 0);
  let left = Math.floor(draw * total);
  for (let i = 0; i < counts.length - 1; i++) {
    left -= counts[i]!;
    if (left < 0) return i;
  }
  return counts.length - 1;
}

// Lifted from yggi/jambot packages/engine/src/rhythms.ts @ 0a56da9: `cardOf`, `whole` and `readRhythm`, on 4/4 (its
// `straight('4/4')`, and `stepSeconds(120, 4/4)`, a sixteenth at 120 bpm), the meter every E31 bar is read under.
function cardOf(text: string): { readonly line: string; readonly terms: string[] } | null {
  const card = /^&\w+ map=midi\(10\) \[(.*)\]$/m.exec(text);
  return card ? { line: card[0], terms: card[1]!.split(', ') } : null;
}
const whole = (x: number) => (Math.abs(x - Math.round(x)) < 1e-6 ? Math.round(x) : x);
function readRhythm(text: string): FragmentHit[] | null {
  const card = cardOf(text);
  if (!card) return null;
  const bars = Math.max(1, ...holesOf(text, compileSource).clock.map((need) => need.bars));
  const step = 60 / 120 / 4;
  const steps = 16 * bars;
  const hits: FragmentHit[] = [];
  for (const term of card.terms) {
    const role = /^&(\w+)/.exec(term)![1]!;
    const alone = text.replace(card.line, card.line.replace(/\[.*\]$/, `[${term}]`));
    const p = planOf(unionOf(alone, WORKBENCH).text);
    const route = router(p.result, channelTable(p.result));
    for (const e of windowAt(p, 0, steps * step).events)
      for (const r of routesOf(route(e))) {
        const note = midiNote(e, r);
        if (!note || note.channel !== 10) continue;
        const at = whole(note.at / step);
        if (!Number.isInteger(at) || at >= steps) return null;
        hits.push({ role, note: note.note, step: at, velocity: note.velocity });
      }
  }
  return inOrder(hits);
}

// Lifted from yggi/jambot packages/engine/src/drums.ts @ 0a56da9 (`backbeatOf`, its pulses from 0) and
// packages/theory/src/meter.ts there (`METERS`: each meter's pulses, in eighths from the downbeat, as `even` gives them).
const jambotBackbeatOf = (heights: readonly number[]) =>
  Array.from({ length: heights.length }, (_, pulse) => pulse).filter((pulse) => (heights.length <= 3 ? pulse > 0 : pulse % 2 === 1));
const JAMBOT_METERS: Record<string, readonly number[]> = {
  '3/4': [0, 2, 4],
  '4/4': [0, 2, 4, 6],
  '5/4': [0, 2, 4, 6, 8],
  '6/8': [0, 3],
  '7/8': [0, 3, 5],
  '10/8': [0, 3, 5, 8],
  '12/8': [0, 3, 6, 9],
};

// ---- The bounds.

/** Each bar's variations, and Jambot's of its hits as read, once. */
const ALL = BARS.map((b) => {
  const mine = variations(b.fragment, OPTIONS);
  const read = readRhythm(b.fragment)!;
  return { ...b, mine, read, jambot: jambotVariations(read, 16) };
});
const texts = (b: (typeof ALL)[number]) => b.mine.map((v) => v.apply(b.fragment));

describe("Jambot's variations on E31's eight drum bars, reproduced", () => {
  it('each bar, read as Jambot reads it, is E31’s hits: 144 in all', () => {
    for (const b of ALL)
      expect(
        b.read.map((h) => [h.note, h.step, h.velocity]),
        b.preset,
      ).toEqual(inOrder(b.hits.map((h) => ({ ...h, role: '' }))).map((h) => [h.note, h.step, h.velocity]));
    expect(ALL.reduce((n, b) => n + b.read.length, 0)).toBe(144);
  });

  it('as many as Jambot gives, bar by bar: 284 in all, 18 rotations, 81 drops and 185 adds', () => {
    expect(ALL.map((b) => [b.preset, b.mine.length])).toEqual(ALL.map((b) => [b.preset, b.jambot.length]));
    expect(ALL.map((b) => b.mine.length)).toEqual([29, 21, 29, 17, 46, 49, 46, 47]);
    const by = (rule: string) => ALL.reduce((n, b) => n + b.mine.filter((v) => v.rule === rule).length, 0);
    expect([by('rotate'), by('drop'), by('add'), by('rotate') + by('drop') + by('add')]).toEqual([18, 81, 185, 284]);
  });

  it('each read back by Jambot’s reader as the hits Jambot’s gives, in the same order: role, note, step, velocity', () => {
    for (const b of ALL) for (const [k, text] of texts(b).entries()) expect(readRhythm(text), `${b.preset}, ${b.mine[k]!.by}`).toEqual(b.jambot[k]);
  });
});

/** What a text plays over its first bar for S2: each event's voice, onset, length and pitch, as `playsSameNotes` keys it. */
function notesOf(fragment: string): string {
  const r = compileSource(under(fragment));
  return eventsBetween(plan(r, codeShifts(r)), 0, 2)
    .map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)}`)
    .sort()
    .join('\n');
}

describe('what a variation is', () => {
  it('none of the 284 plays the notes of its source or of another variation of it (S2)', () => {
    for (const b of ALL) {
      const played = [b.fragment, ...texts(b)].map(notesOf);
      expect(new Set(played).size, b.preset).toBe(played.length);
      // (S2 reads a voice by its sound, decision 057: E31's stand-ins are one white noise, so it hears them in the core kit)
      expect(compileSource(inKit(b.fragment), undefined, { resolve: resolveSeed }).ok, b.preset).toBe(true);
      for (const text of texts(b)) expect(playsSameNotes(inKit(b.fragment), inKit(text), 2, { resolve: resolveSeed })).toBe(false);
    }
  });

  it('none moves an anchor: the kick’s and the backbeat’s lines play as in the source (S3), nor the line kept', () => {
    for (const b of ALL) for (const text of texts(b)) expect(sameNotes(under(b.fragment), under(text), ['kick', 'backbeat', 'fill'])).toBe(true);
  });

  it('each keeps its source’s holes: what it uses, defines and its clock needs', () => {
    for (const b of ALL) {
      const holes = holesOf(b.fragment, compileSource);
      for (const text of texts(b)) expect(holesOf(text, compileSource)).toEqual(holes);
    }
  });

  it('each changes only the line it names (a product’s two cells; the card too where it drops the line’s last note), and compiles with no diagnostic', () => {
    let emptied = 0;
    for (const b of ALL)
      for (const v of b.mine) {
        const before = b.fragment.split('\n');
        const text = v.apply(b.fragment);
        const after = text.split('\n');
        expect(after).toHaveLength(before.length);
        const changed = after.flatMap((l, k) => (l === before[k] ? [] : [l.split(' ')[0]]));
        const off = !cardOf(text)!.terms.some((t) => t.startsWith(v.line));
        emptied += Number(off);
        expect(changed, v.by).toEqual(off ? [v.line, '&drums'] : changed[1] ? [v.line, `${v.line}Level`] : [v.line]);
        expect(compileSource(under(text)).diagnostics).toEqual([]);
      }
    // (the ghost's one note dropped, on five bars: its line leaves the card, its cell kept, all rests)
    expect(emptied).toBe(5);
  });

  it('is a rewrite of the tool vary, its by the operator, the line and its step, and rewriteAll never takes one', () => {
    const funk = ALL.find((b) => b.preset === 'Funk')!;
    expect(funk.mine.slice(0, 3).map((v) => [v.tool, v.rule, v.by])).toEqual([
      ['vary', 'rotate', 'rotate &euclid'],
      ['vary', 'drop', 'drop &euclid 0'],
      ['vary', 'drop', 'drop &euclid 3'],
    ]);
    expect(new Set(funk.mine.map((v) => v.id)).size).toBe(funk.mine.length);
    const text = under(funk.fragment);
    expect(rewriteAll(text, () => variations(text, { keep: ['&fill'] })).steps).toEqual([]);
  });
});

describe('other notes, as cells hears them (S2), where Jambot tells hits by their line and velocity too', () => {
  it('a rotation that only moves levels is not a variation (decision 052, point 6.4)', () => {
    const fragment = `&hat step=16n ${Array.from({ length: 16 }, (_, i) => `&hh:0:${i % 4 ? '.25' : '.5'}`).join(' ')}\n&drums map=midi(10) [&hat]\n&hh s=white`;
    const all = variations(fragment, { workbench: WORKBENCH });
    expect(all.map((v) => v.by)).toEqual(Array.from({ length: 16 }, (_, i) => `drop &hat ${i}`));
  });

  it('nor one that plays what another line’s variation played before it', () => {
    const fragment = '&a step=16n &hh ~ ~ ~\n&b step=16n ~ &hh ~ ~\n&drums map=midi(10) [&a, &b]\n&hh s=white';
    expect(variations(fragment, { workbench: WORKBENCH }).map((v) => v.by)).toEqual(['drop &a 0', 'add &a 2', 'add &a 3', 'rotate &b', 'drop &b 1']);
  });
});

describe('the anchors', () => {
  it('are exactly the kick’s line and the backbeat’s on 8 of 8 bars', () => {
    for (const b of ALL)
      expect(anchorsOf(b.fragment, WORKBENCH), b.preset).toEqual([
        { line: '&kick', reason: 'kick' },
        { line: '&backbeat', reason: 'backbeat' },
      ]);
  });

  it('a fragment that doesn’t compile without its workbench has none there, and no variation', () => {
    expect(anchorsOf(BARS[0]!.fragment)).toEqual([]);
    expect(variations(BARS[0]!.fragment)).toEqual([]);
  });

  it('a backbeat off the backbeat, or a kick line that strikes a snare too, is no anchor', () => {
    const fragment = BARS[0]!.fragment.replace('&backbeat step=16n ~ ~ ~ ~ &sd', '&backbeat step=16n ~ ~ ~ &sd ~').replace('&kick step=16n &bd', '&kick step=16n &sd');
    expect(anchorsOf(fragment, WORKBENCH)).toEqual([]);
  });

  it('the backbeat falls where Jambot’s backbeatOf has it, on each of the seed library’s 13 meters', () => {
    const eighths = METER_FRAGMENTS.map((f) => {
      const r = compileSource(`${f.text} step=120bpm`);
      return [f.id, backbeatOf(r.cells.get('bar')!.meter!).map((w) => w * 8)];
    });
    // (each of Jambot's meters by its name in cells: the five 4/4s are 4/4; 2/4 and the alla breve, which Jambot doesn't
    // name, are two beats a bar, the second its backbeat)
    const jambot = (id: string) => {
      const unnamed = { '2/4': [2], '4/4 alla breve': [4] }[id];
      const heights = JAMBOT_METERS[id.split(' ')[0]!]!;
      return unnamed ?? jambotBackbeatOf(heights).map((pulse) => heights[pulse]!);
    };
    expect(eighths).toHaveLength(13);
    expect(eighths).toEqual(METER_FRAGMENTS.map((f) => [f.id, jambot(f.id)]));
  });
});

describe('varied: a variation by a draw', () => {
  it('takes the index Jambot’s pick(draw, ones) takes, over 10,000 draws evenly spaced in [0, 1) on each bar', () => {
    for (const b of ALL) {
      const ones = b.mine.map(() => 1);
      for (let i = 0; i < 10_000; i++) expect(drawn(i / 10_000, b.mine.length), `${b.preset} at ${i / 10_000}`).toBe(pick(i / 10_000, ones));
    }
  });

  it('gives that variation: 50 draws evenly spaced on each bar', () => {
    for (const b of ALL)
      for (let i = 0; i < 50; i++)
        expect(varied(b.fragment, i / 50, OPTIONS)!.id, `${b.preset} at ${i / 50}`).toBe(
          b.mine[
            pick(
              i / 50,
              b.mine.map(() => 1),
            )
          ]!.id,
        );
  });

  it('a draw outside [0, 1) is an error; none where nothing varies', () => {
    for (const draw of [-0.1, 1, NaN]) expect(() => varied(BARS[0]!.fragment, draw, OPTIONS)).toThrow(/outside/);
    expect(varied(BARS[0]!.fragment, 0.5, { ...OPTIONS, keep: ['&fill', '&ghost', '&hat'] })).toBeNull();
  });
});

describe('what it costs', () => {
  // The bound as the work it bounds (#194): every variation of a bar is read off one compile of the bar on its
  // workbench, and none is compiled; `varied` the same. Their milliseconds: `../timing.slow.test.ts` (#237).
  it('every variation of a bar costs one compile, and so does varied; none is compiled', async () => {
    // (the modules loaded afresh, as `pitched.test.ts` does: with isolate off, a file that ran earlier in this worker, such
    // as `vary.test.ts`, may have loaded Vary over the real compile, which these calls would then go through uncounted, #236)
    vi.resetModules();
    const compiles = vi.mocked((await import('../compile')).compileSource);
    const { variations, varied } = await import('.');
    const count = <T>(run: () => T): [T, number] => {
      const before = compiles.mock.calls.length;
      return [run(), compiles.mock.calls.length - before];
    };
    for (const b of BARS) {
      const [all, n] = count(() => variations(b.fragment, OPTIONS));
      expect(all.length).toBeGreaterThan(0);
      expect(n).toBe(1);
      const [one, m] = count(() => varied(b.fragment, 0.5, OPTIONS));
      expect(one).not.toBeNull();
      expect(m).toBe(1);
      const [, applied] = count(() => all.map((v: Variation) => v.apply(b.fragment)));
      expect(applied).toBe(0);
    }
    vi.resetModules(); // (and afresh again for the files after this one)
  });
});

describe('a drum bar with no card of its own (#291)', () => {
  it.each(RHYTHM_FRAGMENTS.slice(0, 8).map((f) => [f.id, f.text] as const))(
    '%s: read alone, its mix is its card; under a workbench card that sends it, the same lines',
    (_, text) => {
      const kit = { ...OPTIONS, workbench: `${WORKBENCH}\n${resolveSeed('core kit')!}` };
      const alone = variations(text, kit).map((v) => [v.by, v.after]);
      expect(alone.length).toBeGreaterThan(0);
      expect(variations(text, { ...kit, workbench: `${kit.workbench}\n${heard(text)}` }).map((v) => [v.by, v.after])).toEqual(alone);
    },
  );
});
