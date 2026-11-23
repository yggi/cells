// hitsOf (#715): a rhythm fragment's hits on a bench, by line and role, from one compile of the groove, equal to each line
// compiled alone (what a frontend did by rewriting the mix), and every role read from its line's `role=`.
import { describe, expect, it } from 'vitest';
import { setAttr } from '../engine/edit';
import { clocking } from '../engine/clocking';
import { planOf } from '../engine/host';
import { mainMeter } from '../engine/midiclock';
import { notesOf } from '../engine/notesof';
import { bodyOf } from '../engine/use';
import { declarations, unionOf } from './fit';
import { hitsOf } from './hits';
import { LIBRARY, resolveSeed } from './library';

const BENCH = '&bar meter("4/4") step=120bpm';
const rhythms = LIBRARY.filter((f) => f.association.some((p) => p.facet === 'rhythm'));

/** Each line of the mix compiled alone, as a frontend did: the mix rewritten as a card of that term, its hits read. */
function perLine(text: string) {
  const union = unionOf(bodyOf(text), BENCH).text;
  const mix = declarations(union).find((l) => /^&\w+ \[.*\]$/.test(l.code))!;
  const terms = /\[(.*)\]/.exec(mix.code)![1]!.split(', ');
  const out: string[] = [];
  for (const term of terms) {
    const line = /^&(\w+)/.exec(term)![1]!;
    const plan = planOf(
      setAttr(union, mix.name, 'map', 'midi(10)').replace(new RegExp(`^&${mix.name} map=midi\\(10\\) \\[.*\\]$`, 'm'), `&${mix.name} map=midi(10) [${term}]`),
      undefined,
      { resolve: resolveSeed },
    );
    const cell = mainMeter(plan.result)!.cell;
    const clock = clocking(plan.result, plan.statics).played(cell);
    const bar = plan.result.cells.get(cell)!.meter!;
    const sixteenths = (bar.pulses / (bar.levels.length * bar.unit)) * 16;
    for (const n of notesOf(plan, { to: clock.q(bar.levels.length * 8) }).filter((n) => n.channel === 10))
      out.push([line, n.note, Math.round(clock.stepAt(n.at) * sixteenths * 1e6) / 1e6, n.velocity].join(':'));
  }
  return out;
}

describe('hitsOf', () => {
  it('reads every rhythm of the seed: its lines, its hits, and the role of each line from its role=, none guessed', () => {
    let hits = 0;
    const unroled: string[] = [];
    const none: string[] = [];
    for (const f of rhythms) {
      const read = hitsOf(f.text, BENCH, { resolve: resolveSeed });
      if (read === null) {
        none.push(f.id);
        continue;
      }
      expect(read.hits.length, f.id).toBeGreaterThan(0);
      for (const line of read.lines) {
        const declared = new RegExp(`^&${line.name}\\b.*\\brole=(\\w+)`, 'm').exec(f.text)?.[1] ?? null;
        expect(line.role, `${f.id} &${line.name}`).toBe(declared);
        if (line.role === null) unroled.push(`${f.id}: &${line.name}`);
      }
      hits += read.hits.length;
    }
    expect(rhythms.length - 1).toBeGreaterThanOrEqual(32);
    // (the bell and scale is a mode's and a rhythm's, no groove: it has no mix of lines)
    expect(none).toEqual(['bell_and_scale']);
    expect(hits).toBeGreaterThan(400);
    // (every line of every groove says its role)
    expect(unroled).toEqual([]);
  });

  it('gives, for every rhythm, the hits of each line compiled alone: line, key, step and velocity, 100 %', () => {
    for (const f of rhythms.filter((r) => r.id !== 'bell_and_scale')) {
      const mine = hitsOf(f.text, BENCH, { resolve: resolveSeed })!.hits.map((h) => [h.line, h.note, h.step, h.velocity].join(':'));
      const alone = perLine(f.text);
      // (over the lap hitsOf reads: the lines compiled alone are read over the same window, so the multisets are equal there)
      const lap = new Set(mine);
      expect(mine.sort(), f.id).toEqual(alone.filter((h) => lap.has(h)).sort());
    }
  });

  it('is null for a fragment that is no mix of lines', () => {
    expect(hitsOf('&bar meter("4/4") step=120bpm\n&k step=4n 0', BENCH, { resolve: resolveSeed })).toBeNull();
  });
});
