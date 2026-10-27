import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { liveAt } from './live';
import { routing } from './routing';
import { eventsBetween, plan } from './realize';
import { mainLength, pieceTime } from './duration';
import { PRESETS } from './presets';
import { resolveSeed } from '../repository/library';

const OUT = '&out loop=SAMPLE_RATE map=sample';
const src = (...lines: string[]) => compileSource(lines.join('\n'));
const on = (r: CompileResult, muted: ReadonlySet<string> = r.off) => routing(r, muted);

describe('routing: one model for what the graph draws as part of the sound (#11)', () => {
  it('a groove: a chord of voices lights each of them while it sounds', () => {
    const r = src('&g step=2 [&bd, &hh] ~', '&bd s=sine loop=A1', '&hh s=white', `${OUT} [&g]`);
    const live = liveAt(r, codeShifts(r), r.off, 0.1);
    expect(['bd', 'hh'].map((n) => live.nodes.has(`cell:${n}`))).toEqual([true, true]);
  });
  it('a sound tape nothing hears is not part of the sound (nor what it records)', () => {
    const r = src(
      '&bar step=1',
      '&mel step=&bar 0',
      '&v s=sine loop=C4',
      '&send [&mel * &v]',
      '&tape step=&bar write=&send length=2',
      '&head play=&tape at=.5',
      `${OUT} [&mel * &v]`,
    );
    const n = on(r).nodes;
    expect([n.has('cell:tape'), n.has('cell:head'), n.has('cell:send')]).toEqual([false, false, false]);
    expect(n.has('cell:v')).toBe(true);
  });
  it('a table lent by a cell that splices one with its own: only the table its notes read', () => {
    const r = compileSource(PRESETS.cellscape.source);
    expect(on(r).edges.has('cell:canon->cell:lydian')).toBe(false);
    expect(on(r).edges.has('cell:melody->cell:lydian')).toBe(true);
  });
  it('an oscilloscope is on while what it watches is', () => {
    const r = compileSource(PRESETS.harmonograph.source);
    expect(on(r).nodes.has('cell:screen')).toBe(true);
    expect(on(r, new Set(['cell:tonic', 'cell:fifth'])).nodes.has('cell:screen')).toBe(false);
  });
});

describe('at rest, nothing is dimmed (#201)', () => {
  // (how fast: `timing.slow.test.ts`, #237)
  it('the heads at rest (the live state at time 0) are worked out for every example', () => {
    for (const p of Object.values(PRESETS)) {
      const r = compileSource(p.source, undefined, { resolve: resolveSeed });
      expect(liveAt(r, codeShifts(r), r.off, 0).seconds).toBe(0);
    }
  });
});

describe('an envelope is routed into the voice it shapes', () => {
  // (no other test held it: the live view lights no envelope's wire, so the agreement below can't see it go, #326)
  it('a named map=adsr in the product: its wire into the voice is routed, and leaves with the envelope', () => {
    const r = src('&m step=1', '&t step=&m 0 7', '&shape map=adsr .01 .2 .5 .3', '&v s=tri loop=C4', `${OUT} [&t * &shape * &v]`);
    expect(r.outputs.map((o) => o.envelopeCell)).toEqual(['shape']);
    expect(on(r).edges.has('cell:shape->cell:v')).toBe(true);
    expect(on(src('&m step=1', '&t step=&m 0 7', '&v s=tri loop=C4', `${OUT} [&t * &v]`)).edges.has('cell:shape->cell:v')).toBe(false);
  });
});

// (lifted from yggi/cell-studio src/layout/routing.drawn.test.ts @ 23a5972, #326: routing, the live view and the
// events are the language's three answers to what sounds, and must agree; how a graph draws them stays Cell studio's)
describe('routing, the live view and the events agree, in every example', () => {
  for (const [key, { source }] of Object.entries(PRESETS)) {
    it(key, () => {
      const r = compileSource(source, undefined, { resolve: resolveSeed });
      const shifts = codeShifts(r);
      const all = routing(r, r.off);
      const pl = plan(r, shifts, r.off);
      const length = Math.min(40, mainLength(pieceTime(r)) ?? 20, Number.isFinite(pl.end) ? pl.end : Infinity);
      const events = eventsBetween(pl, 0, length);
      // every voice that plays is routed; while one of its notes sounds, it's live; nothing live isn't routed
      for (const e of events) expect(all.nodes.has(`cell:${e.voice}`), `&${e.voice} plays but isn't routed`).toBe(true);
      for (let t = 0.05; t < length; t += length / 23) {
        const live = liveAt(r, shifts, r.off, t);
        for (const n of live.nodes) expect(all.nodes.has(n), `${n} live at ${t.toFixed(2)} s, not routed`).toBe(true);
        for (const id of live.edges) expect(all.edges.has(id), `${id} live at ${t.toFixed(2)} s, not routed`).toBe(true);
        for (const e of events) if (e.at <= t && t < e.at + e.dur) expect(live.nodes.has(`cell:${e.voice}`), `&${e.voice} sounds at ${t.toFixed(2)} s, not live`).toBe(true);
      }
      // what moves a voice that plays (pitch and volume streams, parameter cells, envelopes) is routed
      for (const o of r.outputs)
        if (all.nodes.has(`cell:${o.voice}`) && events.some((e) => e.voice === o.voice)) {
          const v = r.cells.get(o.voice)!;
          const movers = [...o.mods, ...o.levels]
            .map((m) => m.cell)
            .concat(
              Object.values(v.paramCells ?? {}).flatMap((pc) => pc.factors),
              o.envelopeCell ?? [],
            );
          for (const m of movers) if (!r.off.has(`cell:${m}`)) expect(all.nodes.has(`cell:${m}`), `&${m} moves &${o.voice}, not routed`).toBe(true);
        }
    });
  }
});
