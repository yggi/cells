export interface Preset {
  /** The piece: the text in its file's cells block, what compiles. */
  readonly source: string;
  /** Its file (piecefile.ts): its title, tags and tier in the frontmatter, `pieceMeta(file)` its card. */
  readonly file: string;
  /**
   * A fixed layout: where named cells sit, in columns (x) and rows (y, 0 at the
   * top: the sound card), pinned when the example loads. Cells not listed are
   * placed by the physics.
   */
  readonly layout?: Readonly<Record<string, readonly [number, number]>>;
}

import { ORDER, type PresetKey } from './order';
import { readPiece } from './piecefile';

export type { PresetKey };

import { EXAMPLE_FILES } from './examples.generated';

/**
 * Every example, read eagerly from the generated index (tools/examples.ts), with no file system or bundler: for the
 * tests, and for any host that wants them all. A workbench may load pieces on demand instead.
 *
 * Examples, from one feature at a time (key and mode, rhythm, motifs, a
 * turning table, canon, sound, stereo) to the full pieces: one file each in
 * examples/<key>.md, a piece file (the same form a person's pieces take, decision 047).
 */
export const PRESETS = Object.fromEntries(
  ORDER.map((key) => {
    const file = EXAMPLE_FILES[key];
    if (file === undefined) throw new Error(`examples/${key}.md is missing`);
    const piece = readPiece(file);
    if ('problems' in piece) throw new Error(`examples/${key}.md: ${piece.problems.map((p) => `line ${p.line}: ${p.message}`).join('; ')}`);
    return [key, { source: piece.text, file }];
  }),
) as Record<PresetKey, Preset>;
