/**
 * Voices (docs/notes/disassembler.md, *Voices*): a keyboard part's notes as the voices a fugue is written in, not the
 * hands that play them. Measured on the MIDI library against the voices its typesetters wrote (midi/<set>/voices/), the
 * same notes a line a voice fold 6 % shorter than a line a hand, a sinfonia's 10–20 %: a subject stays in one line,
 * whichever hand plays it. Pure.
 *
 * After Chew & Wu's contig mapping (2004), on line: as many voices as notes ever sound at once; at each moment, the
 * notes that start there go to the voices free then, in order (the highest to the highest free voice: voices don't
 * cross where they need not), the order that moves each voice least from where it last was; a voice not heard yet
 * starts from its place in the first moment all of them sound (a fugue's voices enter one at a time, each in its
 * register).
 */
/** A note to give a voice: when it starts and ends (any unit), its pitch. */
export interface Voiced {
    readonly start: number;
    readonly end: number;
    readonly key: number;
}
/** As many voices as notes sound at once, but for the thickest moments (`THICK` of the time; a note's end and another's
 * start at one moment don't overlap). */
export declare function voiceCount(notes: readonly Voiced[]): number;
/** Each note's voice (0 the highest), and how many voices. */
export declare function voicesOf(notes: readonly Voiced[]): {
    voice: number[];
    count: number;
};
