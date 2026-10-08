/** Phase 3: who plays what — kits, the sound card's channels, mixes expanded (instruments, selectors, sends), voices marked. */
import type { Binding, CellDecl, Span } from '../ast';
import { DOUGH_SOURCES } from '../dough-params';
import { ATTRIBUTES, VOICE_PARAMS } from '../attributes';
import { canonicalTag, TUTORIAL } from '../tags';
import type { ResolvedCell } from '../program';
import type { Cells, Ctx } from './context';
import type { Typed } from './sorts';

/** Marks kits and voices on a copy of the cells it is given; returns it with the sound card's bindings. */
export function bindVoices(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, given: Cells, typed: Typed) {
  const { error, warn, unknownCell } = ctx;
  const cells = new Map(given);
  // ---- voices: the signal of every binding (the factor that is a sound: algebra.ts), and cells with sound parameters.
  // A cell made only of &refs to voices is a kit: numbers pick a voice.
  const hasParams = (n: string) => Object.keys(decls.get(n)?.params ?? {}).length > 0;
  const isKit = (c: ResolvedCell) => c.units.length > 0 && c.units.every((u) => u.atom.kind === 'ref' && hasParams(u.atom.name));
  for (const c of [...cells.values()]) if (!c.voice && !c.root && isKit(c)) cells.set(c.name, { ...c, kit: true });
  // ---- the sound card: cells with map=sample; their entries are channels (mix cells)
  const sinks = [...cells.values()].filter((c) => c.sink);
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (c && !c.mix && c.units.some((u) => u.atom.kind === 'mix'))
      error(c.sink ? `A sound card's channels are all mixes: [left …] [right …], or &left &right` : `A mix is one chord of sounds: &${name} [&a * &v, &b * &w]`, d.span);
  }
  /** A selector: a cell reading a table whose entries are mixes (parts): its numbers pick which play. */
  const partsOf = (c: ResolvedCell | undefined): string[] | null => {
    const t = c?.over ? cells.get(c.over) : undefined;
    if (!t || !t.units.length) return null;
    const names = t.units.map((u) => (u.atom.kind === 'ref' ? u.atom.name : null));
    return names.every((n) => n !== null && cells.get(n)?.mix && !cells.get(n)?.sink) ? (names as string[]) : null;
  };
  type Sel = { cell: string; entry: number; part: string };
  type Gathered = {
    select: Sel[];
    b: Binding;
    span: Span;
    gains: [number, number];
    via: Set<string>;
    parts: { mix: string; sink: string; gains: [number, number] }[];
    through: Set<string>;
    /** Played, but not heard: a mix that only excites a resonator or feeds a tape (a send). */
    silent?: boolean;
  };
  /**
   * A mix used like a voice (an instrument: `[&(map=adsr …) * &saw]`) distributes:
   * the pitches, volumes and gain acting on it act on each of its voices.
   */
  const expand = (b: Binding, through: readonly string[] = [], select: readonly Sel[] = []): { b: Binding; through: readonly string[]; select: readonly Sel[] }[] => {
    const v = cells.get(b.voice.name);
    // a selector: each of its parts, as if in the mix — sounding when picked
    const parts = partsOf(v);
    if (v && parts) {
      if (select.some((x) => x.cell === v.name) || select.length > 8) {
        error(`&${v.name} selects itself`, v.span);
        return [];
      }
      return parts.flatMap((part, entry) =>
        cells
          .get(part)!
          .mix!.flatMap((inner) =>
            expand({ voice: inner.voice, pitches: [...b.pitches, ...inner.pitches], offset: b.offset + inner.offset, gain: b.gain * inner.gain }, through, [
              ...select,
              { cell: v.name, entry, part },
            ]),
          ),
      );
    }
    if (!v?.mix || v.sink) return [{ b, through, select }];
    if (through.includes(v.name) || through.length > 16) {
      error(`&${v.name} plays itself through its mixes`, v.span);
      return [];
    }
    return v.mix.flatMap((inner) =>
      expand({ voice: inner.voice, pitches: [...b.pitches, ...inner.pitches], offset: b.offset + inner.offset, gain: b.gain * inner.gain }, [...through, v.name], select),
    );
  };
  const gathered = new Map<string, Gathered>();
  const termKey = (b: Binding, select: readonly Sel[] = []) =>
    [b.voice.name, b.offset, ...b.pitches.map((t) => `${t.sign}${t.ref.name}${JSON.stringify(t.ref.pick)}${t.ref.shift}`), ...select.map((x) => `@${x.cell}:${x.entry}`)].join('|');
  for (const sink of sinks) {
    const d = decls.get(sink.name)!;
    const channels = sink.units;
    if (channels.length === 0 || channels.length > 2) {
      error(`The sound card takes one channel (mono) or two (left, right): &${sink.name} map=sample &left &right`, d.span);
      continue;
    }
    channels.forEach((u, ch) => {
      // a channel is a mix cell (&left), or a mix written in place on the sound card itself
      const inPlace = u.atom.kind === 'mix' ? typed(u.atom) : null;
      const mix = u.atom.kind === 'ref' ? cells.get(u.atom.name) : inPlace ? sink : undefined;
      // (a selector as a channel: its parts, as they're picked)
      const bindings =
        inPlace ??
        (u.atom.kind === 'ref' && mix?.mix && !mix.sink
          ? mix.mix
          : u.atom.kind === 'ref' && partsOf(mix)
            ? [{ voice: { name: u.atom.name, pick: null, shift: 0, span: mix!.span }, pitches: [], offset: 0, gain: 1 }]
            : null);
      if (!mix || !bindings) {
        error(`A channel of the sound card is a mix: &mix, or [&theme * &lead] written in place`, d.span);
        return;
      }
      for (const { b, through, select } of bindings.flatMap((x) => expand(x))) {
        const key = termKey(b, select);
        let g = gathered.get(key);
        if (!g) gathered.set(key, (g = { b, span: mix.span, gains: [0, 0], via: new Set(), parts: [], through: new Set(), select: [...select] }));
        for (const t of through) g.through.add(t);
        // mono: one channel feeds both sides
        const part: [number, number] = channels.length === 1 ? [b.gain, b.gain] : ch === 0 ? [b.gain, 0] : [0, b.gain];
        g.gains[0] += part[0];
        g.gains[1] += part[1];
        g.parts.push({ mix: mix.name, sink: sink.name, gains: part });
        g.via.add(mix.name).add(sink.name);
        // (picked by a selector: the selector, its table of parts and the part are on its way too)
        for (const x of select) g.via.add(x.cell).add(cells.get(x.cell)!.over!).add(x.part);
      }
    });
  }
  // a stream read through a kit (&drums over=&kit) is a signal: the kit is its voice,
  // the stream the term that starts notes (its numbers pick the drum)
  const throughKit = (name: string) => {
    const t = decls.get(name)?.over?.name;
    return t && cells.get(t)?.kit ? t : null;
  };
  // sends: a mix a resonator is excited by (excite=), or a sound tape records (write=), that no sound
  // card plays — its notes still play (into what it feeds), but it isn't heard itself
  {
    const heard = new Set([...gathered.values()].flatMap((g) => g.parts.map((p) => p.mix)));
    const sends = new Set<string>();
    for (const d of decls.values())
      for (const k of ['excite', 'write'] as const) {
        const m = d.params[k];
        if (typeof m === 'string' && cells.get(m)?.mix && !heard.has(m)) sends.add(m);
      }
    for (const name of sends) {
      const mix = cells.get(name)!;
      for (const { b, through, select } of mix.mix!.flatMap((x) => expand(x))) {
        // (a tape head in it drives what it feeds directly — it isn't a note to play)
        if (typeof cells.get(b.voice.name)?.params.play === 'string') continue;
        const key = 'send:' + termKey(b, select);
        if (gathered.has(key) || [...gathered.values()].some((g) => termKey(g.b, g.select) === termKey(b, select))) continue;
        gathered.set(key, { b, span: mix.span, gains: [b.gain, b.gain], via: new Set([name]), parts: [], through: new Set(through), select: [...select], silent: true });
      }
    }
  }
  const bindings = [...gathered.values()].map((g) => {
    const kit = throughKit(g.b.voice.name);
    return kit ? { ...g, b: { ...g.b, voice: { name: kit, pick: null, shift: 0, span: g.b.voice.span }, pitches: [{ ref: g.b.voice, sign: 1 as const }, ...g.b.pitches] } } : g;
  });
  // a read head of a sound tape (write= a mix) is sound already: in a mix it's a return, not a voice
  const soundHead = (name: string) => {
    const h = cells.get(name);
    const t = h && typeof h.params.play === 'string' ? cells.get(h.params.play) : undefined;
    const src = t && typeof t.params.write === 'string' ? cells.get(t.params.write) : undefined;
    return !!src?.mix && !src.sink;
  };
  for (const { b } of bindings) {
    const v = cells.get(b.voice.name);
    if (v && !v.root && !v.kit && !soundHead(v.name) && !b.pitches.some((t) => t.ref.name === v.name)) cells.set(v.name, { ...v, voice: true });
  }
  for (const [name, d] of decls) {
    const c = cells.get(name);
    if (!c) continue;
    if (c.map?.kind === 'table' && !decls.has(c.map.table)) unknownCell(c.map.table, d.map!.span);
    if (d.about) {
      if (!c.note) error('about= belongs on a note: a cell with a label= (or title=) and nothing else', d.about[0].span);
      for (const r of d.about) if (!decls.has(r.name)) unknownCell(r.name, r.span);
    }
    if (d.rung != null && d.title && !(d.tags ?? '').split(',').some((t) => canonicalTag(t.trim()) === TUTORIAL))
      warn('rung= places a piece in the tutorial; without tags="tutorial" it is ignored', d.paramSpans.rung ?? d.span);
    if (d.rung != null && !d.title) error('rung= belongs on a piece’s card: the note with its title=', d.paramSpans.rung ?? d.span);
    if (!c.voice) continue;
    const src = d.params.s;
    if (src !== undefined && !(String(src) in DOUGH_SOURCES)) error(`Unknown sound '${src}' (${Object.keys(DOUGH_SOURCES).join(', ')})`, d.paramSpans.s ?? d.span);
    if (src !== undefined && d.braid.kind !== 'blank') warn(`s=${src} plays a built-in waveform; the braid is ignored`, d.paramSpans.s);
    for (const [k, v] of Object.entries(d.params)) if (ATTRIBUTES[k]?.value === 'number' && typeof v !== 'number') error(`${k}= takes a number`, d.paramSpans[k]);
    // a voice by its sound parameters, written as a clock: say which parameter made it one
    const made = Object.keys(d.params).find((k) => VOICE_PARAMS.has(k));
    const why = made ? ` (${made}= makes &${name} a voice; a meter takes none)` : '';
    if (d.step?.kind === 'driven') error(`A voice moves at a rate — its pitch, like loop=C4${why}`, d.step.span);
    else if (d.step && !d.step.whole) error(`A voice's pitch is loop= (one turn of its braid per cycle): loop=C4${why}`, d.step.span);
  }
  return { cells: cells as Cells, sinks, bindings, soundHead };
}
export type Bound = ReturnType<typeof bindVoices>;
