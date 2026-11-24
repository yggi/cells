// #744: no message names a cell by the name the language made for it (`&λ17_36`); it says where the cell is written.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { offProblem } from './edit';
import { spoken } from './spoken';
import { resolveSeed } from '../repository/library';

const BAR = '&bar meter("4/4") step=120bpm';
const lines = (...xs: string[]) => xs.join('\n');

describe('a generated name, said (#744)', () => {
  it('as where its cell is written: a cell in place, a scale in place, a style’s moving axis', () => {
    expect(spoken('Two sounds can’t multiply (&λ3_12 * &λ3_32)')).toBe('Two sounds can’t multiply (the cell at line 3, column 12 * the cell at line 3, column 32)');
    expect(spoken('&scale:λ2_14 reads no key')).toBe('the scale at line 2, column 14 reads no key');
    expect(spoken('&λstyle_2 is a sound')).toBe('&style’s bite is a sound'.replace('’', "'"));
    expect(spoken('&bassline is a melody')).toBe('&bassline is a melody');
  });

  // (texts whose cells are written in place, unnamed, each meeting a message that names one)
  const TEXTS = [
    lines(BAR, '&t step=4n 0 1', '&out [&t * &(s=sine loop=C4) * &(s=saw)]'),
    lines(BAR, '&t step=4n 0 1', '&v s=sine loop=C4', '&out [&t * &v * &(gain=2)]'),
    lines(BAR, '&t step=4n 0 1', '&out [&t * &(map=adsr 0 .1 0 0)]'),
    lines(BAR, '&t over=scale(major, C) step=4n 0 1', '&out [&t * &(s=sine loop=C4 lpf=&nope)]'),
    lines(
      BAR,
      '&funk map=style sync=1 harm=.1 bite=.8 mood=.6',
      '&d [&funk[bite] + &dd]',
      '&dd free(.1, 0..1)',
      '&w s=saw loop=C3 lpf=200..2000 * &d',
      '&t step=4n 0',
      '&out [&t * &w]',
    ),
  ];

  it('in no diagnostic of a text whose cells are written in place', () => {
    let said = 0;
    for (const text of TEXTS) {
      const messages = compileSource(text, undefined, { resolve: resolveSeed }).diagnostics.map((d) => d.message);
      said += messages.length;
      expect(
        messages.filter((m) => m.includes('λ')),
        text,
      ).toEqual([]);
    }
    expect(said).toBeGreaterThan(2);
  });

  it('in no reason a cell can’t be switched off', () => {
    const reason = offProblem(lines(BAR, '&t step=4n 0 1', '&out [&t * &(s=sine loop=C4)]'), 'λ3_11');
    expect(reason).toBe('the cell at line 3, column 11 is no cell of this piece’s to switch off'.replace('’', "'"));
  });
});
