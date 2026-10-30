// Style space (decision 063 §3, #390): the table of axes, map=style by position and by name, and a pick by name, read
// as its slot's position as written; every map=adsr cell in the examples read by name as by position.
import { describe, expect, it } from 'vitest';
import { compileSource as compileAlone } from './compile';
import { PRESETS } from './presets';
import { AXES, AXIS_NAMES, SLOTS } from './style';
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
