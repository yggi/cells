/**
 * What an output plays, said once for the routing and the graph (#385): the cell its mixes name, the written pair its
 * notes take into its voice, the outputs a gate plays and the receiver each is drawn as, the outputs a mix's product
 * makes. The routing (routing.ts) lights an output's pairs; the graph (graph.ts) draws wires that stand for outputs,
 * and is routed where their pairs are: a lookup, not a second guess at which kit or voice the compiler chose.
 */
import { type CompileResult, type Output } from './program';
/** What its mixes name: the voice, or a kit's stream (&drums, read through the kit, maybe held under a melody); a gate names the kit it plays. */
export declare const sourceOf: (result: CompileResult, o: Output) => string;
/**
 * The written pair an output's notes take into its voice (its term into it, or off a tape its read head): the routing
 * lights it with the output, and only then. None for a drone: nothing starts its notes.
 */
export declare const noteEdge: (o: Output) => string | null;
/**
 * The outputs a product in a mix makes (a mix's or a card's entry `voice`: the outputs that go into it and play on the
 * voices the entry sounds), and the written pair a term takes into each one's voice: a term's wire into the product's
 * junction is routed when one of them is.
 */
export declare function productOutputs(result: CompileResult, mix: string, voice: string): Output[];
/** The written pairs a term of a product takes, each into the voice of an output of the product that reads it. */
export declare const termPairs: (made: readonly Output[], term: string) => string[];
/**
 * The kit a cell sounds through, and its drums: a kit itself, or the kit a pattern is read through (`over=`); null for
 * anything else. What a frontend reads for a kit's sound (its drums' spectra, its lowest drum's height).
 */
export declare function kitOf(result: CompileResult, name: string): {
    readonly kit: string;
    readonly drums: readonly string[];
} | null;
/** One voice a gate plays, as drawn (decision 022): a receiver it names, and the outputs that sound it. */
export interface GateVoice {
    /** The receiver, as written and drawn: a voice, a kit. */
    readonly name: string;
    /** The outputs whose notes the gate sends it (their voice it, the kit it is a piece of, or a kit of drums it holds). */
    readonly outputs: readonly Output[];
}
/**
 * The voices a gate plays, each with its outputs, from the outputs that go through it: a receiver stands for an output
 * whose voice is the receiver, a kit of bare voices it is one of (the gate's own, `<gate>:kit`), or the grooves' kit of
 * drums it holds (a drummer's lines that name their drums, `kit:voices`: #379).
 */
export declare function gateVoices(result: CompileResult, gate: string): readonly GateVoice[];
/**
 * What a gate's outputs take into it: each output's note pair (its notes into its voice) and its sound into the gate
 * (the flow from what its mix names, `sourceOf`, into the gate): a wire into or out of the gate for those outputs is
 * routed when both are.
 */
export declare function gatePairs(result: CompileResult, gate: string, outputs: readonly Output[]): {
    readonly notes: string[];
    readonly sound: string[];
    readonly terms: string[];
};
