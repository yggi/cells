/**
 * How long to listen to a piece (docs/notes/scalogram.md): one that ends, the whole of it; one that loops, `cycles` of
 * its cycles (its longest layer when the cycle is longer than half an hour, as the transport has it: `mainLength`).
 * One cycle can't show what the loop itself does: Phase's drift is its whole cycle, a level only over several. At most
 * a day (the scalogram's grid thins beyond that).
 */
import { type PieceTime } from '../duration';
/** The seconds to listen to, and how many times round a loop they hold (1 for a piece that ends). */
export declare function listening(t: PieceTime, cycles?: number): {
    readonly seconds: number;
    readonly cycle: number | null;
    readonly rounds: number;
} | null;
