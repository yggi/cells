/** The performers (decision 058): each gate, and the role a role cell gives it (decision 061); a role's entries are gates, one role each. */
import type { CellDecl } from '../ast';
import type { Performer } from '../program';
import type { Ctx } from './context';

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
