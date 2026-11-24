import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { EXAMPLES } from './examples';
import { resolveSeed } from '../repository/library';
import { writtenGraph } from './graph';
import { cellId } from './ids';
import { edgeLabel, transformLabel } from './transform';

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
&bd note=36 s=sine loop=A1
&hh note=42 s=white
&kit &bd &hh
&kick note=36 step=8n 0 ~ 0 ~
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

describe('a name written in a form that reads it is one wire (#737, #618)', () => {
  const TAIL = '&t step=8n 0 1 2\n&v s=sine loop=C4\n&o [&t * &v]';
  const edges = (text: string) => {
    const r = compileSource(text);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return writtenGraph(r).edges;
  };
  const wire = (text: string, from: string, to: string) => edges(text).filter((e) => e.from === cellId(from) && e.to === cellId(to));

  it("a meter's bend table is a wire into the meter, and so is each cell moving its depth", () => {
    const bar = '&bar meter("12/8") step=60bpm';
    expect(wire(`${bar} bend=8n:&lean\n&lean 4 3 3\n${TAIL}`, 'lean', 'bar').map((e) => e.port)).toEqual(['bend']);
    const moved = `${bar} bend=8n:&lean:&k\n&lean 4 3 3\n&k 1\n${TAIL}`;
    expect(wire(moved, 'lean', 'bar')).toHaveLength(1);
    expect(wire(moved, 'k', 'bar')).toHaveLength(1);
    expect(wire(`${bar}\n&lean 4 3 3\n${TAIL}`, 'lean', 'bar')).toEqual([]);
  });

  it('a style= is a wire from each style it names into the cell it places', () => {
    const text = '&calm map=style .3 .45 .55 .55\n&tense map=style .6 .5 .6 .4\n&x style=[&calm * .5, &tense * .5]\n&bar meter("4/4") step=100bpm\n' + TAIL;
    expect(wire(text, 'calm', 'x').map((e) => e.port)).toEqual(['style']);
    expect(wire(text, 'tense', 'x')).toHaveLength(1);
  });

  it('a sum of cells in a braid is a wire from each cell it names into the sum, a repeat counted', () => {
    const text = `&bar meter("4/4") step=100bpm\n&a 1\n&b 1\n&drift [&a * .5 + &b * .3 + &a * .2]\n${TAIL}`;
    const a = wire(text, 'a', 'drift');
    expect(a.map((e) => [e.port, e.count])).toEqual([['braid', 2]]);
    expect(wire(text, 'b', 'drift')).toHaveLength(1);
  });

  it('a cell that is one number, and notes with their levels, named in a mix are wires (decisions 087, 088)', () => {
    const text = `&bar meter("4/4") step=100bpm\n&lvl .4\n&roots step=1m 0 5\n&line [&roots * .5]\n&v s=saw loop=A1\n&out map=sample [&line * &v * &lvl]\n`;
    const edges = writtenGraph(compileSource(text), { card: true }).edges;
    // (the card reads the number whole; the named notes' own product names its cell; the card's product takes them in)
    expect(edges.filter((e) => e.from === cellId('lvl') && e.to === cellId('out')).map((e) => e.port)).toEqual(['braid']);
    expect(edges.filter((e) => e.from === cellId('roots') && e.to === cellId('line')).map((e) => e.port)).toEqual(['braid']);
    expect(edges.some((e) => e.from === cellId('line') && e.to.startsWith('junction:out'))).toBe(true);
    // (a sum of values draws each cell it names, once, as it did)
    expect(wire(`&bar meter("4/4") step=100bpm\n&a 1\n&b 1\n&drift [&a * .5 + &b * .3 + &a * .2]\n${TAIL}`, 'a', 'drift')).toHaveLength(1);
  });

  it('the radio and twelve draw what they write: the drift, the style, the bend', () => {
    const graph = (key: string) => writtenGraph(compileSource(EXAMPLES[key as keyof typeof EXAMPLES].source, undefined, { resolve: resolveSeed }), { card: true }).edges;
    const has = (key: string, from: string, to: string, port: string) => graph(key).some((e) => e.from === cellId(from) && e.to === cellId(to) && e.port === port);
    for (const term of ['section', 'song', 'set']) expect(has('radio', term, 'drift', 'braid'), term).toBe(true);
    expect(has('radio', 'mine', 'style', 'style')).toBe(true);
    expect(has('twelve', 'lean', 'bar', 'bend')).toBe(true);
  });

  it('no two cells are wired both ways by their reads: a name another rule wired (a gate stack) is not wired again', () => {
    for (const [key, { source }] of Object.entries(EXAMPLES)) {
      const pairs = new Map<string, string>();
      for (const e of writtenGraph(compileSource(source, undefined, { resolve: resolveSeed }), { card: true }).edges.filter((x) => x.port === 'braid')) {
        const [a, b] = [e.source, e.target].sort();
        const was = pairs.get(`${a}|${b}`);
        expect(was === undefined || was === e.source, `${key}: ${e.source} and ${e.target} are wired both ways`).toBe(true);
        pairs.set(`${a}|${b}`, e.source);
      }
    }
  });
});

