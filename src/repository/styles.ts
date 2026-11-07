/**
 * The library of styles (decision 063 §3; #391, #537): the preset styles, each a `map=style` cell of the seed collection
 * `styles` (`fragments/styles/01-styles.md`), the one source a frontend takes its presets from. A cell's name is the
 * style's id, its `label=` its display name, its `step=` its default tempo (the owner's ruling on #537: read only here,
 * never by `style=` or a query, so a style has no tempo, decision 037's D6), and its values its point on the axes
 * (`AXES`). A score names its section's style by one (`&funk from styles`, `&style style=&funk`) where the section sits
 * exactly on it.
 *
 * The named points below (`FUNK`, `SPOOKY`, …) are read from the collection, not written: the repository's tests place
 * fragments at them, and a test fails where a source file restates one as numbers.
 */
import { parse } from '../engine/parser';
import { AXIS_NAMES } from '../engine/style';
import { pointDistance, type Fragment, type StylePoint } from './fragments';
import { seedFragments } from './seed';

/** The styles built so far: the collection `styles`, associated as the facet `style` at each of its points. */
export const STYLE_FRAGMENTS: readonly Fragment[] = seedFragments('styles');

/** One preset style: its id (its cell's name), its display name, its point on the axes and its default tempo in bpm. */
export interface Style {
  readonly id: string;
  readonly name: string;
  readonly point: StylePoint;
  readonly tempo: number;
}

/** A style cell of the collection as a style; it throws where the collection breaks its own form (a test holds it). */
function styleOf(cell: ReturnType<typeof parse>['cells'][number]): Style {
  const values = cell.braid.kind === 'list' ? cell.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN)) : [];
  if (cell.map?.kind !== 'style' || values.length !== AXIS_NAMES.length || !values.every(Number.isFinite))
    throw new Error(`styles: &${cell.name} is not a style cell with a value on each axis`);
  if (!cell.label) throw new Error(`styles: &${cell.name} has no label=, its display name`);
  if (cell.step?.kind !== 'rate') throw new Error(`styles: &${cell.name} has no step= in bpm, its default tempo`);
  return {
    id: cell.name,
    name: cell.label,
    point: Object.fromEntries(AXIS_NAMES.map((a, i) => [a, values[i]!])),
    tempo: Math.round(cell.step.perSecond * 60 * 1e9) / 1e9,
  };
}

/** The preset styles, in the collection's order: what a frontend offers as its presets. */
export const STYLES: readonly Style[] = parse(STYLE_FRAGMENTS.find((f) => f.id === 'styles')!.text).cells.map(styleOf);

/** A preset style's point by its id; it throws on an id the collection lacks. */
export function stylePoint(id: string): StylePoint {
  const style = STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`styles: no style ${id} (there are ${STYLES.map((s) => s.id).join(', ')})`);
  return style.point;
}

/** A style and how far a point is from it. */
export interface NearStyle {
  readonly style: Style;
  readonly distance: number;
}

/**
 * The styles nearest a point, nearest first, by the distance between two styles (`pointDistance`: over the axes both
 * have, each weighing 1 unless `axisWeights` says), ties in the styles' order; the k nearest, or all. A frontend that
 * ranks on more than the point (Jambot's tempo) hands `styles` with its own axes added to each point.
 */
export function nearestStyle(point: StylePoint, options: { readonly k?: number; readonly axisWeights?: StylePoint; readonly styles?: readonly Style[] } = {}): NearStyle[] {
  const { k = Infinity, axisWeights = {}, styles = STYLES } = options;
  return styles
    .map((style, i) => ({ style, distance: pointDistance(point, style.point, axisWeights), i }))
    .sort((a, b) => a.distance - b.distance || a.i - b.i)
    .slice(0, k)
    .map(({ style, distance }) => ({ style, distance }));
}

/** A point on the four axes, for a place that is not a preset's (a test's, a fragment's). */
export const at = (sync: number, harm: number, artic: number, energy: number): StylePoint => ({ sync, harm, artic, energy });

// The presets' points by name, read from the collection.
export const SYNTH_POP = stylePoint('synthPop');
export const TECHNO = stylePoint('techno');
export const DEEP_HOUSE = stylePoint('deepHouse');
export const AMBIENT = stylePoint('ambient');
export const LO_FI = stylePoint('lofi');
export const FUNK = stylePoint('funk');
export const BOSSA_NOVA = stylePoint('bossaNova');
export const SWING_JAZZ = stylePoint('swingJazz');
export const ELECTRO_SWING = stylePoint('electroSwing');
export const SPOOKY = stylePoint('spooky');
export const KINDERLIED = stylePoint('kinderlied');
