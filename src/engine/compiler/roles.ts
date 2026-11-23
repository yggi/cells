/** Phase 8: attributes where they do nothing — each acts on some roles only (attributes.ts): warnings. */
import type { Span } from '../ast';
import { ATTRIBUTES, rolesText, VOICE_PARAMS, type Role } from '../attributes';
import type { ShowPlugin } from '../plugins';
import { isMidiCard, type Clock, type ResolvedCell } from '../program';
import { kindsOf, type Kind } from '../kinds';
import { streamClockOf } from '../fills';
import type { Cells, Ctx } from './context';
import type { Declared } from './declare';

/** What switching a part on does to its time (decision 032): from its top, where it stopped, or running on. */
const RESTARTS: readonly string[] = ['restart', 'resume', 'free'];

/** What `rolesOf` reads of a piece: its cells, its clocks, its sections (each to its table) and its bands (each with its entries). */
export interface RolePiece {
  readonly cells: ReadonlyMap<string, ResolvedCell>;
  readonly clocks: ReadonlyMap<string, Clock>;
  readonly sections: ReadonlyMap<string, string>;
  readonly bands?: ReadonlyMap<string, readonly string[]>;
}

/**
 * The roles that are kinds (`kinds.ts`, #782): what a cell is, read from the one table. The rest of a cell's roles are
 * not what it is: how it is moved (`clock`, `driven`, `motor`), whether it sounds as a voice (`voice`: a module mix with
 * sound parameters does, a wave that only bends another doesn't), and what stands in a relation to another cell
 * (`carrier`, `modulator`, `section`, `selector`, `performer`, and `law`: a fill's cell or the mix that reads one, on
 * its stream's clock).
 */
const KIND_ROLE: Partial<Record<Kind, Role>> = {
  tape: 'tape',
  head: 'head',
  resonator: 'resonator',
  scope: 'scope',
  gate: 'gate',
  card: 'card',
  note: 'note',
};

/** roles(cell): what the cell is, as far as an attribute cares (`Role`, attributes.ts). A cell can be several. */
export function rolesOf({ cells, clocks, sections, bands = new Map() }: RolePiece): (c: ResolvedCell) => Set<Role> {
  const modulators = new Set([...cells.values()].flatMap((c) => (typeof c.params.fm === 'string' ? [c.params.fm] : [])));
  const kind = kindsOf({ cells, clocks, sections });
  return (c) => {
    const r = new Set<Role>();
    // what it is: its kind
    const is = KIND_ROLE[kind(c.name) ?? 'steps'];
    if (is) r.add(is);
    // whether it sounds as a voice, and how it is moved
    if (c.voice) r.add('voice');
    if (clocks.get(c.name) && !clocks.get(c.name)!.belt) r.add('clock');
    if (c.step) r.add('driven');
    if (typeof c.params.motor === 'number') r.add('motor');
    // what it is to another cell
    if (typeof c.params.law === 'string' || streamClockOf(cells, c) !== undefined) r.add('law');
    if (typeof c.params.fm === 'string') r.add('carrier');
    if (modulators.has(c.name)) r.add('modulator');
    if (sections.has(c.name)) r.add('section');
    if (c.over && ([...sections.values()].includes(c.over) || bands.has(c.over))) r.add('selector');
    if ([...bands.values()].some((es) => es.includes(c.name))) r.add('performer');
    return r;
  };
}

