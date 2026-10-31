import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { writtenGraph } from './graph';
import { routing } from './routing';
import { cellId, edgeId } from './ids';
import { edgeLabel } from './transform';

describe('a tap on a belt says itself on its wire (#92)', () => {
  const label = (step: string) => {
    const r = compileSource(`&bar meter("4/4") step=120bpm\n&bells ${step} belt=3000 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&bells * &v]`);
    const e = writtenGraph(r).edges.find((x) => x.port === 'step' && x.source === cellId('bells'));
    return e ? edgeLabel(e) : undefined;
  };
  it('step=8n belt=3000 is 8n · belt, as step=&bar*2 belt=3000 was ×2 · belt', () => {
    expect(label('step=8n')).toBe('8n · belt');
    expect(label('step=&bar:beat')).toBe('beat · belt');
  });
});

describe('a meter is a meter in the graph, written meter(…) or scan(…) (#123)', () => {
  /** The graph's meters for a bar written `bar`, and a line tapping it. */
  const meters = (bar: string) => {
    const r = compileSource(`&bar ${bar} step=120bpm\n&hat step=8n 0 0\n&v s=sine loop=C4\n&out map=sample [&hat * &v]`);
    expect(r.diagnostics).toEqual([]);
    return writtenGraph(r).nodes.flatMap((n) => (n.kind === 'cell' && n.isMeter ? [n.cell.name] : []));
  };
  it('meter("4/4") and scan(1 1 1 1) are both the meter; the line tapping it is not', () => {
    expect(meters('meter("4/4")')).toEqual(['bar']);
    expect(meters('scan(1 1 1 1)')).toEqual(['bar']);
    expect(meters('meter("7/8")')).toEqual(['bar']);
  });
  it('a list at a rate keeps no time: no meter', () => {
    const r = compileSource('&lfo step=4bpm 0 3 5\n&v s=sine loop=C4\n&out map=sample [&lfo * &v]');
    expect(r.diagnostics).toEqual([]);
    expect(writtenGraph(r).nodes.some((n) => n.kind === 'cell' && n.isMeter)).toBe(false);
  });
});

