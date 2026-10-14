import type { Atom } from '../ast';
import { type LineScanner } from './scanner';
import { type Syntax } from './syntax';
/** A mix's syntax (what it means is the algebra: decision 006, mix.md). */
export declare const MIX_SYNTAX: readonly Syntax[];
/** A gate (decision 023: docs/language/mix.md, a gate): a product with a name, its notes, its level, what it plays. */
export declare const GATE_SYNTAX: readonly Syntax[];
/**
 * A bracket holding cells (`[&theme * &lead, …]`, `[&bd, &sd]`) is a mix of sounds, not steps — unless one of its
 * comma-separated parts is several steps side by side, which makes it a subsequence or a stack of them (decision 027):
 * `[&a &b]`, `[&bd [&hh &hh]]`, `[&bd, &hh &hh]`. A part is a mix's term when it is one item, or its items are joined by
 * operators (`&a * &b`, `(&x + 12) * &v`).
 */
export declare function isMixChord(text: string, at: number): boolean;
export declare function parseMixChord(s: LineScanner): Atom;
