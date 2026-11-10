/**
 * Parts (decision 075, #560 rung 2; the feel's version 3, yggi/music-commons#60): what a name gave the default performer,
 * written as the value the feel reads now. A role cell named as a part (`&bass map=role &bassOut`) gets `part=bass`, a
 * line named as one that no performer plays gets its `part=`, and a drum line a kit plays, named as a drum role
 * (`&kick step=16n &bd!4`), gets `role=kick`. Only the piece's own lines: a fragment's write their own. Each is read so by
 * version 3 as it was by version 2 (`readerByName`); what it plays doesn't move, and the rewrite is checked so.
 */
import { setAttr } from '../edit';
import { parse } from '../parser';
import { readerByName, readerOf } from '../perform/feel';
import type { CompileResult } from '../program';
import type { Rewrite } from '../rewrite';

/** The attributes a name gave, by the piece's own line: `[line, key, value]`, each once, in the order the outputs name them. */
function given(source: string, result: CompileResult): [string, 'part' | 'role', string][] {
  const own = new Set(parse(source, { old: true }).cells.map((d) => d.name));
  const was = readerByName(result);
  const now = readerOf(result);
  const roleCells = new Map(result.performers.map((p) => [p.name, p.role] as const));
  const out = new Map<string, [string, 'part' | 'role', string]>();
  const add = (line: string | undefined, key: 'part' | 'role', value: string) => {
    if (line !== undefined && own.has(line) && result.cells.get(line)?.params[key] === undefined && !out.has(`${line} ${key}`)) out.set(`${line} ${key}`, [line, key, value]);
  };
  for (const o of result.outputs) {
    const r = was(o.id);
    if (!r || JSON.stringify(now(o.id)) === JSON.stringify(r)) continue;
    const [, second, third] = o.id.split(':');
    if (r.role !== undefined) {
      add(third, 'role', r.role);
      continue;
    }
    // (a performer's: its role cell's name gave the part; else the line's own name)
    const gate = [...o.via, ...o.through].find((name) => roleCells.get(name) === r.part);
    if (gate !== undefined) add(roleCells.get(gate), 'part', r.part);
    else add(/^[A-Za-z_][A-Za-z0-9_]*/.exec(second ?? '')?.[0], 'part', r.part);
  }
  return [...out.values()];
}

/** The rewrite of every such line: each its part= or role=, written. */
export function parts(source: string, result: CompileResult): Rewrite<'parts'>[] {
  const lines = given(source, result);
  if (!lines.length) return [];
  const written = lines.map(([line, key, value]) => `&${line} ${key}=${value}`).join(', ');
  return [
    {
      id: `parts:${lines.map(([l, k]) => `${l}.${k}`).join(',')}`,
      tool: 'migrate',
      rule: 'parts',
      title: `The default performer reads a part and a drum role as values, not names: ${written} (decision 075)`,
      before: lines.map(([line]) => `&${line}`).join(', '),
      after: written,
      apply: (src) => lines.reduce((text, [line, key, value]) => setAttr(text, line, key, value), src),
    },
  ];
}
