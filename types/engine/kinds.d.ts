/**
 * What a cell is: its kind (#782). A line's attributes and braid make it a voice, a meter, a gate, a kit, a card …, and
 * that was inferred where it was needed: the sorts of a mix (`compiler/sorts.ts`), the roles an attribute acts on
 * (`compiler/roles.ts`), the Stats page's count (`stats.ts`). This is the one table: every cell of a compiled piece has
 * exactly one kind, the first rule that holds, read from its own line and the lines it names.
 *
 * A kind is not what reads a cell. A cell another reads through with `over=`, a name a table of sections declares, a
 * performer of a band, a voice another's `fm=` names: those are relations between two cells, and a cell of any kind can
 * stand in them. Pure: the compiled piece in, a word out.
 */
import type { CompileResult, ResolvedCell } from './program';
/** The kinds, in the order their rules are tried. */
export declare const KINDS: readonly ["note", "card", "midi card", "gate", "role", "style", "scope", "fill", "tape", "head", "sum", "phrase", "mix", "resonator", "voice", "kit", "band", "meter", "tempo", "grid", "envelope", "ramp", "volume", "sections", "selector", "number", "line", "table", "blank", "steps"];
export type Kind = (typeof KINDS)[number];
/** What a rule may look at beside the cell: the piece. */
interface Seen {
    readonly result: CompileResult;
    /** The tables of names that declare sections (decision 016). */
    readonly sectionTables: ReadonlySet<string>;
    /** The tables of performers (decision 061). */
    readonly bands: ReadonlySet<string>;
}
export interface KindRule {
    readonly kind: Kind;
    /** What makes a cell this kind, in words. */
    readonly is: string;
    /** A cell of this kind: the last line; the lines before it are what it needs. */
    readonly example: readonly string[];
    readonly holds: (c: ResolvedCell, seen: Seen) => boolean;
}
/** What a cell is, from its own line and the lines it names. The first rule that holds decides. */
export declare const KIND_RULES: readonly KindRule[];
/** kindOf(name): what each cell of a compiled piece is (`KIND_RULES`); null for a name the piece doesn't have. */
export declare function kindsOf(result: CompileResult): (name: string) => Kind | null;
export {};
