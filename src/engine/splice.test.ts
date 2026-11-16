import { describe, expect, it } from 'vitest';
import { compileSource as compileAlone } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { resolveSeed } from '../repository/library';

const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });

// Decision 097: a splice plays what the cell spliced is, in its step, whatever its sort. A melody spliced plays its
// notes (as it always has); a cell that carries a value (a cell that is one number, a sum of values, a level, a line of
// values that splices one) plays its value, a sum read while the step lasts. So a line of values may splice value cells,
// and every reader of a value reads it alike: a level, a moving parameter, a style's axis.

/** `bars` bars of one note each (120 bpm, 2 s a bar), its cutoff `lpf=0..1000 * &x`: each bar's cutoff, over 1000. */
const read = (lines: readonly string[], bars = 8) => {
  const text = ['&bar meter("4/4") step=120bpm', `&line step=1m 0!${bars}`, '&v s=saw loop=C4 lpf=0..1000 * &x', '&out map=sample [&line * &v]', ...lines].join('\n');
  const r = compileSource(text);
  expect(r.diagnostics.map((d) => d.message)).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, bars * 2 - 1e-9).map((e) => {
    const lpf = e.params?.lpf;
    return lpf?.kind === 'points' ? lpf.points[0]!.value / 1000 : NaN;
  });
};

const errors = (lines: readonly string[], out = '&out map=sample [&line * &v]') =>
  compileSource(['&bar meter("4/4") step=120bpm', '&line step=1m 0!8', '&v s=saw loop=C4', out, ...lines].join('\n'))
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

const near = (xs: readonly number[]) => xs.map((x) => Math.round(x * 1e9) / 1e9);

