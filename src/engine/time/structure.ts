/**
 * A piece's structure in time (#307; docs/ui/time.md): where each cell plays, its splices nested in it. A line's braid
 * splices cells (`&tune &a &b &a`), they splice others, a copy (`base=`) is a cell of its own: each place one is spliced
 * is a node, from when it starts to when it ends, its depth in the tree, the line it plays in. The time view draws a
 * node at the height of its own length on the tower (a phrase of 4 s on the scalogram's 4 s row), as the piano roll
 * draws a note at its pitch: the splice tree, by scale, over the ridges it makes. Pure.
 */
import type { Pick } from '../ast';
import { clocking } from '../clocking';
import { stepsOf, unitsFor } from '../flatten';
import type { CompileResult, Shifts } from '../program';
import type { Plan } from '../realize';

/** A cell where it plays: from `at` to `to` (seconds), how deep in the splice tree (0: the line), in which output. */
export interface StructureNode {
  readonly cell: string;
  readonly at: number;
  readonly to: number;
  readonly depth: number;
  readonly output: string;
  /** The cell it is a copy of (`base=`), if it is one. */
  readonly base?: string;
}

/** Most nodes worked out (a day's piece has more phrases than a picture can show). */
const MOST = 20_000;

/** The cells a line splices, where each plays in its steps: from, length, depth (the line itself at 0). */
function nodesOf(result: CompileResult, shifts: Shifts, root: string, pick: Pick | null, shift: number): { cell: string; from: number; len: number; depth: number }[] {
  const out: { cell: string; from: number; len: number; depth: number }[] = [];
  const walk = (name: string, p: Pick | null, extra: number, ctx: string, at: number, k: number, depth: number, seen: readonly string[]) => {
    const cell = result.cells.get(name);
    if (!cell || out.length > MOST || seen.includes(name)) return;
    const table = cell.root ? name : (cell.over ?? ctx);
    let base = 0;
    for (const u of unitsFor(result, name, shifts, p, table, extra)) {
      const a = u.atom;
      const unit = a.kind === 'ref' ? stepsOf(result, a.name, a.pick) || 1 : 1;
      const foot = unit * u.elongate;
      const dur = foot / u.subdivide;
      for (let r = 0; r < u.repeat; r++) {
        for (let s = 0; s < u.subdivide; s++) {
          if (a.kind !== 'ref') continue;
          const child = result.cells.get(a.name);
          // (a voice or a kit named in a braid is a sound, not a phrase)
          if (!child || child.voice || child.kit || child.mix) continue;
          const from = at + (base + s * dur) * k;
          out.push({ cell: a.name, from, len: dur * k, depth: depth + 1 });
          walk(a.name, a.pick, a.shift, table, from, (dur * k) / (stepsOf(result, a.name, a.pick) || 1), depth + 1, [...seen, name]);
        }
        base += foot;
      }
    }
  };
  out.push({ cell: root, from: 0, len: Math.max(1, stepsOf(result, root, pick)), depth: 0 });
  walk(root, pick, shift, root, 0, 1, 0, []);
  return out;
}

/** Every node from 0 to `until` seconds: each line's splice tree, lap after lap, through its clock (a line that splices
 * nothing: none). */
export function structure(p: Plan, until: number): StructureNode[] {
  const clk = clocking(p.result, p.statics);
  const out: StructureNode[] = [];
  const seen = new Set<string>();
  for (const t of p.tracks) {
    const o = t.output;
    if (seen.has(o.cell)) continue;
    seen.add(o.cell);
    const tree = nodesOf(p.result, p.statics, o.cell, o.pick, o.shift);
    // (a line that splices nothing has no structure to show: its laps are its loop, the meter's to say)
    if (tree.length < 2) continue;
    const tm = clk.map(t.clock);
    const last = Math.min(until, t.end);
    const steps = tm.stepAt(Math.max(0, last)) * t.rate;
    if (!Number.isFinite(steps)) continue;
    for (let lap = 0; lap * t.period < steps && out.length < MOST; lap++)
      for (const n of tree) {
        const s = lap * t.period + n.from;
        const at = tm.q(s / t.rate);
        if (!Number.isFinite(at) || at >= last) continue;
        const to = Math.min(last, tm.q((s + n.len) / t.rate));
        const base = p.result.cells.get(n.cell)?.base?.name;
        out.push({ cell: n.cell, at, to, depth: n.depth, output: o.id, ...(base ? { base } : {}) });
      }
  }
  return out;
}
