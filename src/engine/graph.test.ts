import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { writtenGraph } from './graph';
import { cellId } from './ids';
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
