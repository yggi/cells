/**
 * Notes (decision 075, #560 rung 1): a kit's member named as a General MIDI drum that writes no `note=`, written with the
 * note its name gave: `&bd s=sine` → `&bd note=36 s=sine`, in its line. Its name gives none since then, so the member
 * would take the next free note; read the old way (`CompileOptions.old`), the name gives it, so the two play alike, and
 * the rewrite is checked so. A member another fragment gives (`&bd from gm_kit`) writes its own: `gm_kit` writes each.
 */
import { setAttr } from '../edit';
import { gmDrumNote } from '../midi';
import { parse } from '../parser';
import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';

/** The piece's own kit members named as General MIDI drums with no note=, each with the note its name gave, in the order the kits name them. */
function unwritten(source: string, result: CompileResult): [string, number][] {
  const own = new Map(parse(source, { old: true }).cells.map((d) => [d.name, d]));
  const out = new Map<string, number>();
  for (const c of result.cells.values()) {
    if (!c.kit) continue;
    for (const u of c.units) {
      if (u.atom.kind !== 'ref' || out.has(u.atom.name)) continue;
      const d = own.get(u.atom.name);
      const gm = gmDrumNote(u.atom.name);
      if (d && gm !== null && d.drumNote === undefined && result.cells.get(u.atom.name)?.voice) out.set(u.atom.name, gm);
    }
  }
  return [...out];
}

/** The rewrite of every such member: each its note=, written. */
export function notes(source: string, result: CompileResult): Rewrite<'notes'>[] {
  const members = unwritten(source, result);
  if (!members.length) return [];
  const written = members.map(([name, note]) => `&${name} note=${note}`).join(', ');
  return [
    {
      id: `notes:${members.map(([n]) => n).join(',')}`,
      tool: 'migrate',
      rule: 'notes',
      title: `A drum's note is its note=, not its name: ${written} (decision 075)`,
      before: members.map(([name]) => `&${name}`).join(', '),
      after: written,
      apply: (src) => members.reduce((text, [name, note]) => setAttr(text, name, 'note', String(note)), src),
    },
  ];
}
