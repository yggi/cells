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

/** One axis of style space: its name, its range, and what it measures from one end to the other. */
export interface Axis {
  readonly name: string;
  readonly range: readonly [number, number];
  readonly sentence: string;
}

/** The axes of style space, in their order: a style's slots, and what an association point is written on. */
export const AXES: readonly Axis[] = [
  { name: 'sync', range: [0, 1], sentence: 'On the beat (0) to off the beat (1).' },
  { name: 'harm', range: [0, 1], sentence: 'A static vamp (0) to moving, rich harmony (1).' },
  { name: 'artic', range: [0, 1], sentence: 'Legato (0) to staccato (1).' },
  { name: 'energy', range: [0, 1], sentence: 'Sparse (0) to dense (1).' },
];

/** The axes' names, in their order. */
export const AXIS_NAMES: readonly string[] = AXES.map((a) => a.name);

/** The slots a map names, in their order (a slot is its position): an envelope's four, a style's axes. */
export const SLOTS: Readonly<Record<string, readonly string[]>> = {
  adsr: ['attack', 'decay', 'sustain', 'release'],
  style: AXIS_NAMES,
};
