// A meter derived from another (#778, rung 1): a meter(…) stepped by a tap of a meter is a meter of its own, a step of
// the tap a beat of it, and lines read it by pulse, beat, note value or bar as they read any meter. It plays what the same
// meter at the tempo the tap gives plays, and it follows the meter it taps.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { soundsIdentical } from './sameness';

const errors = (text: string) =>
  compileSource(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const READERS = [
  '&lead s=saw loop=C4',
  '&a step=&march:4n 0 2 4 5',
  '&b step=&second:4n 7 9 11',
  '&c step=&second:8n 12 14',
  '&d step=&second:beat 3',
  '&e step=&second:pulse 4',
  '&f step=&second:1m 5',
  '&out map=sample [&a * &lead, &b * &lead, &c * &lead, &d * &lead, &e * &lead, &f * &lead]',
];
// (a second meter with a tempo of its own is the old way, decision 093: read so, to compare a derived one with it)
const OLD = { old: true };
const piece = (march: string, second: string) => [`&march meter("4/4") ${march}`, `&second ${second}`, ...READERS].join('\n');

describe('a meter derived from another (#778, rung 1)', () => {
  it.each([
    ['3/4 at half the beat', 'meter("3/4") step=beat/2', 'meter("3/4") step=60bpm'],
    ['the same by a note value', 'meter("3/4") step=2n', 'meter("3/4") step=60bpm'],
    ['the same, its meter named', 'meter("3/4") step=&march:beat/2', 'meter("3/4") step=60bpm'],
    ['6/8, its beat a dotted quarter', 'meter("6/8") step=beat/3', 'meter("6/8") step=40bpm'],
    ['7/8, three unequal beats', 'meter("7/8") step=beat*3/4', 'meter("7/8") step=90bpm'],
    ['a phase, 121 against 120', 'meter("4/4") step=beat*121/120', 'meter("4/4") step=121bpm'],
  ])('%s plays as the same meter at that tempo', (_, derived, own) => {
    expect(errors(piece('step=120bpm', derived))).toEqual([]);
    expect(soundsIdentical(piece('step=120bpm', derived), piece('step=120bpm', own), undefined, OLD)).toBe(true);
  });

  it('follows the meter it taps: the root’s tempo moved moves it, where a tempo of its own stays', () => {
    const derived = 'meter("3/4") step=beat/2';
    expect(soundsIdentical(piece('step=90bpm', derived), piece('step=90bpm', 'meter("3/4") step=45bpm'), undefined, OLD)).toBe(true);
    expect(soundsIdentical(piece('step=90bpm', derived), piece('step=90bpm', 'meter("3/4") step=60bpm'), undefined, OLD)).toBe(false);
  });

  it('is not the piece’s main meter, wherever it is written', () => {
    const lines = piece('step=120bpm', 'meter("3/4") step=beat/2').split('\n');
    const swapped = [lines[1]!, lines[0]!, ...lines.slice(2)].join('\n');
    for (const text of [lines.join('\n'), swapped]) expect(compileSource(text).mainMeter).toBe('march');
    expect(soundsIdentical(lines.join('\n'), swapped)).toBe(true);
  });

  it('a meter nothing taps is a line as it was, and a scan tapped is the clock it was', () => {
    const lone = ['&march meter("4/4") step=120bpm', '&second meter("3/4") step=beat/2', '&lead s=saw loop=C4', '&a step=4n 0 2 4 5', '&out map=sample [&a * &lead]'].join('\n');
    expect(compileSource(lone).clocks.has('second')).toBe(false);
    const clave = [
      '&march meter("4/4") step=120bpm',
      '&clave scan(3 3 4 3 3) step=pulse*5/4',
      '&lead s=saw loop=C4',
      '&k step=&clave:pulse 7!5',
      '&out map=sample [&k * &lead]',
    ].join('\n');
    expect(errors(clave)).toEqual([]);
    expect(compileSource(clave).clocks.get('clave')?.positional).toBe(true);
  });
});
