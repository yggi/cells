/**
 * Where sound goes (#132): every way sound can flow between cells, from what sounds into what hears it, as the
 * graph draws it (the edge ids are graph.ts's). One description, read by two: the graph's states (routing.ts,
 * what takes part in the sound) and the audio (audio/wiring.ts, the connections `voices.sync` makes).
 *
 * The levels at which sound reaches a sound card (an output's gains, a read head's return, a resonator ringing
 * alone in a mix) are compile's (program.ts: `outputs`, `returns`, `resonances`): they sum the gains along the
 * flows listed here.
 */
import type { CompileResult } from './program';
import { selectsSound } from './clocking';
import { cellId, edgeId } from './ids';

/**
 * What a flow is:
 *  - `mix`: an entry of a mix (a voice, an instrument, a read head, a resonator, a mix) into it, at its gain;
 *  - `channel`: a sound card's named channel into it (`&out &left &right`);
 *  - `part`: a part into its table of parts, the table into the selector that reads it;
 *  - `write`: a mix onto the sound tape that records it; `play`: a sound tape under a read head;
 *  - `excite`: a mix's sound driving a resonator; `couple`: coupled resonators ringing into each other.
 */
type FlowKind = 'mix' | 'channel' | 'part' | 'write' | 'play' | 'excite' | 'couple';

/** A way sound goes: from a cell (a voice, a mix, a tape head, a body) into what hears it. */
export interface Flow {
  /** Its edge in the graph (graph.ts ids). */
  readonly id: string;
  readonly kind: FlowKind;
  readonly from: string;
  readonly to: string;
  /** A mix entry's gain (the numbers in its product). */
  readonly gain?: number;
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
  const add = (kind: FlowKind, from: string, to: string, id = edgeId(cellId(from), cellId(to)), extra: Pick<Flow, 'gain' | 'back'> = {}) => {
    if (result.cells.has(from) && result.cells.has(to)) all.push({ id, kind, from, to, ...extra });
  };
  const soundTapes = new Set(result.tapes.map((t) => t.name));
  for (const c of result.cells.values()) {
    // into a mix (a voice, an instrument, a head, a body, a mix)
    for (const b of c.mix ?? []) add('mix', b.voice.name, c.name, undefined, { gain: b.gain });
    // a sound card's channels, named (&out &left &right, &out &song)
    if (c.sink) for (const k of c.children.keys()) add('channel', k, c.name, edgeId(cellId(c.name), cellId(k)));
    // a selector: its parts into its table of parts, the table into it
    if (selectsSound(result, c.name)) {
      add('part', c.over!, c.name, edgeId(cellId(c.name), cellId(c.over!)));
      for (const k of result.cells.get(c.over!)!.children.keys()) add('part', k, c.over!, edgeId(cellId(c.over!), cellId(k)));
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
