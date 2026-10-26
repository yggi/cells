/** A braid's steps: numbers, rests, chords, subsequences, choices, cells (picked, shifted, transposed) and their modifiers. */
import type { Token } from '../ast';
import { type LineScanner } from './scanner';
import { type Syntax } from './syntax';
/** What a braid's steps can be. */
export declare const STEP_SYNTAX: readonly Syntax[];
/** Operations on a reference's values, by name: degree(&x, n), inverse(&x) — nested as you like. */
export declare const OPERATIONS: readonly ["degree", "inverse"];
/**
 * Adds a step to a list, or, for `_`, lengthens the step before it by one (Strudel's elongation: `0 _ _` is `0@3`;
 * decision 027).
 */
export declare function pushStep(s: LineScanner, tokens: Token[], t: Token): void;
/** A step's modifiers, each at most once; the parser reads them through this table (and ? for chance). */
export declare const MODIFIERS: {
    readonly '!': {
        readonly field: "repeat";
        readonly syntax: Syntax;
    };
    readonly '*': {
        readonly field: "subdivide";
        readonly syntax: Syntax;
    };
    readonly '@': {
        readonly field: "elongate";
        readonly syntax: Syntax;
    };
};
export declare const SLOW_SYNTAX: Syntax;
export declare const EUCLID_SYNTAX: Syntax;
export declare const CHANCE_SYNTAX: Syntax;
export declare const LEVEL_SYNTAX: Syntax;
export declare const GAIN_SYNTAX: Syntax;
export declare function parseToken(s: LineScanner, depth?: number): Token;
