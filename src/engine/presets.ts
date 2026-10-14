export interface Preset {
  /** Its title, description and tags are in its source: the first note with a title= (its card). */
  readonly source: string;
  /**
   * A fixed layout: where named cells sit, in columns (x) and rows (y, 0 at the
   * top: the sound card), pinned when the example loads. Cells not listed are
   * placed by the physics.
   */
  readonly layout?: Readonly<Record<string, readonly [number, number]>>;
}

import { ORDER, type PresetKey } from './order';

export type { PresetKey };

const files = import.meta.glob('/examples/*.cells', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/**
 * Every example's source, read eagerly: for the tests. The app loads pieces on demand
 * (src/examples.ts: an index made at build time, a source fetched when a piece opens).
 *
 * Examples, from one feature at a time (key and mode, rhythm, motifs, a
 * turning table, canon, sound, stereo) to the full pieces: one file each in
 * examples/<key>.cells, the same text a user saves.
 */
export const PRESETS = Object.fromEntries(
  ORDER.map((key) => {
    const source = files[`/examples/${key}.cells`];
    if (source === undefined) throw new Error(`examples/${key}.cells is missing`);
    return [key, { source: source.replace(/\n$/, '') }];
  }),
) as Record<PresetKey, Preset>;
