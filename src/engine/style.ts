/**
 * Style space (decision 063 §3): the table of axes a style is a point on, and the slots a map names. A fragment's
 * association points (`repository/fragments.ts`) are written on these axes, and a frontend reads them from here instead
 * of owning them (Jambot did, `packages/engine/src/style.ts`: lifted from yggi/jambot packages/engine/src/style.ts @
 * c0c8336, its four axes the composer asks on; entropy and the tempo stay a frontend's, outside a style).
 *
 * A map that names its slots (`SLOTS`) lets a pick read one by name, `&env[sustain]`, `&funk[artic]`: the slot's fixed
 * position, as written (`&env[$2]`, `&funk[$2]`). A style's slots are the axes, in this order, so `&funk map=style .3
 * .45 .55 .55` and `&funk map=style sync=.3 harm=.45 artic=.55 energy=.55` are one point.
 */

/** One axis of style space: its name, its range, the words a frontend shows for it, and what it measures. */
export interface Axis {
  readonly name: string;
  readonly range: readonly [number, number];
  /** Its name as a person reads it: `'Syncopation'`. */
  readonly label: string;
  /** What its low end and its high end sound like: `['on the beat', 'off the beat']`. */
  readonly ends: readonly [string, string];
  /** What it measures from one end to the other, said from its ends: `'On the beat (0) to off the beat (1).'` */
  readonly sentence: string;
}

/** An axis from its name, range, label and ends; its sentence is said from its ends. */
const axis = (name: string, range: readonly [number, number], label: string, ends: readonly [string, string]): Axis => ({
  name,
  range,
  label,
  ends,
  sentence: `${ends[0][0]!.toUpperCase()}${ends[0].slice(1)} (${range[0]}) to ${ends[1]} (${range[1]}).`,
});

/** The axes of style space, in their order: a style's slots, and what an association point is written on. */
export const AXES: readonly Axis[] = [
  axis('sync', [0, 1], 'Syncopation', ['on the beat', 'off the beat']),
  axis('harm', [0, 1], 'Harmony', ['a static vamp', 'moving, rich harmony']),
  axis('artic', [0, 1], 'Articulation', ['legato', 'staccato']),
  axis('energy', [0, 1], 'Energy', ['sparse', 'dense']),
];

/** The axes' names, in their order. */
export const AXIS_NAMES: readonly string[] = AXES.map((a) => a.name);

/** The slots a map names, in their order (a slot is its position): an envelope's four, a style's axes. */
export const SLOTS: Readonly<Record<string, readonly string[]>> = {
  adsr: ['attack', 'decay', 'sustain', 'release'],
  style: AXIS_NAMES,
};

/** The section's style, an interface name (decision 063 §3): the composer's to write, a score's note `&style`. */
export const STYLE = 'style';

/**
 * The centre of style space: each axis at the middle of its range. What a reader of `&style` plays where no line writes
 * it (a fragment heard alone, a text that names no style): the language's default, so no fragment defines `&style`.
 */
export const CENTRE: readonly number[] = AXES.map((a) => (a.range[0] + a.range[1]) / 2);
