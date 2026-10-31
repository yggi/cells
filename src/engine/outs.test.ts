import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { writtenGraph } from './graph';
import { outs, soundRole } from './outs';
import { kitOf } from './plays';
import { PRESETS } from './presets';
import { resolveSeed } from '../repository/library';

const compiled = (src: string) => compileSource(src, undefined, { resolve: resolveSeed });
const brief = (src: string) => outs(compiled(src)).map((o) => `${o.sound}→${o.card}${o.channel ? `:${o.channel}` : ''}`);

describe('outs: a sound wired into a card, on either card (decision 064)', () => {
  it('the smallest piece: its voice into the built-in card, which the graph holds on request', () => {
    const r = compiled('&a loop=A4');
    expect(outs(r)).toEqual([{ id: 'cell:a->cell:card:builtin', from: 'cell:a', sound: 'a', card: 'card:builtin', kind: 'sample', channel: null, left: true, right: true }]);
    expect(writtenGraph(r).nodes.map((n) => n.id)).toEqual(['cell:a']);
    expect(writtenGraph(r, { card: true }).nodes.map((n) => n.id)).toEqual(['cell:a', 'cell:card:builtin']);
  });

  it("a gate's voices are an out each: the performer plays, the voice sounds", () => {
    expect(brief('&t step=1 0 2\n&a s=saw\n&b s=sine\n&g play=&t [&a, &b]\n&out map=sample [&g]')).toEqual(['a→out', 'b→out']);
  });

  it('a MIDI card: an out each thing it sends, on its channel; a voice on both cards, an out on each', () => {
    expect(brief((PRESETS as Record<string, { source: string }>)['midi-out'].source)).toEqual(['groove→drums:10', 'reed→out', 'groove→out', 'reed→synth:1', 'sub→synth:2']);
  });

  it('a card of two channels: its first left, its second right', () => {
    const o = outs(compiled('&t step=1 0\n&a s=saw\n&b s=sine\n&l [&t * &a]\n&r [&t * &b]\n&out map=sample &l &r'));
    expect(o.map((x) => [x.sound, x.left, x.right])).toEqual([
      ['l', true, false],
      ['r', false, true],
    ]);
  });

  it('every example has an out, and only cards take them', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compiled(p.source);
      const o = outs(r);
      expect(o.length, key).toBeGreaterThan(0);
      for (const x of o) expect(soundRole(r, r.cells.get(x.card)!), `${key}: ${x.card}`).toBe('card');
    }
  });
});

describe('soundRole: what a cell does with sound, from its sort', () => {
  const r = compiled(
    [
      '&t step=1 0 2',
      '&a s=saw',
      '&w loop=220 0 1',
      '&bd s=sine loop=A1',
      '&kit &bd',
      '&groove over=&kit step=1 0 0',
      '&organ [&a, &w]',
      '&g play=&t &a',
      '&out map=sample [&g, &t * &organ, &groove]',
      '&m map=midi [&t * &a]',
    ].join('\n'),
  );
  const role = (n: string) => soundRole(r, r.cells.get(n)!);
  it('compiles', () => expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]));
  it.each([
    ['a', 'maker'],
    ['w', 'maker'],
    ['kit', 'maker'],
    ['groove', 'gate'],
    ['g', 'gate'],
    ['organ', 'mixer'],
    ['out', 'card'],
    ['m', 'card'],
    ['t', null],
  ])('&%s: %s', (n, want) => expect(role(n)).toBe(want));
  it('carries the sort on the cell', () => expect([r.cells.get('a')!.sort, r.cells.get('w')!.sort, r.cells.get('t')!.sort]).toEqual(['signal', 'wave', 'pitch']));
});

describe('kitOf: the kit a cell sounds through, and its drums (#385)', () => {
  const r = compiled('&bd s=sine loop=A1\n&hh s=white\n&kit &bd &hh\n&groove over=&kit step=1 0 1\n&t step=1 0\n&out map=sample [&groove, &t * &bd]');
  it.each([
    ['kit', { kit: 'kit', drums: ['bd', 'hh'] }],
    ['groove', { kit: 'kit', drums: ['bd', 'hh'] }],
    ['bd', null],
    ['t', null],
  ])('&%s', (n, want) => expect(kitOf(r, n)).toEqual(want));
});