describe('a role and a stack of lines in the graph (#329)', () => {
  const BASE = `&bar meter("4/4") step=120bpm
&bd s=sine loop=A1
&hh s=white
&kit &bd &hh
&kick step=8n 0 ~ 0 ~
&hat step=8n ~ 1 ~ 1
&accent map=amp step=4n 1 .5
`;
  const wires = (src: string, cell: string) =>
    writtenGraph(compileSource(BASE + src))
      .edges.filter((e) => e.from === cellId(cell) || e.to === cellId(cell))
      .map((e) => `${e.from.slice(5)}->${e.to.slice(5)} ${e.port} ${e.band}`)
      .sort();

  it('a role is one wire from each gate it names, no sound: not the voices the gate plays', () => {
    const src = '&drumsOut play=&kick &kit\n&drums map=role &drumsOut\n&out map=sample &drumsOut';
    expect(compileSource(BASE + src).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(wires(src, 'drums')).toEqual(['drumsOut->drums braid none']);
  });

  it('a stack a gate plays is wired as it is written: each line on play, each of its levels on level', () => {
    const src = '&lines [&kick * &accent, &hat]\n&drumsOut play=&lines &kit\n&out map=sample &drumsOut';
    expect(compileSource(BASE + src).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(wires(src, 'lines')).toEqual(['accent->lines level cv', 'hat->lines play cv', 'kick->lines play cv', 'lines->drumsOut play cv']);
  });
});

describe("a key's tonic read from a cell is a wire, as a spliced cell's (#290)", () => {
  it('scale(minor, &tonic): a braid wire from the tonic into the key', () => {
    const r = compileSource('&bar meter("4/4") step=96bpm\n&key scale(minor, &tonic)\n&tonic A\n&roots over=&key step=1m 0 3 4 0\n&bass s=tri\n&out map=sample [&roots * &bass]');
    expect(r.diagnostics).toEqual([]);
    const wires = writtenGraph(r).edges.filter((e) => e.from === cellId('tonic') || e.to === cellId('tonic'));
    expect(wires.map((e) => ({ from: e.from, to: e.to, port: e.port, band: e.band }))).toEqual([{ from: cellId('tonic'), to: cellId('key'), port: 'braid', band: 'cv' }]);
  });
  it('a tonic written as a note draws no wire', () => {
    const r = compileSource('&bar meter("4/4") step=96bpm\n&key scale(minor, A)\n&roots over=&key step=1m 0 3 4 0\n&bass s=tri\n&out map=sample [&roots * &bass]');
    expect(writtenGraph(r).edges.filter((e) => e.port === 'braid' && e.to === cellId('key'))).toEqual([]);
  });
});

describe('a stack a gate plays is on the way, as the routing has it (#329)', () => {
  const src = `&bar meter("4/4") step=120bpm
&bd s=sine loop=A1
&hh s=white
&kit &bd &hh
&kick step=8n 0 ~ 0 ~
&hat step=8n ~ 1 ~ 1
&accent map=amp step=4n 1 .5
&lines [&kick * &accent, &hat]
&drumsOut play=&lines &kit
&out map=sample &drumsOut`;
  it('the stack is routed, and each wire into it routed by what the routing takes through it: its lines and their levels', () => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const all = routing(r, r.off);
    expect(all.nodes.has(cellId('lines'))).toBe(true);
    const model = writtenGraph(r);
    // (a wire is routed when, of each of its groups, the routing has one: engine/graph.ts, `routes`)
    const routed = (from: string, to: string) => {
      const e = model.edges.find((x) => x.from === cellId(from) && x.to === cellId(to));
      return !!e?.routes?.length && e.routes.every((g) => g.some((id) => all.edges.has(id)));
    };
    expect(['kick', 'hat', 'accent'].map((m) => [m, routed(m, 'lines')])).toEqual([
      ['kick', true],
      ['hat', true],
      ['accent', true],
    ]);
    expect(routed('lines', 'drumsOut')).toBe(true);
    // (each pair the routing takes past the stack, into the gate or the voices, is drawn, or drawn through it)
    for (const id of all.edges) {
      const [a, b] = id.split(/->|~>/);
      if (model.nodes.some((n) => n.id === a) && model.nodes.some((n) => n.id === b))
        expect(model.edges.some((e) => e.id === id) || model.through.has(id), `${id} is drawn`).toBe(true);
    }
  });
});

describe('a drummer: a gate whose kit holds the drums its lines name (#379, decision 064)', () => {
  const src = [
    '&bar meter("4/4") step=120bpm',
    '&bd s=sine loop=A1',
    '&sd s=white',
    '&hh s=white hpf=8000',
    '&rim s=white',
    '&kit &bd &sd &hh &rim',
    '&kick step=8n &bd ~ &bd ~',
    '&hat step=8n &hh &hh',
    '&lines [&kick, &hat]',
    '&drumsOut play=&lines &kit',
    '&drums map=role &drumsOut',
    '&out map=sample [&drumsOut]',
  ].join('\n');
  const r = compileSource(src);
  const g = writtenGraph(r);
  const rt = routing(r, new Set());
  const routed = (e: (typeof g.edges)[number]) => rt.edges.has(e.id) || !!e.routes?.every((any) => any.some((id) => rt.edges.has(id)));

  it('compiles without diagnostics', () => expect(r.diagnostics).toEqual([]));

  it("draws one kit, the gate's own: the grooves' kit isn't drawn again beside it", () => {
    expect(g.nodes.some((n) => n.id === cellId('kit:voices'))).toBe(false);
    expect(g.edges.some((e) => e.source === cellId('kit:voices') || e.target === cellId('kit:voices'))).toBe(false);
  });

  it('lights the kit, its struck drums and its wires while they play; a drum no line strikes stays unrouted', () => {
    expect(rt.nodes.has(cellId('kit'))).toBe(true);
    for (const id of [edgeId(cellId('kit'), cellId('out')), edgeId(cellId('drumsOut'), cellId('kit')), edgeId(cellId('kit'), cellId('bd')), edgeId(cellId('kit'), cellId('hh'))])
      expect(routed(g.edges.find((e) => e.id === id)!), id).toBe(true);
    expect(rt.nodes.has(cellId('rim'))).toBe(false);
    expect(rt.edges.has(edgeId(cellId('kit'), cellId('rim')))).toBe(false);
  });

  it('lights a role cell with the gate it names (decision 061)', () => {
    expect(rt.nodes.has(cellId('drums'))).toBe(true);
    expect(routed(g.edges.find((e) => e.id === edgeId(cellId('drums'), cellId('drumsOut')))!)).toBe(true);
  });
});

describe('a performer that plays its part moved, play=&line^$-12 (decision 058): its wires lit while it plays (#385)', () => {
  const r = compileSource(
    ['&bar meter("4/4") step=120bpm', '&line step=4n 0 2 4 7', '&bassV s=saw loop=C3', '&bassOut play=&line^$-12 &bassV', '&out map=sample [&bassOut]'].join('\n'),
  );
  const g = writtenGraph(r);
  const rt = routing(r, new Set());
  const routed = (from: string, to: string) => {
    const e = g.edges.find((x) => x.from === cellId(from) && x.to === cellId(to))!;
    return rt.edges.has(e.id) || !!e.routes?.every((any) => any.some((id) => rt.edges.has(id)));
  };
  it('compiles', () => expect(r.diagnostics).toEqual([]));
  it('the part into the gate, the gate into its voice, the voice into the card', () => {
    expect([routed('line', 'bassOut'), routed('bassOut', 'bassV'), routed('bassV', 'out')]).toEqual([true, true, true]);
  });
});
