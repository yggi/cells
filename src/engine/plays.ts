/**
 * What an output plays, said once for the routing and the graph (#385): the cell its mixes name, the written pair its
 * notes take into its voice, the outputs a gate plays and the receiver each is drawn as, the outputs a mix's product
 * makes. The routing (routing.ts) lights an output's pairs; the graph (graph.ts) draws wires that stand for outputs,
 * and is routed where their pairs are: a lookup, not a second guess at which kit or voice the compiler chose.
 */
import { isMidiCard, type CompileResult, type Output } from './program';
import { cellId, edgeId } from './ids';

/** What its mixes name: the voice, or a kit's stream (&drums, read through the kit, maybe held under a melody); a gate names the kit it plays. */
export const sourceOf = (result: CompileResult, o: Output): string => {
  const read = o.mods.find((m) => m.picks)?.cell ?? o.cell;
  return o.kit && result.cells.get(read)?.over === o.voice ? read : o.voice;
};

/**
 * The written pair an output's notes take into its voice (its term into it, or off a tape its read head): the routing
 * lights it with the output, and only then. None for a drone: nothing starts its notes.
 */
export const noteEdge = (o: Output): string | null => (o.drone ? null : edgeId(cellId(o.tape ? o.tape.head : o.cell), cellId(o.voice)));

/** The cells an output's product reads (what starts its notes, its pitch and volume streams, its envelope, a tape's head). */
const termsOf = (o: Output): string[] => [
  o.cell,
  ...o.mods.map((m) => m.cell),
  ...o.levels.map((m) => m.cell),
  ...(o.envelopeCell ? [o.envelopeCell] : []),
  ...(o.tape ? [o.tape.head] : []),
];

/** Does it go into this mix or card (a sound card, a mix it passes through or plays as an instrument, a MIDI card it is sent on)? */
const into = (o: Output, mix: string) => o.via.includes(mix) || o.through.includes(mix) || !!o.midi?.some((d) => d.card === mix);

/**
 * The outputs a product in a mix makes (a mix's or a card's entry `voice`: the outputs that go into it and play on the
 * voices the entry sounds), and the written pair a term takes into each one's voice: a term's wire into the product's
 * junction is routed when one of them is.
 */
export function productOutputs(result: CompileResult, mix: string, voice: string): Output[] {
  const voices = soundVoices(result, voice);
  return result.outputs.filter((o) => into(o, mix) && voices.has(o.voice));
}

/** The written pairs a term of a product takes, each into the voice of an output of the product that reads it. */
export const termPairs = (made: readonly Output[], term: string): string[] => [
  ...new Set(made.filter((o) => termsOf(o).includes(term)).map((o) => edgeId(cellId(term), cellId(o.voice)))),
];

/**
 * The kit a cell sounds through, and its drums: a kit itself, or the kit a pattern is read through (`over=`); null for
 * anything else. What a frontend reads for a kit's sound (its drums' spectra, its lowest drum's height).
 */
export function kitOf(result: CompileResult, name: string): { readonly kit: string; readonly drums: readonly string[] } | null {
  const own = result.cells.get(name);
  const kit = own?.kit ? own : own?.over ? result.cells.get(own.over) : undefined;
  return kit?.kit ? { kit: kit.name, drums: kit.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : [])) } : null;
}

/** The voices a mix's entry plays on, as the outputs have them: the voice, an instrument's own (its mix's voices), a kit a pattern is read through. */
function soundVoices(result: CompileResult, name: string): Set<string> {
  const out = new Set<string>();
  const walk = (n: string, guard: number) => {
    const c = result.cells.get(n);
    if (c?.mix && !c.sink && !isMidiCard(c) && guard < 16) for (const b of c.mix) walk(b.voice.name, guard + 1);
    else out.add(kitOf(result, n)?.kit ?? n);
  };
  walk(name, 0);
  return out;
}

/** One voice a gate plays, as drawn (decision 022): a receiver it names, and the outputs that sound it. */
export interface GateVoice {
  /** The receiver, as written and drawn: a voice, a kit. */
  readonly name: string;
  /** The outputs whose notes the gate sends it (their voice it, the kit it is a piece of, or a kit of drums it holds). */
  readonly outputs: readonly Output[];
}

const memo = new WeakMap<CompileResult, Map<string, GateVoice[]>>();

/**
 * The voices a gate plays, each with its outputs, from the outputs that go through it: a receiver stands for an output
 * whose voice is the receiver, a kit of bare voices it is one of (the gate's own, `<gate>:kit`), or the grooves' kit of
 * drums it holds (a drummer's lines that name their drums, `kit:voices`: #379).
 */
export function gateVoices(result: CompileResult, gate: string): readonly GateVoice[] {
  let byGate = memo.get(result);
  if (!byGate) memo.set(result, (byGate = new Map()));
  const hit = byGate.get(gate);
  if (hit) return hit;
  const c = result.cells.get(gate);
  const outputs = result.outputs.filter((o) => into(o, gate));
  const members = (name: string) => kitOf(result, name)?.drums ?? [];
  const stands = (receiver: string, o: Output) => {
    if (o.voice === receiver) return true;
    const kit = result.cells.get(o.voice);
    if (!kit?.kit || !kit.implicit) return false;
    const held = members(o.voice);
    return held.includes(receiver) || (!!result.cells.get(receiver)?.kit && held.every((m) => members(receiver).includes(m)));
  };
  const out = (c?.gate?.receivers ?? []).filter((r) => result.cells.has(r)).map((name) => ({ name, outputs: outputs.filter((o) => stands(name, o)) }));
  byGate.set(gate, out);
  return out;
}

/**
 * What a gate's outputs take into it: each output's note pair (its notes into its voice) and its sound into the gate
 * (the flow from what its mix names, `sourceOf`, into the gate): a wire into or out of the gate for those outputs is
 * routed when both are.
 */
export function gatePairs(result: CompileResult, gate: string, outputs: readonly Output[]): { readonly notes: string[]; readonly sound: string[]; readonly terms: string[] } {
  const g = cellId(gate);
  return {
    notes: [...new Set(outputs.flatMap((o) => noteEdge(o) ?? []))],
    sound: [...new Set(outputs.map((o) => edgeId(cellId(sourceOf(result, o)), g)))],
    // (and every term into its voice, its levels and envelope too: the pairs its wires stand for)
    terms: [...new Set(outputs.flatMap((o) => termsOf(o).map((t) => edgeId(cellId(t), cellId(o.voice)))))],
  };
}
