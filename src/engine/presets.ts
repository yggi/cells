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

/** The library's order (the files themselves sort by name). */
const ORDER = ['metronome', 'transpose', 'rhythm', 'twinkle', 'fifths', 'canon', 'waveforms', 'stereo', 'lullaby', 'jazz', 'five', 'waltz', 'sailor', 'royal', 'pertonos', 'ricercar', 'korobeiniki', 'coltrane', 'bossa', 'bell', 'prelude', 'pachelbel', 'pop', 'idm', 'alpha', 'studie', 'just', 'bwv847', 'acid', 'zell', 'cellscape', 'cellscape2', 'baustelle', 'focus', 'hypercell', 'onemore', 'brothers', 'ghosts', 'tines', 'phase', 'dtmf', 'musicbox', 'tape', 'automaton', 'echotape', 'soundtape', 'testtones', 'forks', 'resonanz', 'kalimba', 'harmonograph', 'fiveto12'] as const;

export type PresetKey = (typeof ORDER)[number];

const files = import.meta.glob('/examples/*.cells', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/**
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
