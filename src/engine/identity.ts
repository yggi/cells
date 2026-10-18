/**
 * Identity: are two texts the same text, at some rung of decision 050's ladder? The text rungs (E), each implied by the one
 * above; the sound rungs (S) are `sameness.ts`'s. Pure.
 *
 *  - E0 `byteIdentical`: the texts are equal.
 *  - E1 `identicalUpToLayout`: equal once comments, whitespace and the lines a line continues onto are read as one
 *    (each declaration's code, as the union of fragments reads it: `repository/fit.ts`).
 *  - E2 `identicalUpToRenaming`: E1 once a text's own names are numbered in the order it declares them (`&#1`, `&#2`),
 *    the interface names (`&bar`, `key`, `&harm`) and the names it uses but doesn't define as written: the learned
 *    layer's `canonicalText` (decision 048).
 *  - E3 `normalFormIdentical`: E2 after `normalise` (one spelling per meaning, decision 049).
 *  - E4, structurally identical: E3 after the identity step (decision 049, ruling 1: stated defaults dropped); what a hash
 *    reads (#49). Not built.
 *  - E5, orbit identical: E4 up to the operators, a transposition, `^n`, a rotation (the pure cell, #46). Not built.
 *  - Minified identity: E4 after Shorten (the owner, #180), as E3 is E2 after Normalise. Built with E4.
 */
import { declarations } from '../repository/fit';
import { canonicalText } from '../repository/learned';
import { normalise } from './normalise/index';

/** E0: the texts are equal. */
export const byteIdentical = (a: string, b: string): boolean => a === b;

/** A text's code, a declaration to a line: comments aside, whitespace collapsed, a continued line joined. */
const layout = (text: string) =>
  declarations(text)
    .map((l) => l.code)
    .join('\n');

/** E1: equal once comments, whitespace and line continuations are read as one. */
export const identicalUpToLayout = (a: string, b: string): boolean => layout(a) === layout(b);

/** E2: E1 once each text's own names are numbered in the order it declares them. */
export const identicalUpToRenaming = (a: string, b: string): boolean => canonicalText(a) === canonicalText(b);

/** E3: E2 after `normalise`, every duplicate in its canonical spelling. */
export const normalFormIdentical = (a: string, b: string): boolean => identicalUpToRenaming(normalise(a).source, normalise(b).source);
