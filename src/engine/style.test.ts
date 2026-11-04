// Style space (decision 063 §3, #390): the table of axes, map=style by position and by name, and a pick by name, read
// as its slot's position as written; every map=adsr cell in the examples read by name as by position.
import { describe, expect, it } from 'vitest';
import { compileSource as compileAlone } from './compile';
import { PRESETS } from './presets';
import { AXES, AXIS_NAMES, SLOTS } from './style';
import { pieceTime } from './duration';
import { INTERFACE_NAMES } from './program';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { LIBRARY, resolveSeed } from '../repository/library';

const compileSource: typeof compileAlone = (text, env, options) => compileAlone(text, env, { resolve: resolveSeed, ...options });
const errors = (text: string) =>
  compileSource(text)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);
const bar = '&bar meter("4/4") step=120bpm';
/** The picks a line's steps make, after compile. */
const picksOf = (text: string, cell: string) =>
  compileSource(text)
    .cells.get(cell)!
    .units.map((u) => (u.atom.kind === 'ref' ? u.atom.pick : null));

describe('the table of axes', () => {
  it('is sync, harm, artic and energy, each from 0 to 1 with a sentence, and a style’s slots in that order', () => {
    expect(AXIS_NAMES).toEqual(['sync', 'harm', 'artic', 'energy']);
    for (const a of AXES) {
      expect(a.range, a.name).toEqual([0, 1]);
      expect(a.sentence.length, a.name).toBeGreaterThan(10);
    }
    expect(SLOTS.style).toEqual(AXIS_NAMES);
    expect(SLOTS.adsr).toEqual(['attack', 'decay', 'sustain', 'release']);
  });

  it('is what every association point in the seed library is written on, each value within its axis’s range', () => {
    const points = LIBRARY.flatMap((f) => f.association.map((wp) => [f.id, wp.point] as const));
    expect(points.length).toBeGreaterThan(100);
    for (const [id, point] of points)
      for (const [axis, v] of Object.entries(point)) {
        const a = AXES.find((x) => x.name === axis);
        expect(a, `${id}: ${axis}`).toBeTruthy();
        expect(v >= a!.range[0] && v <= a!.range[1], `${id}: ${axis} ${v}`).toBe(true);
      }
  });
});

