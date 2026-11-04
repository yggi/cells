/**
 * Migrate (decision 040, #75): a grid's size written as cycle=, the old way, as its map's first argument, where it says
 * what it is: `&edo19 cycle=19 map=edo` → `&edo19 map=edo(19)`, `&fifths cycle=7 map=ed(3/2)` → `&fifths map=ed(7, 3/2)`.
 * The two read as one grid (`gridSteps`), so the respelling plays the same by construction; checked anyway.
 */
import { attrsOf, declLine, setAttr } from '../edit';
import type { CompileOptions, CompileResult as Result } from '../program';
import type { Rewrite } from '../rewrite';

/** Each grid whose size is written as cycle=: its map with the size in it. */
export function grids(source: string, result: Result, _options: CompileOptions = {}): Rewrite<'grid'>[] {
  const out: Rewrite<'grid'>[] = [];
  for (const c of result.cells.values()) {
    if (!c.root || c.map?.kind !== 'edo') continue;
    const a = attrsOf(source, c.name);
    const cycle = a.get('cycle');
    const map = a.get('map');
    if (!cycle || !/^[1-9][0-9]*$/.test(cycle) || !map || declLine(source, c.name) < 0) continue;
    const sized = map === 'edo' ? `edo(${cycle})` : /^ed\(([^,)]+)\)$/.test(map) ? `ed(${cycle}, ${map.slice(3, -1)})` : null;
    if (!sized) continue;
    const apply = (s: string) => setAttr(setAttr(s, c.name, 'map', sized), c.name, 'cycle', null);
    const at = declLine(source, c.name);
    out.push({
      id: `grid:${c.name}`,
      tool: 'migrate',
      rule: 'grid',
      title: `&${c.name}'s size is its map's: map=${sized} for cycle=${cycle} map=${map} (decision 040)`,
      before: source.split('\n')[at]!.trim(),
      after: apply(source).split('\n')[at]!.trim(),
      apply,
    });
  }
  return out;
}
