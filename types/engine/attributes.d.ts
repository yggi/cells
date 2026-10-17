/**
 * Every attribute a cell's line can carry (`key=value`), in one table: what it
 * means, what it takes, what it acts on and where it is documented. The parser,
 * the compiler, the node editor and the docs test read it from here.
 */
/**
 * What a cell is, as far as an attribute cares. A cell can be several: a meter
 * with a motor is a `clock` and a `motor`.
 */
export type Role = 'voice' | 'clock' | 'driven' | 'motor' | 'tape' | 'head' | 'resonator' | 'scope' | 'law' | 'card' | 'note' | 'carrier' | 'modulator' | 'gate' | 'tap' | 'selector';
export interface Attribute {
    /** What it means, as the node editor shows it. */
    readonly help: string;
    /** The page under docs/language/ that explains it (the docs test checks `key=` is written there). */
    readonly doc: string;
    /** What it takes, beyond its own syntax: `number` (or free()), `word` (a name), `cell` (&x). */
    readonly value: 'number' | 'word' | 'cell' | 'syntax';
    /** The roles it acts on; anywhere else it does nothing (a warning). Absent: any cell. */
    readonly on?: readonly Role[];
    /** How it is written, where that is more than its value (`swing=8n:.67`); absent: from `value`. */
    readonly form?: string;
    /** It makes the cell a voice (a sound parameter). */
    readonly voice?: true;
    /** It can move: lpf=&sweep, lpf=200..3000 * &fenv. */
    readonly moves?: true;
    /** It is a time: seconds, or a clock (delaytime=&bar*2). */
    readonly clock?: true;
    /** It is a frequency or a rate, in Hz (lpf=1200, wanderhz=.5): its slider over a wide range runs on a log scale. */
    readonly hz?: true;
    /** An old spelling, still read and rewritten by Shorten: what says it now. Not in the reference. */
    readonly old?: string;
    /** Named before it is built (some of its values warn and play as the default): in the reference, taught on no tier yet. */
    readonly stub?: true;
}
/** The attributes with a syntax of their own (the parser reads each): every cell can carry these. */
export declare const CORE: Readonly<Record<string, Attribute>>;
/** Parameters: `key=value`, a number (or free()), a word or a cell — the voice's, and the physical cells'. */
export declare const PARAMS: Readonly<Record<string, Attribute>>;
/**
 * Strudel's and dough's other names for parameters that mean the same here, in the same units (decision 027,
 * #337): each reads as ours. The text keeps what was written; the parser and everything after it see ours, so an
 * alias and its name on one line are one parameter given twice. Strudel's registerControl lists
 * (`@strudel/core/controls.mjs`) and dough's (`dough.h`); left out, because the meaning or the scale differs:
 * `size` `sz` `roomsize` `rsize` (a reverb's size; size= is how large a cell is drawn), `dist` (Strudel's
 * distort, on another scale than ours), `fm` `fmi` `fmh` (Strudel's FM is a number on the carrier; ours names a
 * cell, its ratio= on the modulator), `vel` `velocity` (a gate's old spelling here), `att` `dec` `sus` `rel` and
 * the filter envelopes (an envelope is a cell). Strudel's `clip` is its `legato`, read as ours (#94).
 */
export declare const PARAM_ALIASES: Readonly<Record<string, string>>;
/** A parameter's own name for a key as written: ours for an alias (cutoff → lpf), the key itself otherwise. */
export declare const canonicalParam: (key: string) => string;
/** Every attribute: the core ones, then the parameters. */
export declare const ATTRIBUTES: Readonly<Record<string, Attribute>>;
/** Parameters that name a cell (fm=&op, write=&melody …): the parser reads a reference. */
export declare const CELL_PARAMS: ReadonlySet<string>;
/** Parameters that are times: they take a clock as well as seconds (delaytime=&bar*2). */
export declare const TIME_PARAMS: ReadonlySet<string>;
/** Attributes that can move (given by cells): lpf=&sweep, lpf=200..3000 * &fenv, pitch=0..30 * &drop. */
export declare const MOVING_PARAMS: ReadonlySet<string>;
/** Parameters that make a cell a voice; the rest are a physical cell's (motor=, write=, scope= …) and make none. */
export declare const VOICE_PARAMS: ReadonlySet<string>;
/** Who an attribute acts on, in words: "a voice", "a tape or a read head". */
export declare function rolesText(on: readonly Role[]): string;
/** The nearest attribute to a misspelt one (one or two edits away), or null. */
export declare function nearestAttribute(word: string): string | null;
