// Decisions 091 (#757) and 095 (#778): a piece has one root meter, the meter with a tempo of its own, wherever it is
// written; a second one is an error that writes the tap it is derived by. The clocks of the wall
// (loop=1d) are the environment's: where a piece has several and no meter of its own, a tap names the one it reads.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { soundsIdentical } from './sameness';

const errors = (text: string) =>
  compileSource(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const REST = ['&lead s=saw loop=C4', '&t step=4n 0 2 4 5', '&out map=sample [&t * &lead]'];
const WALTZ = '&waltz meter("3/4") step=60bpm';
const MARCH = '&march meter("4/4") step=120bpm';
const MINUTE = '&minute scan(1!60) loop=1min';
const HOUR = '&hour scan(1!60) loop=1h';

describe('one root meter a piece (decision 095)', () => {
  it('a second meter with a tempo of its own is an error on its line, which writes its tap', () => {
    expect(errors([MARCH, WALTZ, ...REST].join('\n'))).toEqual([expect.stringContaining('&waltz is a second meter with a tempo of its own, and a piece has one (&march)')]);
    expect(errors([MARCH, WALTZ, ...REST].join('\n'))[0]).toContain('step=pulse/2');
    // (a tempo read from a cell is a tempo of its own too)
    expect(errors([MARCH, '&waltz meter("3/4") step=&tempo/2', '&tempo step=120bpm', ...REST].join('\n'))).toEqual([expect.stringContaining('&waltz is a second meter')]);
  });

  it('a second meter left to a slider keeps its error: two sliders are no ratio', () => {
    const text = [MARCH, '&waltz meter("3/4") step=free(60bpm, 40..90)', ...REST].join('\n');
    expect(errors(text)).toHaveLength(1);
  });

  it('a meter that taps another is never the root, wherever it is written', () => {
    const clave = '&clave scan(3 3 4 3 3) step=pulse*5/4';
    const rest = [...REST.slice(0, 2), '&k step=&clave:pulse 7!5', '&out map=sample [&t * &lead, &k * &lead]'];
    const a = [MARCH, clave, ...rest].join('\n');
    const b = [clave, MARCH, ...rest].join('\n');
    for (const text of [a, b]) {
      const r = compileSource(text);
      expect(r.diagnostics).toEqual([]);
      expect(r.mainMeter).toBe('march');
      expect(r.meters).toBeUndefined();
    }
    expect(soundsIdentical(a, b)).toBe(true);
  });
});

describe('the clocks of the wall (decisions 091, 095)', () => {
  it('a wall clock beside the root is no second meter, and the root is the main meter wherever it is written', () => {
    const day = '&day scan(1!24) loop=1d';
    for (const lines of [
      [day, MARCH],
      [MARCH, day],
    ]) {
      const r = compileSource([...lines, ...REST].join('\n'));
      expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(r.mainMeter).toBe('march');
    }
  });

  it('several wall clocks and no meter: a bare tap is an error that lists them, in either order', () => {
    for (const lines of [
      [MINUTE, HOUR],
      [HOUR, MINUTE],
    ]) {
      const [first] = lines.map((l) => l.split(' ')[0]);
      const said = errors([...lines, ...REST].join('\n'));
      expect(said).toEqual([expect.stringContaining('names no meter, and the piece has 2 with a tempo of their own')]);
      expect(said[0]).toContain(`step=${first}:4n`);
    }
  });

  it('a tap that names its clock plays the same whatever the order of the clocks', () => {
    const rest = REST.map((l) => l.replace('step=4n', 'step=&minute:4n'));
    const a = [MINUTE, HOUR, ...rest].join('\n');
    const b = [HOUR, MINUTE, ...rest].join('\n');
    expect(errors(a)).toEqual([]);
    expect(soundsIdentical(a, b)).toBe(true);
    expect(compileSource(a).meters).toEqual(['minute', 'hour']);
  });
});
