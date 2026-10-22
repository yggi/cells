/** Forms named before they are built (an attribute's `stub`, restart=: decision 032): in the reference, on no tier until they are. */
export declare const STUBS: ReadonlySet<string>;
/**
 * Forms read and played but on no tier yet (#337: Strudel's `<a b>`, `x/n`, `x(k,n,r)`): a tier's pieces must show its
 * forms, and no tutorial piece can show these without changing the notes it plays. They go on a tier (4, rhythm, or 5,
 * development) with the piece that shows them. `legato=` (#94, a line's articulation) waits for a piece of its own
 * on tier 4. `tags=`, a cell's clusters, lost its tier-1 pieces when the card's tags moved into the file's frontmatter
 * (decision 047): it goes on a tier with a piece whose cells it clusters. `use "id"` (decision 054) waits for the examples
 * to take a kit by it (#196's rung 4).
 */
export declare const PENDING: ReadonlySet<string>;
/**
 * A form's key, from its reference entry: an attribute or a parameter by its word (`over`, `lpf`);
 * a sort by its sort and what makes it one (`signal: a mix`); anything else by its first spelling
 * (`x!n`, `step=&x`), each after its section (`modifier x!n`).
 */
export declare function formKey(e: {
    readonly section: string;
    readonly form: string;
    readonly means: string;
}): string;
/**
 * The tiers: what each introduces, as forms (formKey). The order is the tutorial's; tier n is TIERS[n − 1], and
 * the numbers are stable (a tier is added at the end, never between). The pieces of a tier (several, in the
 * library's order) together use every form the tier introduces; none uses a form of a later tier. A piece
 * added to a tier for a variation changes no number.
 */
export declare const TIERS: readonly {
    readonly name: string;
    readonly concept: string;
    readonly forms: readonly string[];
}[];
/** Every form a piece uses (formKey), read from its text as parsed. */
export declare function formsUsed(source: string): Set<string>;
