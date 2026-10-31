/**
 * A bar's swing (yggi/music-commons `contracts/swing`, version 1), as a performer reads cells' playing back onto its
 * bar's grid (#392): where a written step of a bar grouped in eighths is played, and its inverse, where a played position
 * is written. Lifted from yggi/cell-studio src/session/swing.ts @ d5e7634 (written there from the hub's README, with no
 * import from Jambot); `swing.test.ts` meets the hub's vectors. Jambot reads each of cells' events so (`leanMap`'s `written`, `section-play.ts`), and the feel keys an event
 * by the step it is written on.
 *
 * Positions are in steps from the bar's downbeat, two to the eighth; past the bar's end, the next bar swings as this one.
 */
/** A level of swing: its note value and the share of each of its spans the span's first half holds (1/2 straight). */
export interface SwingLevel {
    readonly level: '8n' | '16n';
    readonly share: number;
}
/** Where a written position of a bar is played, in steps from its downbeat. */
export declare const swungAt: (written: number, groups: readonly number[], swing: readonly SwingLevel[]) => number;
/** Where a played position of a bar is written: `swungAt` undone. */
export declare const writtenAt: (played: number, groups: readonly number[], swing: readonly SwingLevel[]) => number;