describe('map=style', () => {
  it('reads a style by name as in order: one point', () => {
    const named = compileSource('&funk map=style sync=.3 harm=.45 artic=.55 energy=.55');
    const ordered = compileSource('&funk map=style .3 .45 .55 .55');
    expect(named.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const values = (r: typeof named) => r.cells.get('funk')!.units.map((u) => (u.atom.kind === 'note' ? u.atom.value : null));
    expect(values(named)).toEqual([0.3, 0.45, 0.55, 0.55]);
    expect(values(ordered)).toEqual(values(named));
    // (named in another order, read in the table's)
    expect(values(compileSource('&funk map=style energy=.55 artic=.55 harm=.45 sync=.3'))).toEqual(values(named));
  });

  it('names every axis, each within its range, and only on a style; by name or in order, not both', () => {
    expect(errors('&funk map=style sync=.3 harm=.45')).toEqual(['A style names every axis: artic= energy= are missing (its axes: sync harm artic energy)']);
    expect(errors('&funk map=style .3 .45 .55')[0]).toMatch(/^map=style takes a value for each axis, in order: sync \(0 to 1\)/);
    expect(errors('&funk map=style .3 .45 1.5 .55')[0]).toMatch(/^map=style takes a value for each axis/);
    expect(errors('&funk map=lin sync=.3')[0]).toMatch(/^sync= is an axis of a style: it goes on a map=style cell/);
    expect(errors('&funk sync=.3')[0]).toMatch(/^sync= is an axis of a style/);
    expect(errors('&funk map=style .3 sync=.3 harm=.45 artic=.55 energy=.55')[0]).toMatch(/^A style writes its axes by name \(sync=\.3\) or in order/);
    expect(errors('&funk map=style sync=.3 sync=.4 harm=.45 artic=.55 energy=.55')[0]).toMatch(/^sync= is given twice/);
  });
});

describe('a pick by name, &x[slot]', () => {
  it('is the slot’s position as written, an envelope’s and a style’s', () => {
    const text = [bar, '&env map=adsr .01 .3 .5 .4', '&funk map=style .3 .45 .55 .55', '&held step=4n &env[attack] &env[sustain] &funk[artic] &funk[energy]'].join('\n');
    expect(errors(text)).toEqual([]);
    expect(picksOf(text, 'held')).toEqual([
      { kind: 'at', i: 0, abs: true },
      { kind: 'at', i: 2, abs: true },
      { kind: 'at', i: 2, abs: true },
      { kind: 'at', i: 3, abs: true },
    ]);
  });

  it('reads every map=adsr cell in the examples by name as by position: its four slots each its $i (as the examples compile, with the seed library)', () => {
    let envelopes = 0;
    for (const [key, ex] of Object.entries(PRESETS as Record<string, { source: string }>)) {
      const r = compileSource(ex.source);
      for (const c of r.cells.values()) {
        // (an unnamed envelope, &( … ), can't be named in a probe line)
        if (c.map?.kind !== 'adsr' || !/^[A-Za-z]\w*$/.test(c.name)) continue;
        const probe = `${ex.source}\n&slotProbe step=4n ${SLOTS.adsr.map((s) => `&${c.name}[${s}]`).join(' ')} ${SLOTS.adsr.map((_, i) => `&${c.name}[$${i}]`).join(' ')}`;
        const picks = picksOf(probe, 'slotProbe');
        expect(picks.slice(0, 4), `${key}: &${c.name}`).toEqual(picks.slice(4));
        envelopes++;
      }
    }
    expect(envelopes).toBeGreaterThan(20);
  });

  it('refuses a name its map lacks, listing its slots, and a name on a map with none: shown firing', () => {
    expect(errors([bar, '&env map=adsr .01 .3 .5 .4', '&held step=4n &env[peak]'].join('\n'))).toEqual([
      '&env[peak]: &env (map=adsr) has no slot peak; its slots are attack, decay, sustain, release',
    ]);
    expect(errors([bar, '&funk map=style .3 .45 .55 .55', '&held step=4n &funk[tempo]'].join('\n'))).toEqual([
      '&funk[tempo]: &funk (map=style) has no slot tempo; its slots are sync, harm, artic, energy',
    ]);
    expect(errors([bar, '&x step=4n 1 2', '&y step=4n &x[sustain]'].join('\n'))[0]).toMatch(/^&x\[sustain\]: &x's map names no slots \(it has no map=\)/);
    expect(errors([bar, '&x map=lin step=4n 1 2', '&y step=4n &x[sustain]'].join('\n'))[0]).toMatch(/^&x\[sustain\]: &x's map names no slots \(map=lin\)/);
  });
});

describe('style= and the note &style, read by a voice (#390, step 2)', () => {
  const styles = ['&funk map=style .3 .45 .2 .55', '&bossa map=style .5 .75 .8 .5'];
  /** A piece of eight bars of a meter at 120, a note a bar on a voice whose cutoff reads &style[artic] (0 to 1000 Hz), and its &style. */
  const piece = (style: string, sig = '4/4', lpf = 'lpf=0..1000 * &style[artic]', more: string[] = []) =>
    [
      `&bar meter("${sig}") step=120bpm`,
      ...styles,
      ...more,
      '&line step=1m 0!8',
      `&v s=saw loop=C4 ${lpf}`,
      '&out map=sample [&line * &v]',
      `&style label="the section" ${style}`,
    ].join('\n');
  /** Each note's cutoff at its start, over the first `seconds`. */
  const cutoffs = (text: string, seconds: number) => {
    const r = compileSource(text);
    expect(r.diagnostics, text).toEqual([]);
    return eventsBetween(plan(r, codeShifts(r)), 0, seconds).map((e) => {
      const lpf = e.params?.lpf;
      return lpf?.kind === 'points' ? lpf.points[0]!.value : NaN;
    });
  };

  it('a style held: its value on the axis, every bar', () => {
    expect(cutoffs(piece('style=&funk'), 16)).toEqual(Array<number>(8).fill(200));
  });

  it('a mix of styles by weight: the point it computes', () => {
    for (const v of cutoffs(piece('style=[&funk * .5, &bossa * .5]'), 16)) expect(v).toBeCloseTo(500, 9);
    for (const v of cutoffs(piece('style=[&funk * .25, &bossa * .75]'), 16)) expect(v).toBeCloseTo(650, 9);
  });

  it.each([
    ['4/4', 2],
    ['5/4', 2.5],
    ['6/8', 1],
  ])('a range glides over the piece in %s: bar k of 8 starts at a + (b − a)·k/8, and the glide comes round with it', (sig, bar) => {
    const values = cutoffs(piece('style=&funk..&bossa', sig), 16 * bar);
    expect(values).toHaveLength(16);
    for (const [k, v] of values.entries()) expect(v, `bar ${k}`).toBeCloseTo(200 + (600 * (k % 8)) / 8, 9);
  });

  it('a glide leaves the piece’s length as its bars (#376)', () => {
    for (const [sig, bar] of [
      ['4/4', 2],
      ['5/4', 2.5],
      ['6/8', 1],
    ] as const)
      expect(pieceTime(compileSource(piece('style=&funk..&bossa', sig))).cycle).toBeCloseTo(8 * bar, 9);
  });

  it('a range to an unnamed style, and from a mix', () => {
    const v = cutoffs(piece('style=[&funk * .5, &bossa * .5]..&(map=style .5 .5 1 .5)'), 16);
    for (const [k, x] of v.entries()) expect(x).toBeCloseTo(500 + (500 * k) / 8, 9);
  });

  it('a curve written out takes the place of time: shown firing against the glide', () => {
    const curved = cutoffs(piece('style=&funk..&bossa * &rise', '4/4', undefined, ['&rise map=lin step=1m 0 0 0 0 1 1 1 1']), 16);
    expect(curved.slice(0, 4)).toEqual([200, 200, 200, 200]);
    expect(curved.slice(4)).toEqual([800, 800, 800, 800]);
    expect(curved).not.toEqual(cutoffs(piece('style=&funk..&bossa'), 16));
  });

  it('a slot of an envelope or a style read as a factor: its value, held', () => {
    expect(cutoffs(piece('style=&funk', '4/4', 'lpf=0..1000 * &pluck[sustain]', ['&pluck map=adsr .01 .3 .5 .4']), 16)).toEqual(Array<number>(8).fill(500));
    expect(cutoffs(piece('style=&funk', '4/4', 'lpf=0..1000 * &bossa[artic]'), 16)).toEqual(Array<number>(8).fill(800));
  });

  it('refuses a style that is no style, and one a mix takes outside the axes', () => {
    expect(errors(piece('style=&line'))[0]).toMatch(/^style=&line: a style is a map=style cell/);
    expect(errors(piece('style=[&funk * 2]'))[0]).toMatch(/^&style style=: its style lies outside the axes on energy \(each 0 to 1\)/);
    expect(errors(piece('style=&funk..&bossa * &line'))[0]).toBeUndefined();
    expect(errors(piece('style=&funk..&bossa * &curve', '4/4', undefined, ['&curve step=1m [0,1] 1']))[0]).toMatch(/^style=a\.\.b \* &curve: a curve is a line of numbers/);
  });

  it('&style is an interface name', () => {
    expect(INTERFACE_NAMES).toContain('&style');
  });
});

describe('&style is the composer’s: a fragment reads it, and no fragment defines it (#391)', () => {
  const lpfOf = (text: string) => {
    const r = compileSource(text);
    const e = eventsBetween(plan(r, codeShifts(r)), 0, 1).find((x) => x.voice === 'bassV');
    const lpf = e?.params?.lpf;
    return { lpf: lpf?.kind === 'points' ? lpf.points[0]!.value : NaN, said: r.diagnostics.map((d) => [d.severity, d.message]) };
  };
  const bass = '&bassV s=saw loop=C2 lpf=450..900 * &style[artic]';
  const alone = `${bar}\n&line step=4n 0 2\n${bass}\n&out map=sample [&line * &bassV]`;
  const performed = `${bar}\n&line step=4n 0 2\n${bass}\n&bassOut play=&line &bassV\n&out map=sample [&bassOut]`;

  it('read where no line writes it, an axis is the centre of its range; said in a piece with performers, not in an instrument heard alone', () => {
    expect(lpfOf(alone)).toEqual({ lpf: 675, said: [] });
    const played = lpfOf(performed);
    expect(played.lpf).toBe(675);
    expect(played.said).toEqual([['info', expect.stringMatching(/^no line writes &style: &style\[artic\] reads the centre of style space/)]]);
    // (written, it is the score's)
    expect(lpfOf(`${performed}\n&style style=&(map=style .5 .5 1 .5)`)).toEqual({ lpf: 900, said: [] });
  });

  it('a fragment that defines it is an error, whether or not the piece writes its own; a template’s copy keeps its own private', () => {
    const resolve = (id: string) => (id === 'inst' ? `${bass}\n&style style=&(map=style .5 .5 .5 .5)` : resolveSeed(id));
    const used = `${bar}\n&line step=4n 0 2\n&bassV from inst\n&out map=sample [&line * &bassV]`;
    for (const text of [used, `${used}\n&style style=&(map=style .5 .5 1 .5)`])
      expect(compileSource(text, undefined, { resolve }).diagnostics.map((d) => d.message)).toEqual([
        expect.stringMatching(/^&style is the composer's, the section's style: "inst" defines it/),
      ]);
  });

  it('no seed fragment defines it', () => {
    expect(LIBRARY.filter((f) => f.text.split('\n').some((l) => /^&style[\s,]/.test(l))).map((f) => f.id)).toEqual([]);
  });
});
