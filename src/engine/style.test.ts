// Style space (decision 063 §3, #390): the table of axes, map=style by position and by name, and a pick by name, read
// as its slot's position as written; every map=adsr cell in the examples read by name as by position.
import { describe, expect, it } from 'vitest';
import { signatureOf } from './use';
import { compileSource as compileAlone } from './compile';
import { EXAMPLES } from './examples';
import { AXES, AXIS_NAMES, SLOTS } from './style';
import { pieceTime } from './duration';
import { parse } from './parser';
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
  it('is sync, harm, bite and mood (decision 076), each from 0 to 1 with a sentence, and a style’s slots in that order', () => {
    expect(AXIS_NAMES).toEqual(['sync', 'harm', 'bite', 'mood']);
    for (const a of AXES) {
      expect(a.range, a.name).toEqual([0, 1]);
      expect(a.sentence.length, a.name).toBeGreaterThan(10);
    }
    expect(SLOTS.style).toEqual(AXIS_NAMES);
    expect(SLOTS.adsr).toEqual(['attack', 'decay', 'sustain', 'release']);
  });

  it('says each axis in words a frontend shows: a label, its two ends, and the sentence said from them', () => {
    // (the words Jambot's Style sheet wrote for itself, StylePanel.svelte, now read from here: #538)
    expect(AXES.map((a) => [a.label, ...a.ends])).toEqual([
      ['Syncopation', 'on the beat', 'offbeat'],
      ['Harmony', 'static', 'moving'],
      ['Bite', 'paddy', 'stabby'],
      ['Mood', 'darker', 'brighter'],
    ]);
    expect(AXES.map((a) => a.sentence)).toEqual(['On the beat (0) to offbeat (1).', 'Static (0) to moving (1).', 'Paddy (0) to stabby (1).', 'Darker (0) to brighter (1).']);
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
    const named = compileSource('&funk map=style sync=.3 harm=.45 bite=.55 mood=.55');
    const ordered = compileSource('&funk map=style .3 .45 .55 .55');
    expect(named.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const values = (r: typeof named) => r.cells.get('funk')!.units.map((u) => (u.atom.kind === 'note' ? u.atom.value : null));
    expect(values(named)).toEqual([0.3, 0.45, 0.55, 0.55]);
    expect(values(ordered)).toEqual(values(named));
    // (named in another order, read in the table's)
    expect(values(compileSource('&funk map=style mood=.55 bite=.55 harm=.45 sync=.3'))).toEqual(values(named));
  });

  it('names every axis, each within its range, and only on a style; by name or in order, not both', () => {
    expect(errors('&funk map=style sync=.3 harm=.45')).toEqual(['A style names every axis: bite= mood= are missing (its axes: sync harm bite mood)']);
    expect(errors('&funk map=style .3 .45 .55')[0]).toMatch(/^map=style takes a value for each axis, in order: sync \(0 to 1\)/);
    expect(errors('&funk map=style .3 .45 1.5 .55')[0]).toMatch(/^map=style takes a value for each axis/);
    expect(errors('&funk map=lin sync=.3')[0]).toMatch(/^sync= is an axis of a style: it goes on a map=style cell/);
    expect(errors('&funk sync=.3')[0]).toMatch(/^sync= is an axis of a style/);
    expect(errors('&funk map=style .3 sync=.3 harm=.45 bite=.55 mood=.55')[0]).toMatch(/^A style writes its axes by name \(sync=\.3\) or in order/);
    expect(errors('&funk map=style sync=.3 sync=.4 harm=.45 bite=.55 mood=.55')[0]).toMatch(/^sync= is given twice/);
  });
});

