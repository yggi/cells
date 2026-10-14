/**
 * Where sound goes (#132): every way sound can flow between cells, from what sounds into what hears it, as the
 * graph draws it (the edge ids are graph.ts's). One description, read by three: the graph's states (routing.ts,
 * what takes part in the sound), the audio (audio/wiring.ts, the connections `voices.sync` makes) and MIDI out (a
 * MIDI card's entries: `midi`, notes rather than sound, which the audio leaves alone and engine/midi.ts sends).
 *
 * The levels at which sound reaches a sound card (an output's gains, a read head's return, a resonator ringing
 * alone in a mix) are compile's (program.ts: `outputs`, `returns`, `resonances`): they sum the gains along the
 * flows listed here.
 */
import type { Binding } from './ast';
import type { CompileResult, ResolvedCell } from './program';
import { cellId, edgeId } from './ids';

/**
 * What a flow is:
 *  - `mix`: an entry of a mix (a voice, an instrument, a read head, a resonator, a mix) into it, at its gain;
 *  - `channel`: a sound card's named channel into it (`&out &left &right`);
 *  - `write`: a mix onto the sound tape that records it; `play`: a sound tape under a read head;
 *  - `excite`: a mix's sound driving a resonator; `couple`: coupled resonators ringing into each other;
 *  - `midi`: an entry of a MIDI card (map=midi) into it: a voice of a product written on it, or a cell named as the
 *    entry (a mix, a pattern read through a kit), at its channel. It carries notes (gate and pitch), not sound.
 */
type FlowKind = 'mix' | 'channel' | 'write' | 'play' | 'excite' | 'couple' | 'midi';

/** A way sound goes: from a cell (a voice, a mix, a tape head, a body) into what hears it. */
export interface Flow {
  /** Its edge in the graph (graph.ts ids). */
  readonly id: string;
  readonly kind: FlowKind;
  readonly from: string;
  readonly to: string;
  /** A mix entry's gain (the numbers in its product). */
  readonly gain?: number;
  /** A MIDI card's entry: the channel it goes out on (1–16). */
  readonly channel?: number;
  /** A coupling's way back: written on `to`'s line (`couple=&from`), not on `from`'s. */
  readonly back?: boolean;
}

/** The flows, in the order they're written (cell by cell), and by either end. */
export interface Flows {
  readonly all: readonly Flow[];
  readonly from: ReadonlyMap<string, readonly Flow[]>;
  readonly to: ReadonlyMap<string, readonly Flow[]>;
}

const cache = new WeakMap<CompileResult, Flows>();

/** Every way sound can go. */
export function flows(result: CompileResult): Flows {
  const hit = cache.get(result);
  if (hit) return hit;
  const all: Flow[] = [];
  const add = (kind: FlowKind, from: string, to: string, id = edgeId(cellId(from), cellId(to)), extra: Pick<Flow, 'gain' | 'back' | 'channel'> = {}) => {
    if (result.cells.has(from) && result.cells.has(to)) all.push({ id, kind, from, to, ...extra });
  };
  const soundTapes = new Set(result.tapes.map((t) => t.name));
  for (const c of result.cells.values()) {
    // into a mix (a voice, an instrument, a head, a body, a mix)
    for (const b of c.mix ?? []) add('mix', b.voice.name, c.name, undefined, { gain: b.gain });
    // a sound card's channels, named (&out &left &right)
    if (c.sink) for (const k of c.children.keys()) add('channel', k, c.name, edgeId(cellId(c.name), cellId(k)));
    // a MIDI card's entries, channel by channel: a product written on it (its voice in, as into a mix), a cell named
    for (const e of midiEntries(c)) {
      if (e.ref) add('midi', e.ref, c.name, edgeId(cellId(c.name), cellId(e.ref)), { channel: e.channel });
      for (const b of e.bindings) add('midi', b.voice.name, c.name, undefined, { gain: b.gain, channel: e.channel });
    }
    // a sound tape: a mix onto it, the tape under each read head
    const p = c.params;
    if (typeof p.write === 'string' && soundTapes.has(c.name)) add('write', p.write, c.name);
    if (typeof p.play === 'string' && soundTapes.has(p.play)) add('play', p.play, c.name);
    // a body: a mix's sound drives it; coupled bodies ring into each other
    if (typeof p.excite === 'string') add('excite', p.excite, c.name);
    if (typeof p.couple === 'string') {
      add('couple', c.name, p.couple);
      add('couple', p.couple, c.name, edgeId(cellId(c.name), cellId(p.couple)), { back: true });
    }
  }
  const by = (key: 'from' | 'to') => {
    const m = new Map<string, Flow[]>();
    for (const f of all) (m.get(f[key]) ?? m.set(f[key], []).get(f[key])!).push(f);
    return m;
  };
  const out: Flows = { all, from: by('from'), to: by('to') };
  cache.set(result, out);
  return out;
}

/**
 * A MIDI card's entries (map=midi), in order, with the channel each goes out on: a product written on it (`bindings`,
 * as written: compile's `typed` view is the outputs'), or a cell it names (`ref`). A rest skips a channel; `x!n` takes
 * n. Not a MIDI card: none.
 */
function midiEntries(c: ResolvedCell): { readonly channel: number; readonly ref: string | null; readonly bindings: readonly Binding[] }[] {
  if (c.map?.kind !== 'midi') return [];
  const one = c.map.channel;
  const out: { channel: number; ref: string | null; bindings: readonly Binding[] }[] = [];
  let at = 0;
  c.units.forEach((u, i) => {
    for (let k = 0; k < u.repeat; k++, at++) {
      const channel = one ?? at + 1;
      if (u.atom.kind === 'ref') out.push({ channel, ref: u.atom.name, bindings: [] });
      else if (u.atom.kind === 'mix') out.push({ channel, ref: null, bindings: c.chords?.[i] ?? [] });
    }
  });
  return out;
}
