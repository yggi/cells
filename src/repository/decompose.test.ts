import { describe, expect, it } from 'vitest';
import { decompose, writtenOut } from './decompose';

/** A text the forms and the seed motifs play, written out bar by bar as the line `&lead`, in `meter`. */
const written = (text: string, cell: string, meter = '4/4') => writtenOut(text, cell, meter, 'lead')!;

const TWINKLE = written('&twinkle from twinkle &key\n&wonder from wonder &key\n&song from ternary(answer=&wonder) &twinkle', 'song');

describe('a line of several bars decomposed into a form and its motifs (#512, rung 1)', () => {
  it('writes Twinkle out bar by bar as the example writes it whole: ternary, its answer wonder, over twinkle', () => {
    expect(TWINKLE).toBe('&lead over=&key step=8n 0 0 4 4 5 5 4@2 3 3 2 2 1 1 0@2 4 4 3 3 2 2 1@2 4 4 3 3 2 2 1@2 0 0 4 4 5 5 4@2 3 3 2 2 1 1 0@2');
    const d = decompose(TWINKLE, 'lead', '4/4');
    expect(d).toMatchObject({ form: 'ternary', call: 'twinkle', helpers: { answer: 'wonder' } });
    expect(d.text).toBe(['&twinkle from twinkle &key', '&wonder from wonder &key', '&lead from ternary(answer=&wonder) &twinkle'].join('\n'));
  });

  it('writes Hänschen klein out as the example writes it whole: rounded binary over haenschen, its answers and bridge the tune’s', () => {
    const line = written(
      [
        '&haenschen from haenschen &key',
        '&hinein from hinein &key',
        '&heim from heim &key',
        '&weinet from weinet &key',
        '&song from rounded_binary(answer=&hinein, close=&heim, bridge=&weinet) &haenschen',
      ].join('\n'),
      'song',
    );
    expect(decompose(line, 'lead', '4/4')).toMatchObject({
      form: 'rounded_binary',
      call: 'haenschen',
      helpers: { answer: 'hinein', close: 'heim', bridge: 'weinet' },
    });
  });

  it('plays what the line plays: the decomposition, read back, is the line written out', () => {
    const d = decompose(TWINKLE, 'lead', '4/4');
    expect(writtenOut(d.text, 'lead', '4/4')).toBe(TWINKLE);
  });

  it('takes a call that is no seed motif as a line of its own, where the form still says less than the bars', () => {
    const line = written('&tune over=&key step=8n 0 2 1 3 2 4 3 5\n&song from call_and_answer &tune', 'song');
    const d = decompose(line, 'lead', '4/4');
    expect(d).toMatchObject({ form: 'call_and_answer', call: null, helpers: {} });
    expect(d.text).toBe(['&leadCall over=&key step=8n 0 2 1 3 2 4 3 5', '&lead from call_and_answer &leadCall'].join('\n'));
    expect(writtenOut(d.text, 'lead', '4/4')).toBe(line);
  });

  it('leaves a line that is no form as it was', () => {
    const line = '&lead over=&key step=8n 0 2 4 2 0 1 3 5 6 4 2 0 -1 -3 -2 0';
    expect(decompose(line, 'lead', '4/4')).toEqual({ text: line, form: null, call: null, helpers: {}, structure: expect.any(Number) });
  });

  it('leaves a line of one bar, of a part of a bar, or on the sixteenths as it was: a form splices whole bars of eighths', () => {
    for (const line of [
      '&lead over=&key step=8n 0 0 4 4 5 5 4@2',
      '&lead over=&key step=8n 0 0 4 4',
      '&lead over=&key step=16n 0 ~ 2 ~ 4 ~ 2 ~ 0 ~ ~ ~ ~ ~ ~ ~ 0 ~ 2 ~ 4 ~ 2 ~ 0 ~ ~ ~ ~ ~ ~ 1',
    ])
      expect(decompose(line, 'lead', '4/4').form, line).toBeNull();
  });

  it('reads a line in its own meter: a waltz’s call and answer in 3/4', () => {
    const line = written('&waltz from waltz &key\n&song from call_and_answer &waltz', 'song', '3/4');
    expect(decompose(line, 'lead', '3/4')).toMatchObject({ form: 'call_and_answer', call: 'waltz', helpers: {} });
    expect(decompose(line, 'lead', '4/4').form).toBeNull();
  });
});
