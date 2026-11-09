import { describe, expect, it } from 'vitest';
import { compileSource as compileAlone } from './compile';
import { EXAMPLES } from './examples';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { CENTRE } from './style';
import { styleAt as styleAlone } from './styleat';
import { resolveSeed } from '../repository/library';

const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });
const styleAt: typeof styleAlone = (text, seconds, options) => styleAlone(text, seconds, { resolve: resolveSeed, ...options });
/** Rounded, as a cutoff in hertz is compared. */
const round = (p: readonly number[] | null) => p?.map((x) => Math.round(x * 1e6) / 1e6);

describe('styleAt: the style a piece plays at a time (#576 rung 5)', () => {
  it('a style held: its point, at any time; a cell named: its own', () => {
    const text = '&funk map=style .3 .45 .2 .55\n&style style=&funk';
    expect(styleAt(text, 0)).toEqual([0.3, 0.45, 0.2, 0.55]);
    expect(styleAt(text, 1000)).toEqual([0.3, 0.45, 0.2, 0.55]);
    expect(styleAt('&a map=style .1 .2 .3 .4', 5, { cell: 'a' })).toEqual([0.1, 0.2, 0.3, 0.4]);
    // (a mix of styles: its weighted sum)
    expect(round(styleAt('&a map=style 0 0 0 0\n&b map=style 1 1 1 1\n&style style=[&a * .25, &b * .75]', 0))).toEqual([0.75, 0.75, 0.75, 0.75]);
  });

  it('no line writes &style: the centre of style space, as a voice reading it plays', () => {
    expect(styleAt('&a map=style .1 .2 .3 .4', 0)).toEqual(CENTRE);
  });

  it('a moving axis, a sum of cells: its value then, laid within the axis’s window', () => {
    const text = [
      '&bar meter("4/4") step=120bpm',
      '&mine map=style sync=.3 harm=.45 bite=.2..0.6 * &drift mood=.5',
      '&drift [&a * .5 + &b * .5]',
      '&a step=1m 0 1',
      '&b step=1m/2 0 1',
      '&style style=&mine',
    ].join('\n');
    // (a bar is 2 s: &a turns each bar, &b each two)
    const bite = [0, 2, 4, 6].map((s) => round(styleAt(text, s + 0.01))![2]);
    expect(bite).toEqual([0.2, 0.4, 0.4, 0.6]);
  });

  it('a range of styles glides over the piece', () => {
    const text = [
      '&bar meter("4/4") step=120bpm',
      '&a map=style 0 0 0 0',
      '&b map=style 1 1 1 1',
      '&line step=1m 0!4',
      '&v s=saw loop=C4',
      '&out map=sample [&line * &v]',
      '&style style=&a..&b',
    ].join('\n');
    // (four bars of 2 s: a at the start, three quarters of the way at the last bar's start)
    expect(round(styleAt(text, 0))).toEqual([0, 0, 0, 0]);
    expect(round(styleAt(text, 6))).toEqual([0.75, 0.75, 0.75, 0.75]);
  });

  it('a piece that doesn’t compile: null', () => {
    expect(styleAt('&a 1 2\n&style style=&a', 0)).toBeNull();
  });

  it('Radio: what the band plays at each note is what styleAt reads then (the bass’s cutoff, 450..900 Hz * &style[bite])', () => {
    const text = EXAMPLES.radio.source;
    const r = compileSource(text);
    const barSeconds = (4 * 60) / 104;
    const notes = eventsBetween(plan(r, codeShifts(r)), 0, 64 * barSeconds).flatMap((e) =>
      e.params?.lpf?.kind === 'points' && e.voice === 'bassV' ? [{ at: e.at, lpf: e.params.lpf.points[0]!.value }] : [],
    );
    expect(notes.length).toBeGreaterThan(32);
    for (const n of notes) expect(450 + 450 * styleAt(text, n.at)![2]!).toBeCloseTo(n.lpf, 6);
    // (and it drifts: more than one value over the sections, sliders read as written)
    const sections = Array.from({ length: 8 }, (_, k) => styleAt(text, k * 8 * barSeconds + 0.01)!);
    expect(new Set(sections.map((p) => p[2])).size).toBeGreaterThan(1);
    for (const p of sections) expect(p.slice(0, 2)).toEqual([0.3, 0.45]);
  });
});