describe('a cell the compile reads by value, or makes for a slot, is still a wire (#618)', () => {
  const edges = (text: string) => {
    const r = compileSource(text);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return { r, edges: writtenGraph(r).edges };
  };
  const TAIL = '&t over=&key step=8n 0 1 2\n&v s=sine loop=C4\n&o [&t * &v]';
  const BAR = '&bar meter("4/4") step=100bpm\n&tonic D\n&mode 2\n&k 7\n&n 12';

  it("a key's mode cell is a wire into the key: scale(&mode, …) and even(7, 12, &mode), and each argument of even that is a cell", () => {
    const into = (key: string, from: string) => edges(`${BAR}\n${key}\n${TAIL}`).edges.filter((e) => e.from === cellId(from) && e.to === cellId('key'));
    expect(into('&key scale(&mode, &tonic)', 'mode').map((e) => e.port)).toEqual(['braid']);
    expect(into('&key scale(even(7, 12, &mode), &tonic)', 'mode')).toHaveLength(1);
    const arguments_ = '&key scale(even(&k, &n, &mode), &tonic)';
    for (const name of ['k', 'n', 'mode']) expect(into(arguments_, name), name).toHaveLength(1);
    expect(into('&key scale(dorian, &tonic)', 'mode')).toEqual([]);
  });

  it('the wire into the cell made for a slot says the slot as it is written: by name, [bite]; by position, [$2] (#858)', () => {
    const wireOf = (read: string) => {
      const text = `&calm map=style .3 .45 .55 .55\n&style style=&calm\n&bar meter("4/4") step=100bpm\n&t step=8n 0 1 2\n&v s=sine loop=C4 lpf=250..1600 * ${read}\n&o [&t * &v]`;
      const { r, edges: all } = edges(text);
      const made = [...r.cells.values()].find((c) => c.readsSlot?.cell === 'style')!;
      const wire = all.find((e) => e.from === cellId('style') && e.to === cellId(made.name))!;
      return { label: transformLabel(wire.transforms[0]!), steps: wire.transforms[0]!.map((t) => t.kind) };
    };
    expect(wireOf('&style[bite]')).toEqual({ label: '[bite]', steps: ['pick'] });
    expect(wireOf('&style[$2]')).toEqual({ label: '[$2]', steps: ['pick'] });
  });

  it('a style read by slot is a wire from the style into the cell made for it, and that cell goes on into the reader', () => {
    const text = `&calm map=style .3 .45 .55 .55\n&style style=&calm\n&bar meter("4/4") step=100bpm\n&t step=8n 0 1 2\n&v s=sine loop=C4 lpf=250..1600 * &style[bite]\n&o [&t * &v]`;
    const { r, edges: all } = edges(text);
    const made = [...r.cells.values()].filter((c) => c.readsSlot?.cell === 'style');
    expect(made).toHaveLength(1);
    const name = made[0]!.name;
    expect(all.filter((e) => e.from === cellId('style') && e.to === cellId(name)).map((e) => e.port)).toEqual(['style']);
    expect(all.filter((e) => e.from === cellId(name) && e.to === cellId('v')).map((e) => e.port)).toEqual(['lpf']);
  });
});

describe("a meter's swing cell is a wire into the meter (#825)", () => {
  const TAIL = '&t step=8n 0 1 2\n&v s=sine loop=C4\n&o [&t * &v]';
  const wire = (text: string, from: string) => {
    const r = compileSource(text);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    return writtenGraph(r).edges.filter((e) => e.from === cellId(from) && e.to === cellId('bar'));
  };
  it('swing=&swing, a cell that is a swing alone: one wire, port swing', () => {
    const text = `&bar meter("4/4") step=100bpm swing=&sw\n&sw swing=8n:.6\n${TAIL}`;
    expect(wire(text, 'sw').map((e) => [e.port, e.band])).toEqual([['swing', 'cv']]);
  });
  it('swing=8n:&lean, a share moved by a cell, and the cells that scale a range: each is a wire into the meter', () => {
    expect(wire(`&bar meter("4/4") step=100bpm swing=8n:&lean\n&lean .6\n${TAIL}`, 'lean').map((e) => e.port)).toEqual(['swing']);
    expect(wire(`&bar meter("4/4") step=100bpm swing=8n:.5...75 * &k\n&k 1\n${TAIL}`, 'k').map((e) => e.port)).toEqual(['swing']);
  });
  it('a meter with a swing written on it has no such wire', () => {
    expect(wire(`&bar meter("4/4") step=100bpm swing=8n:.6\n&lean .6\n${TAIL}`, 'lean')).toEqual([]);
  });
});
