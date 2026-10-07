import { describe, expect, it } from 'vitest';
import { SAILOR_WITH_KIT } from './fixtures';
import { compileSource } from './compile';
import { codeShifts, type CompileResult } from './program';
import { buildGraph } from './graph';
import { eventsBetween, plan } from './realize';
import { liveAt } from './live';
import { drawn, edgeStateOf, nodeStateOf, routing } from './routing';
import { PRESETS } from './presets';
import { mainLength, pieceTime } from './duration';

const OUT = '&out loop=SAMPLE_RATE map=sample';
const src = (...lines: string[]) => compileSource(lines.join('\n'));
const on = (r: CompileResult, muted: ReadonlySet<string> = r.off) => routing(r, muted);
/** States as drawn, by short name: nodes `name`, edges `a->b` (step edges `a~>b`). */
function states(r: CompileResult, t: number | null, muted: ReadonlySet<string> = r.off) {
  const g = buildGraph(r);
  const routed = drawn(g, routing(r, muted));
  const live = t === null ? null : drawn(g, liveAt(r, codeShifts(r), muted, t));
  const out = new Map<string, string>();
  for (const n of g.nodes) out.set(n.id.slice(5), nodeStateOf(n.id, muted, routed, live));
  for (const e of g.edges) out.set(e.id.replace(/cell:/g, ''), edgeStateOf(e, muted, routed, live));
  return out;
}

describe('routing: one model for what the graph draws as part of the sound (#11)', () => {
  it('a cell that only moves a voice (a filter, a pitch) is part of the sound', () => {
    const r = src('&bar step=1', '&mel step=&bar 0 2', '&sweep map=lin loop=.5 0 1', '&v s=saw loop=C3 lpf=200..2000 * &sweep', `${OUT} [&mel * &v]`);
    const s = states(r, 0.2);
    expect([s.get('sweep'), s.get('sweep->v')]).toEqual(['live', 'live']);
  });
  it('a braid of chance choices plays, so it is routed', () => {
    const r = src('&bar step=4', '&g step=&bar [0|2|4]? ~ [5|7]?', '&v s=sine loop=C4', `${OUT} [&g * &v]`);
    expect(on(r).nodes.has('cell:g')).toBe(true);
    expect(states(r, null).get('g->v')).toBe('on');
  });
  it('the step= chain moves what it drives: routed, and live while it plays', () => {
    const r = src('&bar step=2', '&half step=&bar/2 0', '&mel step=&half 0 2', '&v s=sine loop=C4', `${OUT} [&mel * &v]`);
    const s = states(r, 0.1);
    expect([s.get('mel~>half'), s.get('half~>bar')]).toEqual(['live', 'live']);
  });
  it('a selector: the part it picks lights its way to the sound card, the others wait (a voice in two parts too)', () => {
    const r = src(
      '&bar step=1',
      '&a step=&bar 0',
      '&b step=&bar 7',
      '&v s=tri loop=C4',
      '&w s=sine loop=C4',
      '&partA [&a * &v]',
      '&partB [&b * &w, &b * &v]',
      '&parts &partA &partB',
      '&song over=&parts step=&bar*4 0 1',
      `${OUT} &song`,
    );
    const first = states(r, 0.5);
    expect(['partA', 'parts', 'song', 'out', 'v'].map((n) => first.get(n))).toEqual(['live', 'live', 'live', 'live', 'live']);
    expect(Object.fromEntries(['v->partA', 'parts->partA', 'song->parts', 'out->song'].map((k) => [k, first.get(k)]))).toEqual({
      'v->partA': 'live',
      'parts->partA': 'live',
      'song->parts': 'live',
      'out->song': 'live',
    });
    // &v is in both parts: only the edge its notes take now is live
    expect([first.get('partB'), first.get('w'), first.get('v->partB'), first.get('parts->partB')]).toEqual(['idle', 'idle', 'idle', 'idle']);
    const second = states(r, 4.5);
    expect([second.get('v->partB'), second.get('v->partA'), second.get('partA')]).toEqual(['live', 'idle', 'idle']);
  });
  it('a kit: its members are part of the sound, and the one struck now is live', () => {
    const r = compileSource(SAILOR_WITH_KIT);
    expect(['bd', 'sd', 'hh', 'kit', 'drums'].every((n) => on(r).nodes.has(`cell:${n}`))).toBe(true);
    const s = states(r, 0.05); // the kick
    expect([s.get('kit->bd'), s.get('bd'), s.get('kit->hh'), s.get('hh')]).toEqual(['live', 'live', 'idle', 'idle']);
  });
  it('an instrument (a mix used like a voice) and a sound tape it records: all on the way while it plays', () => {
    const r = compileSource(PRESETS.soundtape.source);
    const s = states(r, 3);
    for (const k of ['dry', 'tape', 'left', 'right', 'far', 'reel', 'pluck->dry', 'dry->out', 'dry->tape', 'tape->left', 'left->out', 'tape~>reel'])
      expect(s.get(k), k).toBe('live');
  });
  it('a resonator excited by tape heads, and the heads into the sound card', () => {
    const r = compileSource(PRESETS.resonanz.source);
    const s = states(r, 2);
    for (const k of ['site->tape', 'tape->h1', 'h1->echo', 'echo->pipeA', 'pipeA->out', 'hammer->plate', 'plate->site']) expect(s.get(k), k).toBe('live');
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
  it('switched off: a mix off silences what only goes through it; its voices and their melodies are not routed', () => {
    const r = src('&bar step=1', '&mel step=&bar 0', '&v s=sine loop=C4', '&m [&mel * &v]', `${OUT} &m`);
    const s = states(r, 0.2, new Set(['cell:m']));
    expect([s.get('m'), s.get('v'), s.get('mel'), s.get('mel->v'), s.get('v->m')]).toEqual(['off', 'unrouted', 'unrouted', 'unrouted', 'off']);
  });
  it('a table read only through a turning table: what turns it is on the way', () => {
    const r = compileSource(PRESETS.royal.source);
    const s = states(r, 1);
    expect([s.get('key~>theme'), s.get('scale->key')]).toEqual(['live', 'live']);
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

describe('routing, every example', () => {
  for (const [key, p] of Object.entries(PRESETS)) {
    it(`${key}: the drawn states agree with each other and with what plays`, () => {
      const r = compileSource(p.source);
      const g = buildGraph(r);
      const shifts = codeShifts(r);
      const all = routing(r, r.off);
      const routed = drawn(g, all);
      const graphEdges = new Map(g.edges.map((e) => [e.id, e]));
      // every routed edge is drawn, unless it goes to a cell that isn't (the implicit grid, show=off)
      const shown = new Set(g.nodes.map((n) => n.id));
      for (const id of all.edges) {
        const [a, b] = id.split(/->|~>/);
        if (shown.has(a) && shown.has(b) && !g.alias.has(id)) expect(graphEdges.has(id), `${id} is not an edge of the graph`).toBe(true);
      }
      // a routed edge's ends are routed
      for (const id of routed.edges) {
        const e = graphEdges.get(id)!;
        expect(routed.nodes.has(e.source) && routed.nodes.has(e.target), `${id}: an end isn't routed`).toBe(true);
      }
      const pl = plan(r, shifts, r.off);
      const length = Math.min(40, mainLength(pieceTime(r)) ?? 20, Number.isFinite(pl.end) ? pl.end : Infinity);
      const events = eventsBetween(pl, 0, length);
      // every voice that plays is routed; while one of its notes sounds, it's live
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
