// A render's span (#315, option A): one rule, read by the MIDI file and by any render after it. A piece that ends is
// taken whole, a loop one cycle, a piece that never comes round its longest layer or a minute; the caller's seconds win,
// every span is capped, and each says why it is that long.
import { describe, expect, it } from 'vitest';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { plan } from './realize';
import { pieceMidi } from './midiexport';
import { LONGEST, spanOf, TAIL, UNBOUNDED } from './span';
import { resolveSeed } from '../repository/library';

const spanFor = (text: string, options = {}) => {
  const r = compileSource(text);
  return spanOf(r, plan(r, codeShifts(r)), options);
};
const V = '\n&v s=sine loop=C4\n&o map=sample [&t * &v]';

describe('a render’s span', () => {
  it('a piece that ends is taken whole, and a tail after it', () => {
    expect(spanFor(`&bar meter("4/4") step=120bpm laps=3\n&t step=4n 0 2 4 7${V}`)).toEqual({ from: 0, to: 6, tail: TAIL, why: 'ends', capped: false });
  });

  it('a loop is one cycle, every layer back together: 3 bars against 2 is 6', () => {
    expect(spanFor(`&bar meter("4/4") step=120bpm\n&t step=1m 0 2 4\n&u step=1m 0 7\n&o2 map=sample [&t * &v, &u * &v]\n&v s=sine loop=C4`)).toMatchObject({
      to: 12,
      why: 'cycle',
    });
  });

  it('a piece that never comes round is a minute', () => {
    expect(spanFor('&v s=sine loop=C4')).toMatchObject({ to: UNBOUNDED, why: 'unbounded' });
  });

  it('the caller’s seconds, start and tail win; every span is capped, an hour by default', () => {
    const text = `&bar meter("4/4") step=120bpm laps=3\n&t step=4n 0 2 4 7${V}`;
    expect(spanFor(text, { seconds: 4, from: 1, tail: 0 })).toEqual({ from: 1, to: 5, tail: 0, why: 'given', capped: false });
    expect(spanFor(text, { longest: 5 })).toMatchObject({ to: 5, capped: true });
    expect(spanFor(text, { seconds: 2 * LONGEST })).toMatchObject({ to: LONGEST, capped: true });
  });

  it('a MIDI file is as long as the span: the piece whole, or the seconds asked for', () => {
    const r = compileSource(`&bar meter("4/4") step=120bpm laps=3\n&t step=4n 0 2 4 7${V}`);
    const notes = (span = {}) => pieceMidi(r, codeShifts(r), r.off, undefined, span).smf.tracks.flatMap((t) => t.notes).length;
    expect(notes()).toBe(12);
    expect(notes({ seconds: 2 })).toBe(4);
  });
});

describe('the MIDI file’s signature', () => {
  const meters = (bar: string) => {
    const r = compileSource(`&bar ${bar} step=60bpm laps=2\n&t step=1m 0!2${V}`);
    return pieceMidi(r, codeShifts(r)).smf.meters;
  };
  it('is the main meter’s where its beat is a quarter note, the file’s quarter', () => {
    expect(meters('meter("4/4")')).toEqual([{ tick: 0, num: 4, den: 4 }]);
    expect(meters('meter("3/4")')).toEqual([{ tick: 0, num: 3, den: 4 }]);
    expect(meters('meter("5/4")')).toEqual([{ tick: 0, num: 5, den: 4 }]);
    expect(meters('scan(1 1 1 1)')).toEqual([{ tick: 0, num: 4, den: 4 }]);
  });
  it('is left out where the beat is another value: the file writes a beat as a quarter, so 6/8 would draw wrong bars', () => {
    for (const bar of ['meter("6/8")', 'meter("12/8")', 'meter("7/8")', 'meter("4/4") beat=2']) expect(meters(bar), bar).toEqual([]);
  });
  it('is the meter’s where its rate is a cell (step=&tempo), as a seed meter’s is', () => {
    const at = (text: string) => {
      const r = compileSource(text, undefined, { resolve: resolveSeed });
      expect(r.diagnostics, text).toEqual([]);
      return pieceMidi(r, codeShifts(r)).smf.meters;
    };
    expect(at(`&tempo step=60bpm\n&bar meter("3/4") step=&tempo laps=2\n&t step=1m 0!2${V}`)).toEqual([{ tick: 0, num: 3, den: 4 }]);
    expect(at(`use &bar from "4/4 swung on 8n"\n&tempo step=120bpm\n&t step=1m 0!2${V}`)).toEqual([{ tick: 0, num: 4, den: 4 }]);
    expect(at(`use &bar from "6/8"\n&tempo step=120bpm\n&t step=1m 0!2${V}`)).toEqual([]);
  });
  it('is left out with no main meter', () => {
    const r = compileSource(`&t step=4 0 2 4 7${V}`);
    expect(pieceMidi(r, codeShifts(r)).smf.meters).toEqual([]);
  });
});
