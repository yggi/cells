/**
 * How long to listen to a piece (docs/notes/scalogram.md): one that ends, the whole of it; one that loops, `cycles` of
 * its cycles (its longest layer when the cycle is longer than half an hour, as the transport has it: `mainLength`).
 * One cycle can't show what the loop itself does: Phase's drift is its whole cycle, a level only over several. At most
 * a day (the scalogram's grid thins beyond that).
 */
import { mainLength, type PieceTime } from '../duration';

const DAY = 86400;

/** The seconds to listen to, and how many times round a loop they hold (1 for a piece that ends). */
export function listening(t: PieceTime, cycles = 3): { readonly seconds: number; readonly cycle: number | null; readonly rounds: number } | null {
  const one = mainLength(t);
  if (one === null || !(one > 0)) return null;
  if (t.ends !== null) return { seconds: Math.min(one, DAY), cycle: null, rounds: 1 };
  const rounds = Math.max(1, Math.min(cycles, Math.floor(DAY / one)));
  return { seconds: one * rounds, cycle: one, rounds };
}
