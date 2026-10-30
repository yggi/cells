/**
 * What a frontend draws as sounding out (decision 064): an **out** is a sound wired into a card, on a sound card
 * (`map=sample`) or a MIDI card (`map=midi`), the built-in card's (decision 028) included. A voice is an out of its own,
 * a gate's voices one each (decision 058: the gate is the performer, the voice what sounds), a kit one (its drums are
 * pieces of it), a mix, a tape's read head; one per card it reaches. A card's entry is not an out: it is the unit of a
 * render's stems (decision 062).
 *
 * And what a cell does with sound (`soundRole`), from the mix algebra's sorts: so no frontend reads it off the flags.
 */
import type { CompileResult, ResolvedCell } from './program';
import { isMidiCard } from './program';
import { writtenGraph, type GraphEdge } from './graph';
import { cellId } from './ids';

export interface Out {
  /** The edge into the card (as `writtenGraph(result, { card: true })` has it): live with it. */
  readonly id: string;
  /** The node whose sound it is: its wire leaves it. */
  readonly from: string;
  /** What sounds in it, by name: `from`'s cell, or a read head drawn on it. */
  readonly sound: string;
  /** The card, by name. */
  readonly card: string;
  readonly kind: 'sample' | 'midi';
  /** On a MIDI card, the channel it goes out on (1 … 16); null on a sound card. */
  readonly channel: number | null;
  /** The sides of the card it reaches: a sound card of two channels sends its first left, its second right; else both. */
  readonly left: boolean;
  readonly right: boolean;
}

const nameOf = (id: string) => id.slice('cell:'.length);

/**
 * The outs of a compiled piece, in the graph's order. `model`: the graph they are read from, when the caller has it
 * (its edges into cards: it must hold the built-in card, `writtenGraph(result, { card: true })`).
 */
export function outs(result: CompileResult, model: { readonly edges: readonly GraphEdge[] } = writtenGraph(result, { card: true })): Out[] {
  const cardOf = (id: string) => {
    const c = result.cells.get(nameOf(id));
    return c && (c.sink || isMidiCard(c)) ? c : undefined;
  };
  return model.edges.flatMap((e): Out[] => {
    // (an `about=` link into a card is no sound; a card into a card, none either)
    const card = cardOf(e.to);
    if (!card || cardOf(e.from) || e.port === 'about') return [];
    const sound = e.bulb ?? nameOf(e.from);
    if (card.sink) {
      const units = card.units;
      const k = units.length === 2 ? units.findIndex((u) => u.atom.kind === 'ref' && cellId(u.atom.name) === e.from) : -1;
      return [{ id: e.id, from: e.from, sound, card: card.name, kind: 'sample', channel: null, left: k !== 1, right: k !== 0 }];
    }
    return [{ id: e.id, from: e.from, sound, card: card.name, kind: 'midi', channel: channelOf(result, card, sound), left: true, right: true }];
  });
}

/** The channel a cell goes out on, on a MIDI card: the card's own, or its entry's, from the outputs that play it there. */
function channelOf(result: CompileResult, card: ResolvedCell, name: string): number | null {
  if (card.map?.kind === 'midi' && card.map.channel !== null) return card.map.channel;
  for (const o of result.outputs) if (o.voice === name || o.cell === name || o.tape?.head === name) for (const d of o.midi ?? []) if (d.card === card.name) return d.channel;
  return null;
}

/** A cell's part in making sound: it makes it, gates it (plays a maker), mixes it, or is a card it goes into. */
export type SoundRole = 'maker' | 'gate' | 'mixer' | 'card';

/**
 * What a cell does with sound (null: the structure; a note, which explains):
 * - `card`: a sound card or a MIDI card;
 * - `gate`: what plays voices, a gate (decision 023), or a pattern read through a kit (a groove);
 * - `mixer`: a mix over what it mixes (an instrument: decision 006's mix used as a voice);
 * - `maker`: what sounds of itself, by its sort (a voice, a kit, a read head, a braid at an audio rate), a tape or a
 *   resonator's body.
 */
export function soundRole(result: CompileResult, c: ResolvedCell): SoundRole | null {
  if (c.note) return null;
  if (c.sink || isMidiCard(c)) return 'card';
  if (c.gate || (c.over && result.cells.get(c.over)?.kit)) return 'gate';
  if (c.mix && !c.kit && !c.step && !c.voice) return 'mixer';
  if (c.voice || c.kit || typeof c.params.write === 'string' || typeof c.params.body === 'string' || typeof c.params.play === 'string') return 'maker';
  return c.sort === 'signal' || c.sort === 'wave' ? 'maker' : null;
}