describe('a pick by name, &x[slot]', () => {
  it('is the slot’s position as written, an envelope’s and a style’s', () => {
    const text = [bar, '&env map=adsr .01 .3 .5 .4', '&funk map=style .3 .45 .55 .55', '&held step=4n &env[attack] &env[sustain] &funk[bite] &funk[mood]'].join('\n');
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
    for (const [key, ex] of Object.entries(EXAMPLES as Record<string, { source: string }>)) {
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
      '&funk[tempo]: &funk (map=style) has no slot tempo; its slots are sync, harm, bite, mood',
    ]);
    expect(errors([bar, '&x step=4n 1 2', '&y step=4n &x[sustain]'].join('\n'))[0]).toMatch(/^&x\[sustain\]: &x's map names no slots \(it has no map=\)/);
    expect(errors([bar, '&x map=lin step=4n 1 2', '&y step=4n &x[sustain]'].join('\n'))[0]).toMatch(/^&x\[sustain\]: &x's map names no slots \(map=lin\)/);
  });
});

describe('style= and the note &style, read by a voice (#390, step 2)', () => {
  const styles = ['&funk map=style .3 .45 .2 .55', '&bossa map=style .5 .75 .8 .5'];
  /** A piece of eight bars of a meter at 120, a note a bar on a voice whose cutoff reads &style[bite] (0 to 1000 Hz), and its &style. */
  const piece = (style: string, sig = '4/4', lpf = 'lpf=0..1000 * &style[bite]', more: string[] = []) =>
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

  it('a style left to sliders, sync=free(.3, 0..1), by name and in order: its value read as a number is, a slider named by its axis (#576)', () => {
    const slid = (bite: string) => piece('style=&mine', '4/4', undefined, [`&mine map=style sync=.3 harm=.45 bite=${bite} mood=.55`]);
    // (the slider's value is what the voice reads: as the number it stands for, and it moves with the slider)
    expect(cutoffs(slid('free(.2, 0..1)'), 16)).toEqual(cutoffs(slid('.2'), 16));
    expect(cutoffs(slid('free(.9, 0..1)'), 16)).toEqual(Array<number>(8).fill(900));
    const inOrder = piece('style=&mine', '4/4', undefined, ['&mine map=style .3 .45 free(.2, 0..1) free(.55, 0..1)']);
    expect(cutoffs(inOrder, 16)).toEqual(Array<number>(8).fill(200));
    // (each a slider the frontend draws, named by its axis, its range within it)
    const frees = (text: string) =>
      parse(text)
        .cells.find((c) => c.name === 'mine')!
        .frees!.map((f) => [f.key, f.param, f.value, f.lo, f.hi]);
    expect(frees(inOrder)).toEqual([
      ['param', 'bite', 0.2, 0, 1],
      ['param', 'mood', 0.55, 0, 1],
    ]);
    expect(frees(slid('free(.2, .1..0.8)'))).toEqual([['param', 'bite', 0.2, 0.1, 0.8]]);
  });

  it('the radio example drifts: articulation moves by a sample-and-hold once a section, the bass’s cutoff with it (#576)', () => {
    const r = compileSource(EXAMPLES.radio.source);
    expect(r.diagnostics.filter((d) => d.severity !== 'info')).toEqual([]);
    // (the bass's cutoff, 450..900 Hz * &style[bite], at each of its notes over 32 bars of 104 bpm)
    const barSeconds = (4 * 60) / 104;
    const bySection = new Map<number, Set<number>>();
    for (const e of eventsBetween(plan(r, codeShifts(r)), 0, 32 * barSeconds)) {
      const lpf = e.params?.lpf?.kind === 'points' ? e.params.lpf.points[0]!.value : NaN;
      if (!(lpf < 1000)) continue;
      const section = Math.floor(e.at / barSeconds / 8 + 1e-9);
      if (!bySection.has(section)) bySection.set(section, new Set());
      bySection.get(section)!.add(Math.round(lpf));
    }
    // (held through each section of 8 bars, within articulation's range .2..0.9: 540 to 855 Hz; and it moves)
    expect(bySection.size).toBe(4);
    for (const cutoffs of bySection.values()) {
      expect(cutoffs.size).toBe(1);
      for (const v of cutoffs) expect(v >= 540 && v <= 855).toBe(true);
    }
    expect(new Set([...bySection.values()].map((c) => [...c][0])).size).toBeGreaterThan(1);
  });

  it('an axis that moves, sync=0..1 * &walk: what reads it reads the cell that moves it, laid within the range, on its clock (#576)', () => {
    const moving = (axis: string, more: string[]) => piece('style=&mine', '4/4', undefined, [`&mine map=style sync=.3 harm=.45 bite=${axis} mood=.55`, ...more]);
    expect(cutoffs(moving('.2..0.8 * &walk', ['&walk step=1m 0 .5 1 .5']), 16)).toEqual([200, 500, 800, 500, 200, 500, 800, 500]);
    // (a bare cell is the axis's whole range; one step every two bars)
    expect(cutoffs(moving('&walk', ['&walk step=1m/2 0 1']), 16)).toEqual([0, 0, 1000, 1000, 0, 0, 1000, 1000]);
    // (read on the style cell itself, &mine[bite], as through &style)
    const direct = ['&bar meter("4/4") step=120bpm', '&line step=1m 0!8', '&v s=saw loop=C4 lpf=0..1000 * &mine[bite]', '&out map=sample [&line * &v]'];
    expect(cutoffs([...direct, '&mine map=style sync=.3 harm=.45 bite=&walk mood=.55', '&walk step=1m/2 0 1'].join('\n'), 16)).toEqual([0, 0, 1000, 1000, 0, 0, 1000, 1000]);
    // (a sample-and-hold: a choice drawn afresh each step, held for it)
    const held = cutoffs(moving('&sh', ['&sh step=1m/2 [0|.25|.5|.75|1]']), 16);
    for (let k = 0; k < 8; k += 2) expect(held[k]).toBe(held[k + 1]);
    for (const v of held) expect([0, 250, 500, 750, 1000]).toContain(v);
  });

  it('refuses a slider outside its axis, a fifth value in order, a moving axis outside it, moved by two cells or read through a mix: shown firing', () => {
    const mine = (bite: string, more: string[] = ['&walk step=1m 0 1'], style = 'style=&mine') =>
      errors(piece(style, '4/4', undefined, [`&mine map=style sync=.3 harm=.45 bite=${bite} mood=.55`, ...more]));
    expect(errors(piece('style=&mine', '4/4', undefined, ['&mine map=style sync=free(.3, 0..2) harm=.45 bite=.2 mood=.55']))).toEqual([
      'sync=free(…) moves within the axis, 0 to 1: sync=free(0.3, 0..1)',
    ]);
    expect(errors('&mine map=style .3 .45 .2 .55 free(.5, 0..1)')).toEqual([expect.stringMatching(/^A style has 4 axes \(sync harm bite mood\): this value is one more/)]);
    expect(mine('0..2 * &walk')).toEqual(['bite= moves within the axis, 0 to 1: bite=0..1 * &walk']);
    expect(mine('0..1 * &walk * &w2', ['&walk step=1m 0 1', '&w2 step=1m 1 0'])).toEqual([
      expect.stringMatching(/^bite=… \* &x: an axis moves by one cell, a line of numbers or a sum of them/),
    ]);
    expect(mine('0..1 * &walk', ['&walk step=1m 0 1', '&o map=style sync=.5 harm=.5 bite=.5 mood=.5'], 'style=&mine..&o')).toEqual([
      expect.stringMatching(/^&style\[bite\]: a range of styles doesn't move with a moving one yet/),
    ]);
  });

  it('a moving range’s ends may be sliders, and centre ± reach is its sugar: the window a hand sets, the cell wandering inside it (decision 079, #576)', () => {
    const moving = (axis: string) => piece('style=&mine', '4/4', undefined, ['&walk step=1m 0 1', `&mine map=style sync=.3 harm=.45 bite=${axis} mood=.55`]);
    expect(cutoffs(moving('free(.4, 0..1)..free(.8, 0..1) * &walk'), 8)).toEqual([400, 800, 400, 800]);
    expect(cutoffs(moving('free(.6, 0..1) ± free(.2, 0..0.5) * &walk'), 8)).toEqual([400, 800, 400, 800]);
    expect(cutoffs(moving('.6 +- .2 * &walk'), 8)).toEqual([400, 800, 400, 800]);
    // (held to the axis: .9 ± .3 is .6..1)
    expect(cutoffs(moving('.9 ± .3 * &walk'), 8)).toEqual([600, 1000, 600, 1000]);
    // (each a slider, named: a window's ends low and high, a centre by its axis and its reach)
    const sliders = (axis: string) =>
      parse(moving(axis))
        .cells.find((c) => c.name === 'mine')!
        .frees!.map((f) => [f.param, f.value, f.lo, f.hi]);
    expect(sliders('free(.4, 0..1)..free(.8, 0..1) * &walk')).toEqual([
      ['bite low', 0.4, 0, 1],
      ['bite high', 0.8, 0, 1],
    ]);
    expect(sliders('free(.6, 0..1) ± free(.2, 0..0.5) * &walk')).toEqual([
      ['bite', 0.6, 0, 1],
      ['bite reach', 0.2, 0, 0.5],
    ]);
    // (a window's end slider outside the axis is refused, shown firing)
    expect(errors(moving('free(.4, 0..2)..1 * &walk'))).toEqual(["bite=: a window's end moves within the axis, 0 to 1: free(0.4, 0..1)"]);
  });

  it('a mix of cells with no voice is the sum of their values, its gains the weights, held to 0…1 (decision 079, #576)', () => {
    const walkers = ['&a step=1m 0 1', '&b step=1m/4 0 1'];
    // (as a moving parameter's factor: .5 of &a, by the bar, and .5 of &b, by four bars)
    const factor = (sum: string) =>
      cutoffs(['&bar meter("4/4") step=120bpm', '&line step=1m 0!8', '&v s=saw loop=C4 lpf=0..1000 * &w', '&out map=sample [&line * &v]', ...walkers, `&w ${sum}`].join('\n'), 16);
    expect(factor('[&a * .5 + &b * .5]')).toEqual([0, 500, 0, 500, 500, 1000, 500, 1000]);
    // (a constant added; a sum past 1 held at 1)
    expect(factor('[&a * .5 + .25]')).toEqual([250, 750, 250, 750, 250, 750, 250, 750]);
    expect(factor('[&a + &b]')).toEqual([0, 1000, 0, 1000, 1000, 1000, 1000, 1000]);
    // (an axis moved by a sum, laid within its range term by term: .2..0.8)
    const moving = piece('style=&mine', '4/4', undefined, [...walkers, '&d [&a * .5 + &b * .5]', '&mine map=style sync=.3 harm=.45 bite=.2..0.8 * &d mood=.55']);
    expect(cutoffs(moving, 16)).toEqual([200, 500, 200, 500, 500, 800, 500, 800]);
    // (a moving style read through a mix of styles: the mix's weighted sum, a still style a constant in it)
    const mixed = piece('style=[&mine * .5, &o * .5]', '4/4', undefined, [...walkers, '&mine map=style sync=.3 harm=.45 bite=&a mood=.55', '&o map=style .5 .5 .2 .5']);
    expect(cutoffs(mixed, 16)).toEqual([100, 600, 100, 600, 100, 600, 100, 600]);
    // (a mix with a voice is a sound, as it was: shown firing, a voiceless one is no error)
    expect(errors(['&bar meter("4/4") step=120bpm', ...walkers, '&w [&a * .5 + &b * .5]'].join('\n'))).toEqual([]);
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
    expect(cutoffs(piece('style=&funk', '4/4', 'lpf=0..1000 * &bossa[bite]'), 16)).toEqual(Array<number>(8).fill(800));
  });

  it('refuses a style that is no style, and one a mix takes outside the axes', () => {
    expect(errors(piece('style=&line'))[0]).toMatch(/^style=&line: a style is a map=style cell/);
    expect(errors(piece('style=[&funk * 2]'))[0]).toMatch(/^&style style=: its style lies outside the axes on mood \(each 0 to 1\)/);
    expect(errors(piece('style=&funk..&bossa * &line'))[0]).toBeUndefined();
    expect(errors(piece('style=&funk..&bossa * &curve', '4/4', undefined, ['&curve step=1m [0,1] 1']))[0]).toMatch(/^style=a\.\.b \* &curve: a curve is a line of numbers/);
  });

  it('names an unknown cell as any reference does: an end, a mix’s term, a curve (#609)', () => {
    expect(errors(piece('style=&nowhere'))).toEqual(['Unknown cell &nowhere']);
    expect(errors(piece('style=&funk..&nope * &none'))).toEqual(['Unknown cell &nope', 'Unknown cell &none']);
    expect(errors(piece('style=[&funk * .5, &gone * .5]'))).toEqual(['Unknown cell &gone']);
  });
});

describe('&style is the composer’s: a fragment reads it, and no collection defines it (#391; a template declares it, #560)', () => {
  const lpfOf = (text: string) => {
    const r = compileSource(text);
    const e = eventsBetween(plan(r, codeShifts(r)), 0, 1).find((x) => x.voice === 'bassV');
    const lpf = e?.params?.lpf;
    return { lpf: lpf?.kind === 'points' ? lpf.points[0]!.value : NaN, said: r.diagnostics.map((d) => [d.severity, d.message]) };
  };
  const bass = '&bassV s=saw loop=C2 lpf=450..900 * &style[bite]';
  const alone = `${bar}\n&line step=4n 0 2\n${bass}\n&out map=sample [&line * &bassV]`;
  const performed = `${bar}\n&line step=4n 0 2\n${bass}\n&bassOut play=&line &bassV\n&out map=sample [&bassOut]`;

  it('read where no line writes it, an axis is the centre of its range; said in a piece with performers, not in an instrument heard alone', () => {
    expect(lpfOf(alone)).toEqual({ lpf: 675, said: [] });
    const played = lpfOf(performed);
    expect(played.lpf).toBe(675);
    expect(played.said).toEqual([['info', expect.stringMatching(/^no line writes &style: &style\[bite\] reads the centre of style space/)]]);
    // (written, it is the score's)
    expect(lpfOf(`${performed}\n&style style=&(map=style .5 .5 1 .5)`)).toEqual({ lpf: 900, said: [] });
  });

  it('a fragment that defines it is an error, whether or not the piece writes its own; a template’s copy keeps its own private', () => {
    const resolve = (id: string) => (id === 'inst' ? `${bass}\n&style style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)` : resolveSeed(id));
    const used = `${bar}\n&line step=4n 0 2\n&bassV from inst\n&out map=sample [&line * &bassV]`;
    for (const text of [used, `${used}\n&style style=&(map=style .5 .5 1 .5)`])
      expect(compileSource(text, undefined, { resolve }).diagnostics.map((d) => d.message)).toEqual([
        expect.stringMatching(/^&style is the composer's, the section's style: "inst" defines it/),
      ]);
  });

  it('no seed fragment defines it but as a parameter’s default, the centre, a template declaring it (decision 075, #560 rung 3c–e)', () => {
    const defining = LIBRARY.filter((f) => f.text.split('\n').some((l) => /^&style[\s,]/.test(l)));
    expect(defining.map((f) => f.id)).toEqual(['bass', 'keys', 'pad', 'lead', 'bass_performer', 'pad_performer', 'stab_performer', 'lead_performer']);
    for (const f of defining) {
      expect(signatureOf(f.text)?.optional, f.id).toContain('&style');
      expect(
        f.text.split('\n').filter((l) => /^&style\s/.test(l)),
        f.id,
      ).toEqual(['&style map=style sync=.5 harm=.5 bite=.5 mood=.5']);
    }
  });
});
