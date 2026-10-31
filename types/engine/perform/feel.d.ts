/**
 * The default performer's feel (decision 063 §2, #392; yggi/music-commons `contracts/feel`, version 1, minor 1): how a
 * performer plays the events cells plays for a bar, its velocity loosened and accented and its length gated, so every
 * frontend plays a session as its host does; and which part and drum role each event is (`readerOf`: its performer's
 * role, or its output's id, `readingOf`). The text says what is composed, and the playing is the player's (decision 037).
 * The hub's README is the rule; `feel.test.ts` meets its vectors. Lifted from yggi/cell-studio src/session/feel.ts @
 * d5e7634 (written there from the hub's page, with no import from Jambot), but its reading of a host's `bar` message, which
 * is the session's: a frontend makes the frame.
 *
 * A performer's widths (`Widths`, its gate's `licence=` and `accents=`) scale how far it plays from what is written: 1, as
 * the contract plays, by default; 0, exactly as written.
 *
 * The feel moves an event's velocity and length, never its onset. Every number is a double and every operation is in the
 * contract's order, so the same bits come out as the host's.
 */
/** A section's type, as a host's plan names it. */
export type SectionType = 'intro' | 'groove' | 'bridge' | 'build' | 'drop' | 'breakdown';
/** What the performer reads of a bar: the fields of a host's `bar` message the feel needs. */
export interface FeelFrame {
    readonly seed: number;
    readonly bar: number;
    /** The bar's meter in eighths, each group a pulse. */
    readonly groups: readonly number[];
    readonly section: SectionType;
    readonly style: {
        readonly entropy: number;
        readonly artic: number;
        readonly sync: number;
    };
    readonly swing: {
        readonly level: '8n' | '16n';
        readonly share: number;
    };
    readonly energy: number;
}
/** A part as the feel keys it, in the order its draws number them. */
export type FeelPart = 'drums' | 'bass' | 'pad' | 'stab' | 'lead';
/** A drum hit's role in the groove. */
export type DrumRole = 'kick' | 'backbeat' | 'ghost' | 'hat' | 'pedal' | 'euclid' | 'clave' | 'fill';
/**
 * The part and drum role an event of a host's section text is, read off the output cells names it by
 * (`voice:cell:line:col`, split on `:`): a groove's member of the kit cells makes, `kit:voices:<role>:…`, is the drums,
 * its role the third field; any other output's part is its second field, the line its voice plays. Null for one that
 * names none of the feel's parts or roles: it plays as cells gives it. The fallback of a text's own reading (`readerOf`).
 */
export declare function readingOf(output: string | undefined): Reading | null;
/** An event's part and drum role, as the feel reads them. */
export type Reading = {
    readonly part: FeelPart;
    readonly role?: DrumRole;
};
/**
 * How a compiled text's events read (feel v1.2, yggi/music-commons#35; #511): a pitched event's part is the role of the
 * performer whose gate plays it (cells' `performers`: the gate its output goes through, alone, `via`, or in a stack,
 * `through`), as Jambot's `lineOf` reads it, so `&bassOut play=&bassline^$-12 &bassV`, role `bass`, plays the bass.
 * A drum hit keeps its line's role, and an output no performer's role names reads by its id (`readingOf`).
 */
export declare function readerOf(result: {
    readonly outputs: readonly {
        readonly id: string;
        readonly via: readonly string[];
        readonly through: readonly string[];
    }[];
    readonly performers: readonly {
        readonly name: string;
        readonly role?: string;
    }[];
}): (output: string | undefined) => Reading | null;
/** One of cells' events in a bar: its line, a drum's role, the step it is written on (whole), its note, velocity and sounding length in steps. */
export interface FeelEvent {
    readonly part: FeelPart;
    readonly role?: DrumRole;
    readonly step: number;
    readonly note: number;
    readonly velocity: number;
    readonly length: number;
}
/** How far the feel loosens a bar, 0 to 1: half its swing's weight, three tenths its entropy, a fifth its legato. */
export declare function feelOf({ style, swing }: FeelFrame): number;
/** How far a performer plays from what is written, each a share of the feel's: its licence (velocity and length) and its own accents. 1, as the contract; 0, as written. */
export interface Widths {
    readonly licence: number;
    readonly accents: number;
}
/** The contract's widths: a performer that plays as Jambot's does. */
export declare const CONTRACT_WIDTHS: Widths;
/** An event as the performers play it: its velocity loosened and accented, its length gated, by draws keyed by the bar and step (a drum's by its note too). */
export declare function played(frame: FeelFrame, event: FeelEvent, feel?: number, widths?: Widths): {
    velocity: number;
    length: number;
};
