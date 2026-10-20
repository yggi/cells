import type { Meter } from '../meter';
import type { Line } from './lines';
/** What no operator moves: a whole line, or (with the pitched operators) one note of it, its step on the line's grid. */
export interface Anchor {
    /** The line, as the card names it: `&kick`. */
    readonly line: string;
    readonly step?: number;
    readonly reason: 'kick' | 'backbeat';
}
/** Where a meter's backbeat falls, each in whole notes from the bar's start: 4/4's second and fourth beats, 6/8's second. */
export declare function backbeatOf(meter: Meter): number[];
/** The anchors among a fragment's lines: the kick's line, and the backbeat's. */
export declare function anchorsAmong(lines: readonly Line[]): Anchor[];
