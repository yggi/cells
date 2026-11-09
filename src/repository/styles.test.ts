// The library of styles (decision 063 §3, #391, #537): the preset styles as the `map=style` cells of the seed collection
// `styles`, so a score names its section's style by one, the band reads it as it reads the numbers (`band.ts`), and a
// frontend takes its presets from `STYLES`.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { parse } from '../engine/parser';
import { bandAt, CENTRE, resolveBand, scoreStyle } from './band';
import { createRepository, pointDistance } from './fragments';
import { resolveSeed } from './library';
import {
  AMBIENT,
  at,
  BOSSA_NOVA,
  DEEP_HOUSE,
  ELECTRO_SWING,
  FUNK,
  KINDERLIED,
  LO_FI,
  nearestStyle,
  SPOOKY,
  STYLE_FRAGMENTS,
  STYLES,
  stylePoint,
  SWING_JAZZ,
  SYNTH_POP,
  TECHNO,
} from './styles';

const AXIS_KEYS = ['sync', 'harm', 'bite', 'mood'] as const;
// (every source file but the generated ones: what a test of restated numbers reads)
const SRC = new URL('..', import.meta.url).pathname;
const SOURCES = Object.fromEntries(
  (readdirSync(SRC, { recursive: true }) as string[]).filter((f) => f.endsWith('.ts') && !f.includes('.generated.')).map((f) => [f, readFileSync(SRC + f, 'utf8')]),
);

// (each preset style by the name its cell has in `styles`)
const PRESETS = {
  synthPop: SYNTH_POP,
  techno: TECHNO,
  deepHouse: DEEP_HOUSE,
  ambient: AMBIENT,
  lofi: LO_FI,
  funk: FUNK,
  bossaNova: BOSSA_NOVA,
  swingJazz: SWING_JAZZ,
  electroSwing: ELECTRO_SWING,
  spooky: SPOOKY,
  kinderlied: KINDERLIED,
};
const styles = STYLE_FRAGMENTS.find((f) => f.id === 'styles')!;
const named = (name: string) => `&${name} from styles\n&style style=&${name}`;
const numbers = (p: (typeof PRESETS)[keyof typeof PRESETS]) => `&style style=&(map=style ${p.sync} ${p.harm} ${p.bite} ${p.mood})`;

describe('the styles', () => {
  it('are the presets’ points, each a style cell of the collection, associated at each as the facet style', () => {
    expect(STYLE_FRAGMENTS.map((f) => f.id)).toEqual(['styles']);
    const cells = parse(styles.text).cells;
    expect(cells.map((c) => c.name)).toEqual(Object.keys(PRESETS));
    expect(cells.every((c) => c.map?.kind === 'style')).toBe(true);
    for (const [name, point] of Object.entries(PRESETS)) expect(scoreStyle(named(name)), name).toEqual(point);
    expect(styles.association).toEqual(Object.values(PRESETS).map((point) => ({ point, weight: 1, facet: 'style' })));
    // (a collection of styles plays nothing alone, and says only that)
    expect(compileSource(styles.text).diagnostics.map((d) => d.message)).toEqual([expect.stringMatching(/^Nothing plays yet/)]);
  });

  it('are found at a point as the facet style, at distance 0 on each preset', () => {
    const repo = createRepository(STYLE_FRAGMENTS);
    for (const point of Object.values(PRESETS)) expect(repo.query(point, 1, {}, { facet: 'style' }).map((f) => [f.fragment.id, f.distance])).toEqual([['styles', 0]]);
  });

  it('name a style the band reads as it reads its numbers: the same instruments at each', () => {
    for (const [name, point] of Object.entries(PRESETS)) {
      expect(resolveBand(named(name))('band'), name).toBe(resolveBand(numbers(point))('band'));
      expect(resolveBand(named(name))('band'), name).toBe(bandAt(point));
    }
    // (it fires: Spooky's named band is its instruments, the centre's is the performers' own)
    expect(resolveBand(named('spooky'))('band')).not.toBe(bandAt(CENTRE));
  });

  it('a range and a mix read by name start where their numbers do; a style no fragment holds is none', () => {
    expect(scoreStyle('&spooky, &funk from styles\n&style style=&spooky..&funk')).toEqual(SPOOKY);
    expect(scoreStyle('&funk, &techno from styles\n&style style=[&funk * .5, &techno * .5]')).toEqual(
      Object.fromEntries(Object.keys(FUNK).map((a) => [a, (FUNK[a as keyof typeof FUNK]! + TECHNO[a as keyof typeof TECHNO]!) / 2])),
    );
    expect(scoreStyle('&nope from styles\n&style style=&nope')).toBeNull();
    expect(scoreStyle('&funk from styles\n&style style=&funk', () => null)).toBeNull();
    expect(resolveSeed('styles')).toBe(styles.text);
  });
});

