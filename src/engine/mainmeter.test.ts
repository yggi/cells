// Decision 091 (#757): the main meter is the meter with a tempo of its own, wherever it is written; where a piece has
// several, a tap names its meter, and the order of the meters' lines changes nothing.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { migrate } from './migrate';
import { soundsIdentical } from './sameness';

const errors = (text: string) =>
  compileSource(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const REST = ['&lead s=saw loop=C4', '&t step=4n 0 2 4 5', '&out map=sample [&t * &lead]'];
const WALTZ = '&waltz meter("3/4") step=60bpm';
const MARCH = '&march meter("4/4") step=120bpm';

describe('the main meter (decision 091)', () => {
  it('a bare tap in a piece of two meters is an error that lists them, in either order', () => {
    for (const lines of [
      [WALTZ, MARCH],
      [MARCH, WALTZ],
    ]) {
      const [first] = lines.map((l) => l.split(' ')[0]);
      const said = errors([...lines, ...REST].join('\n'));
      expect(said).toEqual([expect.stringContaining('names no meter, and the piece has 2 with a tempo of their own')]);
      expect(said[0]).toContain(`step=${first}:4n`);
    }
  });

  it('a tap that names its meter plays the same whatever the order of the meters', () => {
    const rest = REST.map((l) => l.replace('step=4n', 'step=&waltz:4n'));
    const a = [WALTZ, MARCH, ...rest].join('\n');
    const b = [MARCH, WALTZ, ...rest].join('\n');
    expect(errors(a)).toEqual([]);
    expect(soundsIdentical(a, b)).toBe(true);
    expect(compileSource(a).meters).toEqual(['waltz', 'march']);
  });

  it('a meter that taps another is never the main one, wherever it is written', () => {
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

  it('a wall clock is the main meter only where no meter steps', () => {
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

  it('Migrate names the meter a bare tap read, the first in the text, and it plays as it did', () => {
    const before = [WALTZ, MARCH, ...REST].join('\n');
    const { source, steps } = migrate(before);
    expect(steps).toHaveLength(1);
    expect(source).toContain('&t step=&waltz:4n 0 2 4 5');
    expect(errors(source)).toEqual([]);
    expect(migrate(source).steps).toEqual([]);
  });

  it('a time parameter that reads a tap names its meter too, and Migrate writes it', () => {
    const text = [WALTZ, MARCH, '&lead s=saw loop=C4 delay=.3 delaytime=8n', '&t step=&waltz:4n 0 2 4 5', '&out map=sample [&t * &lead]'].join('\n');
    expect(errors(text)).toEqual([expect.stringContaining('delaytime=&waltz:8n')]);
    const { source } = migrate(text);
    expect(source).toContain('delaytime=&waltz:8n');
    expect(errors(source)).toEqual([]);
  });
});
