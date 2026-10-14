/**
 * Is the fold's tree heard? (#286's last question, docs/notes/scalogram.md *What is next*; docs/notes/disassembler.md.)
 * A folded piece's phrases (its splice tree, engine/time/structure.ts: each cell where it plays) against the boundaries
 * its sound has (the swells of three scalograms, engine/time/boundaries.ts): the phrases of 4 s or more (at most a third
 * of the piece), each start a boundary the fold writes; swells at the scale of their median length, scored as the
 * scalogram probe scores sections. Precision well above chance: the fold cuts where a listener hears a cut.
 */
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { eventsBetween, plan } from '../../src/engine/realize';
import { grid } from '../../src/engine/time/wavelet';
import { scalograms } from '../../src/engine/time/signals';
import { score, swells } from '../../src/engine/time/boundaries';
import { structure } from '../../src/engine/time/structure';

/** A phrase: this long at least (s). */
const PHRASE = 4;

/** The fold's phrases against the swells heard: precision, recall, chance (null: too few phrases to say). */
export function heardFold(source: string): { precision: number; recall: number; chance: number; phrases: number; span: number } | null {
  const program = compileSource(source);
  if (!program.ok) return null;
  const played = plan(program, codeShifts(program), program.off);
  const window = played.end;
  if (!(window > 3 * PHRASE)) return null;
  const nodes = structure(played, window).filter((n) => n.depth > 0 && n.to - n.at >= PHRASE && n.to - n.at <= window / 3);
  const starts = [...new Set(nodes.map((n) => Math.round(n.at * 20) / 20))].filter((t) => t > 0.5 && t < window - 0.5).sort((a, b) => a - b);
  if (starts.length < 3) return null;
  const lengths = nodes.map((n) => n.to - n.at).sort((a, b) => a - b);
  const span = lengths[lengths.length >> 1]!;
  const sig = scalograms(eventsBetween(played, 0, window), grid(window), ['envelope', 'change', 'voices']);
  const found = swells([sig.envelope!, sig.change!, sig.voices!], span);
  const r = score(found, starts, window, Math.max(1, span / 10));
  return { precision: r.precision, recall: r.recall, chance: r.chance, phrases: starts.length, span };
}
