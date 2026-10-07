import { describe, expect, it } from 'vitest';
import { edgeLabel, isAttribute, stepLabel, transformLabel, type Transform } from './transform';

const wire = (port: string, transforms: readonly Transform[] = [[]], count = 1) => ({ port, count, transforms });

describe('a transform, spelt as written', () => {
  it('each step', () => {
    expect(stepLabel({ kind: 'pick', pick: { kind: 'slice', from: null, to: null, step: -1 } })).toBe('[::-1]');
    expect(stepLabel({ kind: 'pick', pick: { kind: 'at', i: 2 } })).toBe('[2]');
    expect(stepLabel({ kind: 'delay', by: 1, unit: 'step' })).toBe('[<<]');
    expect(stepLabel({ kind: 'delay', by: 3, unit: 'step' })).toBe('[<<3]');
    expect(stepLabel({ kind: 'delay', by: -2, unit: 'step' })).toBe('[>>2]');
    expect(stepLabel({ kind: 'delay', by: 0.375, unit: 'second' })).toBe('at=0.375');
    expect(stepLabel({ kind: 'degree', by: 1 })).toBe('degree +1');
    expect(stepLabel({ kind: 'degree', by: -2 })).toBe('degree -2');
    expect(stepLabel({ kind: 'inverse' })).toBe('inverse');
    expect(stepLabel({ kind: 'transpose', by: 7, unit: 'grid' })).toBe('^7');
    expect(stepLabel({ kind: 'transpose', by: -12, unit: 'grid' })).toBe('^-12');
    expect(stepLabel({ kind: 'transpose', by: -7, unit: 'semitone' })).toBe('−7');
    expect(stepLabel({ kind: 'transpose', by: 5, unit: 'semitone' })).toBe('+5');
    expect(stepLabel({ kind: 'negate' })).toBe('−');
    expect(stepLabel({ kind: 'gain', by: 0.4 })).toBe('×0.4');
    expect(stepLabel({ kind: 'gain', by: 1 / 3 })).toBe('×0.333');
  });

  it('a rate: its chain, per cycle, the whole braid, a belt', () => {
    const rate = (o: Partial<Extract<Transform[number], { kind: 'rate' }>>) => stepLabel({ kind: 'rate', by: [], per: 'step', whole: false, ...o });
    expect(rate({})).toBe('');
    expect(
      rate({
        by: [
          { op: '×', n: 2 },
          { op: '÷', n: 3 },
        ],
      }),
    ).toBe('×2÷3');
    expect(rate({ per: 'cycle' })).toBe('⟳');
    expect(rate({ whole: true, per: 'cycle', by: [{ op: '×', n: 2 }] })).toBe('loop ⟳×2');
    expect(rate({ by: [{ op: '÷', n: 2 }], belt: 30 })).toBe('÷2 · belt');
  });

  it('steps in order', () => {
    expect(
      transformLabel([
        { kind: 'pick', pick: { kind: 'slice', from: null, to: null, step: -1 } },
        { kind: 'inverse' },
        { kind: 'degree', by: 4 },
        { kind: 'transpose', by: 8, unit: 'grid' },
      ]),
    ).toBe('[::-1] inverse degree +4 ^8');
    expect(transformLabel([])).toBe('');
  });
});

describe('an edge’s label', () => {
  it('nothing written: no label', () => {
    for (const port of ['over', 'braid', 'step', 'mix', 'about', 'voice']) expect(edgeLabel(wire(port))).toBeUndefined();
  });

  it('names the attribute it feeds', () => {
    for (const port of ['fm', 'lpf', 'excite', 'couple', 'write']) expect([isAttribute(port), edgeLabel(wire(port))]).toEqual([true, port]);
    expect(edgeLabel(wire('play', [[{ kind: 'delay', by: 1.5, unit: 'second' }]]))).toBe('play at=1.5');
  });

  it('says how its port combines it: an envelope and a level multiply, a pitch adds or subtracts', () => {
    expect(edgeLabel(wire('env'))).toBe('×');
    expect(edgeLabel(wire('level', [[{ kind: 'delay', by: 1, unit: 'step' }]]))).toBe('[<<] ×');
    expect(edgeLabel(wire('pitch'))).toBe('+');
    expect(edgeLabel(wire('pitch', [[{ kind: 'negate' }]]))).toBe('−');
  });

  it('a ref written several times: its count, and each different transform once (three at most, then …)', () => {
    const up = (n: number): Transform => [{ kind: 'transpose', by: n, unit: 'grid' }];
    expect(edgeLabel(wire('braid', [[], up(7), up(7)], 3))).toBe('×3 ^7');
    expect(edgeLabel(wire('braid', [up(-4), up(3), up(-2)], 3))).toBe('×3 ^-4 ^3 ^-2');
    expect(edgeLabel(wire('braid', [up(1), up(2), up(3), up(4)], 4))).toBe('×4 ^1 ^2 ^3 …');
  });
});