describe('a splice plays what the cell spliced is, a value its value (decision 097, #810)', () => {
  it('a cell that is one number plays its number in its step (law L18)', () => {
    expect(near(read(['&g .7', '&b .25', '&x step=1m &g &b .1 &g']))).toEqual([0.7, 0.25, 0.1, 0.7, 0.7, 0.25, 0.1, 0.7]);
    // (and the line is a line of values: a term of a sum of values, as the band's drives read the score's &intensity)
    expect(near(read(['&g .7', '&b .25', '&i step=1m &g &b', '&x [&i * .5 + .5]']))).toEqual([0.85, 0.625, 0.85, 0.625, 0.85, 0.625, 0.85, 0.625]);
  });

  it('a sum of values plays its sum, read while its step lasts: a term that moves moves it there', () => {
    const kinds = ['&song .7', '&groove [&song + 0]', '&breakdown [&song + -.45]', '&drop [&song + .3]'];
    expect(near(read([...kinds, '&x step=1m &groove &breakdown &drop &groove']))).toEqual([0.7, 0.25, 1, 0.7, 0.7, 0.25, 1, 0.7]);
    // (a build's ramp, a term moving by the bar inside a step of two bars: the sum read at each bar)
    const build = ['&song .5', '&rise step=1m 0 1', '&build [&song + -.15 + &rise * .45]', '&groove [&song + 0]', '&x step=1m/2 &groove &build'];
    expect(near(read(build))).toEqual([0.5, 0.5, 0.35, 0.8, 0.5, 0.5, 0.35, 0.8]);
  });

  it('a level spliced (map=amp) plays its levels, a line of values that splices one carries it on', () => {
    expect(near(read(['&acc map=amp step=2n .2 .4', '&x step=1m &acc .9']))).toEqual([0.2, 0.4, 0.9, 0.2, 0.4, 0.9, 0.2, 0.4]);
    expect(near(read(['&g .7', '&inner step=1m &g .3', '&x step=1m &inner .1']))).toEqual([0.7, 0.3, 0.1, 0.7, 0.3, 0.1, 0.7, 0.3]);
  });

  it('a level reads it as a level, and a style’s axis moves by it as by a line of numbers', () => {
    // (a level line that splices sums of values, a gate's factor)
    const r = compileSource(
      [
        '&bar meter("4/4") step=120bpm',
        '&line step=1m 0!4',
        '&v s=saw loop=C4',
        '&song .7',
        '&g [&song + 0]',
        '&b [&song + -.45]',
        '&lv map=amp step=1m &g &b',
        '&out map=sample [&line * &v * &lv]',
      ].join('\n'),
    );
    expect(r.diagnostics).toEqual([]);
    expect(eventsBetween(plan(r, codeShifts(r)), 0, 8 - 1e-9).map((e) => Math.round(e.levels.reduce((a, l) => a * l.level, 1) * 1e9) / 1e9)).toEqual([0.7, 0.25, 0.7, 0.25]);
    // (an axis laid within .2..0.8: each spliced value laid as a written one is, .2 + .6·v)
    const axis = [
      '&song .7',
      '&g [&song + 0]',
      '&b [&song + -.45]',
      '&n .5',
      '&i step=1m &g &b &n .1',
      '&mine map=style sync=.3 harm=.45 bite=.2..0.8 * &i mood=.55',
      '&x style=&mine',
    ];
    const text = ['&bar meter("4/4") step=120bpm', '&line step=1m 0!4', '&v s=saw loop=C4 lpf=0..1000 * &x[bite]', '&out map=sample [&line * &v]', ...axis].join('\n');
    const s = compileSource(text);
    expect(s.diagnostics).toEqual([]);
    expect(near(eventsBetween(plan(s, codeShifts(s)), 0, 8 - 1e-9).map((e) => (e.params!.lpf as unknown as { points: { value: number }[] }).points[0]!.value / 1000))).toEqual(
      near([0.62, 0.35, 0.5, 0.26]),
    );
  });

  it('a plain line of numbers carries no sort of its own: a line that splices plain lines alone stays a pattern, as it was', () => {
    // (a melody of phrases, `&tune &a &b`, is no line of values: a voiceless sum of it is refused, as before)
    expect(errors(['&a step=2n .2 .4', '&tune step=1m &a .9', '&d [&tune * .5 + .5]'], '&out map=sample [&line * &v * &d]')).not.toEqual([]);
    // (and it plays as notes where a voice plays it)
    expect(errors(['&a step=4n 0 2', '&tune step=1m &a 4'], '&out map=sample [&tune * &v]')).toEqual([]);
  });

  it('a line that splices a sum of values has no notes to play: as a melody or in a pitch sum it says so', () => {
    const lines = ['&song .7', '&g [&song + 0]', '&i step=1m &g .2'];
    const message = expect.stringMatching(/^&i splices a sum of values: a step that does is the sum's value while it lasts/);
    expect(errors(lines, '&out map=sample [&i * &v]')).toEqual([message]);
    expect(errors(lines, '&out map=sample [(&line + &i) * &v]')).toEqual([message]);
  });

  it('#810’s bound: a section plan of named kinds plays Jambot’s barEnergy, bar by bar, over 32 bars', () => {
    // (Jambot's `barEnergy` @ 602cb26: the style's energy plus its kind's offset, held to 0…1; a build ramping from
    // −0.15 to +0.3 over its 8 bars)
    const OFFSET = { groove: 0, breakdown: -0.45, drop: 0.3 } as const;
    const barEnergy = (energy: number, kind: 'groove' | 'breakdown' | 'build' | 'drop', bar: number) =>
      Math.max(0, Math.min(1, energy + (kind === 'build' ? -0.15 + (0.45 * bar) / 7 : OFFSET[kind])));
    const sevenths = Array.from({ length: 8 }, (_, k) => String(Math.round((k / 7) * 1e12) / 1e12)).join(' ');
    const plan32 = [
      '&song .55',
      '&groove [&song + 0]',
      '&breakdown [&song + -.45]',
      `&rise step=1m ${sevenths}`,
      '&build [&song + -.15 + &rise * .45]',
      '&drop [&song + .3]',
      '&x step=1m/8 &groove &breakdown &build &drop',
    ];
    const kinds = ['groove', 'breakdown', 'build', 'drop'] as const;
    const want = Array.from({ length: 32 }, (_, b) => barEnergy(0.55, kinds[Math.floor(b / 8)]!, b % 8));
    const got = read(plan32, 32);
    expect(got).toHaveLength(32);
    got.forEach((v, b) => expect(Math.abs(v - want[b]!), `bar ${b}`).toBeLessThan(1e-9));
  });
});