describe('STYLES, the presets a frontend takes', () => {
  it('are the collection’s cells in its order: an id, a name, a point and a tempo each', () => {
    expect(STYLES.map((s) => s.id)).toEqual(Object.keys(PRESETS));
    for (const s of STYLES) expect(s.point, s.id).toEqual(PRESETS[s.id as keyof typeof PRESETS]);
    // (the names and tempos Jambot's presets have, yggi/jambot packages/engine/src/style.ts @ dcc414d, and Kinderlied at Twinkle's tempo)
    expect(STYLES.map((s) => [s.name, s.tempo])).toEqual([
      ['Synth-pop', 108],
      ['Techno', 130],
      ['Deep house', 122],
      ['Ambient', 72],
      ['Lo-fi hip hop', 84],
      ['Funk', 104],
      ['Bossa nova', 132],
      ['Swing jazz', 148],
      ['Electro swing', 124],
      ['Spooky', 100],
      ['Kinderlied', 96],
    ]);
  });

  it('keep the tempo out of the point: a score on a style reads the four axes and nothing else', () => {
    for (const name of Object.keys(PRESETS)) expect(Object.keys(scoreStyle(named(name))!), name).toEqual(['sync', 'harm', 'bite', 'mood']);
    // (a style's step= moves nothing a piece plays: the band at a named style is the band at its numbers, above)
    expect(compileSource(`${styles.text}\n&style style=&funk`).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('find a style by its id, and say which there are for one they lack', () => {
    expect(stylePoint('funk')).toBe(FUNK);
    expect(() => stylePoint('polka')).toThrow(/no style polka \(there are synthPop, techno, .*kinderlied\)/);
  });

  it('are written once: no source file restates a preset’s point as numbers', () => {
    // (a literal at(…) equal to a preset's point is a copy that can drift; the tests place fragments at FUNK, never at its numbers)
    const restated = (text: string) =>
      [...text.matchAll(/\bat\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)/g)]
        .map((m) => at(+m[1]!, +m[2]!, +m[3]!, +m[4]!))
        .filter((p) => STYLES.some((s) => AXIS_KEYS.every((a) => s.point[a] === p[a])));
    // (it fires: the old presets.ts wrote each so)
    expect(restated(`export const FUNK = at(${Object.values(FUNK).join(', ')});`)).toEqual([FUNK]);
    for (const [path, text] of Object.entries(SOURCES)) expect(restated(text), path).toEqual([]);
  });
});

describe('nearestStyle, the styles nearest a point', () => {
  it('finds each style itself at distance 0, first', () => {
    for (const s of STYLES) expect(nearestStyle(s.point, { k: 1 }), s.id).toEqual([{ style: s, distance: 0 }]);
  });

  it('ranks every style by pointDistance, nearest first: over all 55 pairs, each the other’s distance', () => {
    for (const a of STYLES) {
      const ranked = nearestStyle(a.point);
      expect(ranked.map((n) => n.style.id).sort(), a.id).toEqual(STYLES.map((s) => s.id).sort());
      expect(
        ranked.map((n) => n.distance),
        a.id,
      ).toEqual([...ranked.map((n) => n.distance)].sort((x, y) => x - y));
      for (const { style, distance } of ranked) expect(distance, `${a.id}→${style.id}`).toBe(pointDistance(a.point, style.point));
    }
    // (55 distinct pairs, each measured the same both ways)
    let pairs = 0;
    for (const [i, a] of STYLES.entries())
      for (const b of STYLES.slice(i + 1)) {
        pairs++;
        expect(pointDistance(a.point, b.point), `${a.id}–${b.id}`).toBe(pointDistance(b.point, a.point));
      }
    expect(pairs).toBe(55);
  });

  it('takes k, axis weights, and a frontend’s own styles with an axis added', () => {
    // (Swing jazz, 0.15 from Spooky on the old axes, is no longer among its three nearest: brightness tells the two apart,
    // harmonic minor from ionian, decision 076, #572)
    expect(nearestStyle(SPOOKY, { k: 3 }).map((n) => n.style.id)).toEqual(['spooky', 'lofi', 'deepHouse']);
    // (mood weighed 0: a point that differs from Funk only in brightness is Funk's, at 0)
    expect(nearestStyle({ ...FUNK, mood: 0 }, { k: 1, axisWeights: { mood: 0 } })[0]).toEqual({ style: STYLES.find((s) => s.id === 'funk'), distance: 0 });
    // (a tempo axis a frontend adds tells two styles apart that the point alone ranks the other way)
    const withTempo = STYLES.map((s) => ({ ...s, point: { ...s.point, bpm: s.tempo / 100 } }));
    // (halfway between Spooky and Swing jazz, where the point alone ties them)
    const between = Object.fromEntries(Object.keys(SPOOKY).map((a) => [a, (SPOOKY[a]! + SWING_JAZZ[a]!) / 2]));
    expect(nearestStyle({ ...between, bpm: 1.48 }, { k: 1, styles: withTempo })[0]!.style.id).toBe('swingJazz');
    expect(nearestStyle({ ...between, bpm: 1.0 }, { k: 1, styles: withTempo })[0]!.style.id).toBe('spooky');
  });

  it('breaks a tie by the styles’ order', () => {
    const twins = [STYLES[1]!, { ...STYLES[0]!, point: STYLES[1]!.point }];
    expect(nearestStyle(STYLES[1]!.point, { styles: twins }).map((n) => n.style.id)).toEqual([STYLES[1]!.id, STYLES[0]!.id]);
  });
});
