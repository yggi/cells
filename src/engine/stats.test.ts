import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { writtenGraph } from './graph';
import { pieceStats, spread } from './stats';

describe('spread', () => {
  it('min, max, mean and median; an even count takes the middle two', () => {
    expect(spread([4, 1, 3, 2])).toEqual({ min: 1, max: 4, mean: 2.5, median: 2.5 });
    expect(spread([5, 1, 9])).toEqual({ min: 1, max: 9, mean: 5, median: 5 });
    expect(spread([])).toEqual({ min: 0, max: 0, mean: 0, median: 0 });
  });
});

// (lifted from yggi/cell-studio src/layout/stats.drawn.test.ts @ 23a5972, #326: what a piece's numbers count is the language's)
describe('a piece’s numbers (pieceStats)', () => {
  const text = [
    '# a comment',
    '&bar scan(1 1 1 1) step=90bpm',
    '&key scale(minor, C)',
    '&m 0 1 2',
    '&tune over=&key step=1m &m &m^1 4 ~',
    '',
    '&lead s=tri loop=C4 env=&(map=adsr .01 .2 .6 .1)',
    '&mix map=sample [&tune * &lead * .5]',
  ].join('\n');
  const r = compileSource(text);
  // (the graph as written, not as a workbench draws it: its wires and nets are the drawing's, counted in Cell studio's
  // stats.drawn.test.ts; a meter's node is the same in both, and the rest counts the text and its cells)
  const s = pieceStats(r, { ...writtenGraph(r), nets: [], alias: new Map(), bulbs: new Map() }, text);

  it('counts the cells written by kind, not the implicit grid nor a built-in card', () => {
    expect(s.cells).toBe(7);
    expect(s.unnamed).toBe(1);
    expect(s.kinds).toMatchObject({ meter: 1, table: 1, line: 2, voice: 1, envelope: 1, card: 1 });
  });

  it('counts the splices and braid steps each cell writes', () => {
    expect(s.splices).toBe(2);
    expect(s.spliced).toBe(1);
    // &m 3, &tune 4, the envelope 4 (a scan, a blank braid and a mix's entries aren't written steps)
    expect(s.steps).toBe(11);
    expect(s.perCell).toEqual({ min: 3, max: 4, mean: 11 / 3, median: 4 });
  });

  it('counts the lines that say something, and every character', () => {
    expect(s.lines).toBe(6);
    expect(s.chars).toBe(text.length);
  });
});