export function checkRoles(
  ctx: Ctx,
  { decls, implicit, sections }: Declared,
  cells: Cells,
  clocks: ReadonlyMap<string, Clock>,
  plugins: ReadonlyMap<string, ShowPlugin>,
  bands: ReadonlyMap<string, readonly string[]> = new Map(),
  instruments: ReadonlySet<string> = new Set(),
): void {
  const { warn } = ctx;
  // ---- attributes where they do nothing: each acts on some roles only (attributes.ts)
  const roles = rolesOf({ cells, clocks, sections, bands });
  // (a cell a meter reads its swing from, swing=&swing: its swing= is the meter's, #308)
  const swingHolders = new Set([...decls.values()].flatMap((d) => (d.swingFrom ? [d.swingFrom.name] : [])));
  for (const d of decls.values()) {
    const c = cells.get(d.name);
    if (!c || implicit.has(d.name)) continue;
    const has = roles(c);
    const written: [string, Span][] = [
      ...Object.keys(d.params).map((k): [string, Span] => [k, d.paramSpans[k] ?? d.span]),
      ...Object.entries(d.paramCells ?? {}).map(([k, pc]): [string, Span] => [k, pc.span]),
      ...Object.entries(d.paramClocks ?? {}).map(([k, st]): [string, Span] => [k, st.span]),
      ...(['env', 'pitch'] as const).filter((k) => d[k]).map((k): [string, Span] => [k, d[k]!.span]),
    ];
    for (const [k, span] of written) {
      const a = ATTRIBUTES[k];
      // (an instrument's sound parameters are its voices': said where they are passed on, instruments.ts)
      if (instruments.has(d.name) && VOICE_PARAMS.has(k)) continue;
      // anchor= on a law: it belongs on the clock the law reads its day through (over=&day)
      if (k === 'anchor' && has.has('law'))
        warn(
          `anchor= sets the clock a law reads, not the law: write it on ${c.over ? `&${c.over}` : streamClockOf(cells, c) ? `&${streamClockOf(cells, c)}` : 'its day (over=&day, a clock loop=1d)'} — the law on &${d.name} doesn't read it`,
          span,
        );
      else if (k === 'pan' && (c.mix || c.sink || isMidiCard(c)))
        warn(
          `pan= places a voice: on ${c.sink ? 'the sound card' : isMidiCard(c) ? 'a MIDI card' : `the mix &${d.name}`} it does nothing — put it on the voice (&voice pan=${d.params.pan})`,
          span,
        );
      else if (k === 'pan' && typeof d.params.pan === 'number' && (d.params.pan < 0 || d.params.pan > 1))
        warn(`pan=${d.params.pan}: pan runs from 0 (left) to 1 (right); ${d.params.pan < 0 ? 'this plays hard left' : 'this plays hard right'}`, span);
      else if (a?.on && !a.on.some((r) => has.has(r)) && !(k === 'swing' && swingHolders.has(d.name)))
        warn(`${k}= acts on ${rolesText(a.on)}: on &${d.name} it does nothing`, span);
      // restart= (decision 032): restart, resume or free
      else if (k === 'restart' && !RESTARTS.includes(d.params.restart as string))
        warn(`restart=${d.params.restart}: what switching a part on does to its time is restart, resume or free — this plays as restart`, span);
      else if (a?.value === 'number' && !c.voice && typeof d.params[k] === 'string') warn(`${k}= takes a number: '${d.params[k]}' does nothing`, span);
    }
    // a gate is its notes (play=), its level and what it plays: its timing and tables are its notes', so these are ignored
    if (d.gate) {
      const timing = d.step ? (d.step.whole ? 'loop' : 'step') : null;
      for (const [k, span] of [
        ['over', d.over?.span],
        [timing, d.step?.span],
        ['shift', d.shift !== null ? d.paramSpans.shift : undefined],
        ['stride', d.stride !== null ? d.paramSpans.stride : undefined],
        ['map', d.map?.span],
        ['cycle', d.cycle !== null ? d.span : undefined],
      ] as const)
        if (k && span)
          warn(`${k}= on a gate does nothing: a gate plays with each note of play=&${d.gate.notes}, so it times and reads nothing itself — put it on &${d.gate.notes}`, span);
      if (d.gate.gain < 0)
        warn(
          `${d.gate.port === 'trigger' ? 'gain' : 'level'}=${d.gate.gain}: a level is 0 or more, and a negative one doesn't play softer — write ${-d.gate.gain}`,
          d.paramSpans[d.gate.port === 'trigger' ? 'gain' : 'level'] ?? d.span,
        );
    }
  }
  // a plugin the piece carries that no cell shows
  const shown = new Set([...decls.values()].flatMap((d) => (d.show ? [d.show.split(':')[0]] : [])));
  for (const p of plugins.values())
    if (!shown.has(p.name)) warn(`the piece carries the plugin "${p.name}", but no cell says show=${p.name}`, { line: p.line, col: 1, len: `=== plugin ${p.name} ===`.length });
}
