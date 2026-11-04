import type { Fragment, WeightedPoint } from './fragments';
/** How a `from` line takes a template with these arguments, and the id a query answers with: `diatonic(mode=aeolian)`. */
export declare const takenAs: (id: string, args: Readonly<Record<string, string>>) => string;
/**
 * A template with value arguments bound (#387): each argument's default line gone, its parameter out of the signature, its
 * value written where the parameter was read. `diatonic` with `mode=aeolian` is `&key from &tonic` and
 * `&key scale(aeolian, &tonic)`, the text the old `aeolian` was, so it plays (and hashes) as that did.
 */
export declare function boundText(text: string, args: Readonly<Record<string, string>>): string;
/**
 * A fragment as a repository holds it: its own, where it has points with no arguments, and one for each set of arguments
 * its points carry, the template with them bound, its id the way a `from` line takes it (`diatonic(mode=aeolian)`), in the
 * order the points first name them. A seed file's and a filed one's alike; a fragment with no arguments is itself.
 */
export declare function variantsOf(fragment: Fragment): Fragment[];
/** The arguments a variant of this fragment is taken with, where `id` names one of its sets; undefined where it names none. */
export declare function argsOf(fragment: Fragment, id: string): Readonly<Record<string, string>> | undefined;
/** Whether a point is of the variant taken with these arguments (none: the fragment's own points, with none). */
export declare const ofArgs: (wp: WeightedPoint, args: Readonly<Record<string, string>> | undefined) => boolean;
