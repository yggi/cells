/** The performers (decision 058): each gate, and the role a role cell gives it (decision 061); a role's entries are gates, one role each. */
import type { CellDecl } from '../ast';
import type { Output, Performer } from '../program';
import type { Cells, Ctx } from './context';

/** What a role cell is, where a sound is wanted (a mix, a card, a gate's play=). */
export const noSound = (name: string) => `&${name} is a role: it names the gates that play it, and is no sound to mix, send or play (name its gates here)`;

export function performersOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, implicit: ReadonlySet<string>): Performer[] {
  const { error } = ctx;
  // (each gate's role, by the role cell that names it first)
  const roleOf = new Map<string, string>();
  for (const d of decls.values()) {
    if (d.map?.kind !== 'role') continue;
    const tokens = d.braid.kind === 'list' ? d.braid.tokens : [];
    if (tokens.length === 0) error(`&${d.name} is a role: name the gates that play it (&${d.name} map=role &player)`, d.span);
    for (const t of tokens) {
      const a = t.atom;
      if (a.kind !== 'ref') {
        error(`a role's entries are the gates that play it, as written (&${d.name} map=role &player &player2)`, t.span);
        continue;
      }
      const g = decls.get(a.name);
      // (a name no line declares: Unknown cell, said where the braid is read)
      if (!g) continue;
      if (!g.gate || a.pick || a.shift || a.transpose !== undefined || a.values || t.repeat !== 1 || t.elongate !== 1 || t.subdivide !== 1) {
        error(`&${a.name}: a role's entries are gates, as written (&player play=&part &voice), and &${a.name} is not one`, t.span);
        continue;
      }
      const was = roleOf.get(a.name);
      if (was === undefined) roleOf.set(a.name, d.name);
      else if (was !== d.name) error(`&${a.name} plays two roles, &${was} and &${d.name}: a gate plays one`, t.span);
    }
  }
  return [...decls.values()].flatMap((d) => {
    if (!d.gate || implicit.has(d.name)) return [];
    const role = roleOf.get(d.name);
    return [{ name: d.name, ...(role !== undefined ? { role } : {}), part: d.gate.notes, ...(d.gate.move ? { move: d.gate.move } : {}), voices: d.gate.receivers }];
  });
}

/** A band's entry (decision 061): a gate, or a role cell standing for its gates. */
export const isPerformer = (decls: ReadonlyMap<string, CellDecl>, name: string) => {
  const d = decls.get(name);
  return !!d && (!!d.gate || d.map?.kind === 'role');
};

/**
 * The bands (decision 061): a table some cell reads (`over=`) whose entries are all performers, gates or role cells, as
 * written; each to its entries, in order. A gate in a band twice (itself and in a role, or in two roles there) is an error.
 */
export function bandsOf(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>): Map<string, readonly string[]> {
  const bands = new Map<string, readonly string[]>();
  const read = new Set([...decls.values()].flatMap((d) => (d.over ? [d.over.name] : [])));
  for (const name of read) {
    const t = decls.get(name);
    if (!t || t.map || t.braid.kind !== 'list' || !t.braid.tokens.length) continue;
    const tokens = t.braid.tokens;
    const plain = (x: (typeof tokens)[number]) =>
      x.atom.kind === 'ref' && !x.atom.pick && !x.atom.shift && x.atom.transpose === undefined && !x.atom.values && x.repeat === 1 && x.subdivide === 1 && x.elongate === 1;
    if (!tokens.every((x) => plain(x) && x.atom.kind === 'ref' && isPerformer(decls, x.atom.name))) continue;
    const entries = tokens.map((x) => (x.atom.kind === 'ref' ? x.atom.name : ''));
    if (t.step) ctx.warn(`&${name} is a band, a table of performers: it needs no step=, the selector reading it steps (their parts keep their time)`, t.step.span);
    // (each gate once: itself, or in one role)
    const seen = new Map<string, string>();
    for (const [i, e] of entries.entries()) {
      const r = decls.get(e)!;
      const gates = r.gate ? [e] : r.braid.kind === 'list' ? r.braid.tokens.flatMap((x) => (x.atom.kind === 'ref' && decls.get(x.atom.name)?.gate ? [x.atom.name] : [])) : [];
      for (const g of new Set(gates)) {
        const was = seen.get(g);
        if (was !== undefined && was !== e) ctx.error(`&${g} is in &${name} twice, as &${was} and as &${e}: a performer is one entry of a band`, tokens[i].span);
        else seen.set(g, e);
      }
    }
    bands.set(name, entries);
  }
  return bands;
}

/**
 * The outputs, each a performer's (a gate's: `through`, or `via` on a card) switched by the selectors reading a band it is in, by its entry
 * there, itself or its role (decision 061). Its part keeps its time: what switching it on does is `restart=`, `free` unless
 * said (realize.ts).
 */
export function banded(outputs: readonly Output[], cells: Cells, bands: ReadonlyMap<string, readonly string[]>): Output[] {
  if (!bands.size) return [...outputs];
  const selectors = (table: string) => [...cells.values()].filter((c) => c.over === table && c.clock).map((c) => c.name);
  return outputs.map((o) => {
    // (the gate it plays through: in a mix, an instrument it goes through; on a card, the entry it is)
    const gate = [...o.through, ...o.via].find((n) => cells.get(n)?.gate);
    if (!gate) return o;
    const select: Output['select'][number][] = [];
    const via: string[] = [];
    for (const [table, entries] of bands) {
      const entry = entries.findIndex((e) => e === gate || (cells.get(e)?.map?.kind === 'role' && cells.get(e)!.units.some((u) => u.atom.kind === 'ref' && u.atom.name === gate)));
      if (entry < 0) continue;
      for (const cell of selectors(table)) select.push({ cell, entry, part: entries[entry], performer: true });
      via.push(...selectors(table), table, entries[entry]);
    }
    return select.length ? { ...o, via: [...new Set([...o.via, ...via])], select: [...o.select, ...select] } : o;
  });
}

/**
 * A performer restarted or resumed by a band's selector starts where the selector's step falls: on whole bars (`step=1m`)
 * its notes keep their places in the bar, and its swing; off them they move in the bar, which warns (decision 061).
 */
export function checkBands(ctx: Ctx, decls: ReadonlyMap<string, CellDecl>, cells: Cells, bands: ReadonlyMap<string, readonly string[]>): void {
  for (const [table, entries] of bands)
    for (const c of cells.values()) {
      if (c.over !== table || !c.clock) continue;
      const policy = (e: string) => cells.get(e)?.params.restart ?? c.params.restart;
      const moved = entries.find((e) => policy(e) === 'restart' || policy(e) === 'resume');
      // (a bar, or a whole number of them: step=1m, 1m/2)
      const bars = c.step?.tap === '1m' && c.step.chain.every((x) => (x.op === '÷' && Number.isInteger(x.n)) || x.n === 1);
      if (moved && !bars)
        ctx.warn(
          `&${c.name} switches &${moved} with restart=${policy(moved)} off the bar: its part starts where the switch falls, not on a bar line, so its notes move in the bar. Switch on whole bars (step=1m), or let it run on (restart=free, a performer's default)`,
          decls.get(c.name)!.span,
        );
    }
}
