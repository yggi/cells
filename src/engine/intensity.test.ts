import { describe, expect, it } from 'vitest';
import { compileSource as compileAlone } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { resolveSeed } from '../repository/library';

const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });

/** A piece of eight bars, a note a bar (120 bpm, 2 s a bar), its level `&i` times `factor`, with these lines. */
const piece = (lines: readonly string[], factor = '&i') =>
  ['&bar meter("4/4") step=120bpm', '&line step=1m 0!8', '&v s=saw loop=C4', `&out map=sample [&line * &v * ${factor}]`, ...lines].join('\n');

/** Each bar's level, over the eight bars. */
const levels = (lines: readonly string[], factor?: string) => {
  const r = compileSource(piece(lines, factor));
  expect(r.diagnostics.map((d) => d.message)).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, 16).map((e) => Math.round(e.levels[0]!.level * 1e6) / 1e6);
};

const errors = (lines: readonly string[]) =>
  compileSource(piece(lines))
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe('a section’s intensity: its song’s plus its kind’s offset, a sum the levels read (decision 096, #571)', () => {
  it('an offset is a term of the sum: a constant, or a cell by a gain of −1', () => {
    expect(levels(['&song step=1m .7', '&i [&song + -.45]'])).toEqual(Array<number>(8).fill(0.25));
    expect(levels(['&song step=1m .7', '&breakdown step=1m .45', '&i [&song + &breakdown * -1]'])).toEqual(Array<number>(8).fill(0.25));
  });

  it('a build ramps by a line over its bars, Jambot’s −0.15 to +0.3 (`barEnergy`)', () => {
    expect(levels(['&song step=1m .5', '&rise step=1m 0 .25 .5 .75 1', '&i [&song + -.15 + &rise * .45]'])).toEqual([0.35, 0.4625, 0.575, 0.6875, 0.8, 0.35, 0.4625, 0.575]);
  });

  it('a sum is held to 0…1 at its own cell, a term of another sum too (decision 079): so an offset is a number, not a sum of its own', () => {
    expect(levels(['&song step=1m .9', '&i [&song + .3]'])).toEqual(Array<number>(8).fill(1));
    expect(levels(['&song step=1m .2', '&i [&song + -.45]', '&d [&i * .5 + .5]'], '&d')).toEqual(Array<number>(8).fill(0.5));
    // (an offset written as a sum of its own is held at 0 before it is added: the build's first bar reads the song's .5, not .35)
    expect(levels(['&song step=1m .5', '&rise step=1m 0 .5 1', '&build [-.15 + &rise * .45]', '&i [&song + &build]'])).toEqual([0.5, 0.575, 0.8, 0.5, 0.575, 0.8, 0.5, 0.575]);
  });

  it('a cell that is one number is a term (decision 088): the song’s intensity written as its number', () => {
    expect(levels(['&song .7', '&i [&song + -.45]'])).toEqual(Array<number>(8).fill(0.25));
    expect(levels(['&song .7', '&breakdown -.45', '&i [&song + &breakdown]'])).toEqual(Array<number>(8).fill(0.25));
    expect(levels(['&song .5', '&rise step=1m 0 .5 1', '&i [&song + -.15 + &rise * .45]'])).toEqual([0.35, 0.575, 0.8, 0.35, 0.575, 0.8, 0.35, 0.575]);
    // (before decision 096 a sum whose cells were all numbers was refused, shown firing on the rule's own case)
    expect(errors(['&song .7', '&i [&song + &song]'])).toEqual([]);
  });

  it('a part’s drive reads the intensity, a factor of its level: Jambot’s drums, 0.65 + 0.35 e', () => {
    const drive = ['&song step=1m .7', '&rise step=1m 0 .5 1', '&intensity [&song + -.45 + &rise * .5]', '&drumsDrive [&intensity * .35 + .65]', '&level map=amp .8'];
    expect(levels(drive, '&level * &drumsDrive')).toEqual([0.25, 0.5, 0.75, 0.25, 0.5, 0.75, 0.25, 0.5].map((e) => Math.round(0.8 * (0.65 + 0.35 * e) * 1e6) / 1e6));
  });

  it('a line below 0 stays a bipolar wave in a sum (decision 067 §5): an offset is a constant or a gain, not a signed line', () => {
    expect(levels(['&song step=1m .5', '&breakdown step=1m -.45', '&i [&song + &breakdown]'])).toEqual(Array<number>(8).fill(0.775));
  });
});
