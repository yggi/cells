/**
 * Every place a number is written, and what may stand there besides one (decision 078): `free(v, lo..hi)` wherever a
 * number is (the text's: its slider rewrites the number, and the piece compiles again), a cell only where the number is
 * read while the piece plays (the playing's). The scanner's one number reader (`LineScanner.free`) takes a place from
 * this table; `docs/language/free.md`'s table is generated from it (`npm run reference`), so the two can't drift.
 */
import type { FreeSpec } from '../ast';
/** One place a number is written. */
export interface NumberPlace {
    /** Its form, as written: `cycle=n`. */
    readonly form: string;
    /** The slider's name (a setting's own, given where it is read, overrides it). */
    readonly name: string;
    /** What its free(…) sets: the key a frontend draws it by ('param' with `name`, unless the place has a key of its own). */
    readonly key?: FreeSpec['key'];
    /** A rate: the value may carry its unit (bpm, hz, k). */
    readonly units?: boolean;
    /** A count, an index, a turn: whole numbers, the slider moving by ones. */
    readonly whole?: boolean;
    /** Read before decision 078, its free(…)'s range not checked whole (texts that compiled compile the same); its value is rounded, as every whole place's. */
    readonly rounds?: boolean;
    /** The least and the most a free(…)'s range may reach here. */
    readonly min?: number;
    readonly max?: number;
    /** A free(…) here would move nothing: why a plain number stays (none of the places but these). */
    readonly fixed?: string;
    /** What a cell does here: it moves the number (read while the piece plays), or why it doesn't. */
    readonly cell: string;
    /** Moved by a cell: a text where only a number may stand refuses one with the rule; this place reads its cells itself. */
    readonly moves?: true;
    /** A text with a free(…) here (or, for a fixed place, its number), parsed by the tests and shown in the table. */
    readonly example: string;
}
/** A cell where the number is read as the piece is built (decision 078): the shape would change while it plays, a selector's work (#51). */
export declare const BUILT = "no: read as the piece is built";
/** The places, in the order free.md shows them. */
export declare const NUMBER_PLACES: {
    readonly param: NumberPlace;
    readonly level: NumberPlace;
    readonly slot: NumberPlace;
    readonly axis: NumberPlace;
    readonly end: NumberPlace;
    readonly share: NumberPlace;
    readonly depth: NumberPlace;
    readonly legatoShare: NumberPlace;
    readonly gain: NumberPlace;
    readonly hit: NumberPlace;
    readonly weight: NumberPlace;
    readonly tonic: NumberPlace;
    readonly rate: NumberPlace;
    readonly by: NumberPlace;
    readonly shift: NumberPlace;
    readonly stride: NumberPlace;
    readonly cycle: NumberPlace;
    readonly laps: NumberPlace;
    readonly chance: NumberPlace;
    readonly seed: NumberPlace;
    readonly size: NumberPlace;
    readonly interval: NumberPlace;
    readonly intervals: NumberPlace;
    readonly geo: NumberPlace;
    readonly args: NumberPlace;
    readonly evenArg: NumberPlace;
    readonly fifths: NumberPlace;
    readonly phase: NumberPlace;
    readonly meter: NumberPlace;
    readonly grid: NumberPlace;
    readonly ratio: NumberPlace;
    readonly step: NumberPlace;
    readonly modifier: NumberPlace;
    readonly drop: NumberPlace;
    readonly euclidOn: NumberPlace;
    readonly pick: NumberPlace;
    readonly turn: NumberPlace;
    readonly move: NumberPlace;
    readonly tier: NumberPlace;
    readonly hitNumber: NumberPlace;
};
