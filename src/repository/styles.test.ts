// The styles (decision 063 §3, #391): Jambot's ten presets as the `map=style` cells of the seed collection `styles`, so
// a score names its section's style by one, and the band reads it as it reads the numbers (`band.ts`).
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { parse } from '../engine/parser';
import { bandAt, CENTRE, resolveBand, scoreStyle } from './band';
import { createRepository } from './fragments';
import { resolveSeed } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { STYLE_FRAGMENTS } from './styles';

// (each of Jambot's ten presets by the name its cell has in `styles`)
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
};
const styles = STYLE_FRAGMENTS.find((f) => f.id === 'styles')!;
const named = (name: string) => `&${name} from styles\n&style style=&${name}`;
const numbers = (p: (typeof PRESETS)[keyof typeof PRESETS]) => `&style style=&(map=style ${p.sync} ${p.harm} ${p.artic} ${p.energy})`;

describe('the styles', () => {
  it('are the ten presets’ points, each a style cell of the collection, associated at each as the facet style', () => {
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

  it('name a style the band reads as it reads its numbers: the same instruments at each of the ten', () => {
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
