/**
 * Seeds (decision 098, #779): a chancy cell written with the seed its draws are thrown from, `seed=n`, so no edit to what it
 * carries throws the dice again. A cell's draws are keyed on what it plays (decision 031, #481): its flattened steps and its
 * parameters, a `role=` or a `part=` among them, so an attribute no listener hears re-rolled them (the Electro swing example,
 * 768 notes, 763 after a role, #773). Normalise writes the number its content key is (`keyAsSeed`), which throws the dice it
 * threw: the rewrite plays the same by construction, S1 shows it. A cell that draws is one with a chance, a choice or a pick
 * among its steps (`x?`, `[a|b]`, `chance=`); one that already writes a `seed=` is left as written.
 */
import { setAttr } from '../edit';
import { drawKeyOf, keyAsSeed } from '../drawkey';
import { flatten } from '../flatten';
import { codeShifts, type CompileResult } from '../program';
import type { Rewrite } from '../rewrite';

/** Whether a cell's steps throw a die: a step with a chance, options to pick among, or a choice. */
function draws(result: CompileResult, name: string): boolean {
  try {
    return flatten(result, name, codeShifts(result)).some((e) => e.chance !== undefined || !!e.options || !!e.chosen);
  } catch {
    return false;
  }
}

/** Each chancy cell the text declares that writes no seed, written with its content key as its seed. */
export function seeds(source: string, result: CompileResult): Rewrite<'seed'>[] {
  const key = drawKeyOf(result);
  const out: Rewrite<'seed'>[] = [];
  for (const c of result.cells.values()) {
    if (c.implicit || c.lambda || c.seeded || !draws(result, c.name)) continue;
    const n = keyAsSeed(key(c.name));
    out.push({
      id: `seed:${c.name}`,
      tool: 'normalise',
      rule: 'seed',
      title: `&${c.name}: its chance is thrown from what it carries — write the seed it is thrown from, seed=${n}`,
      before: '',
      after: `seed=${n}`,
      apply: (src) => setAttr(src, c.name, 'seed', String(n)),
    });
  }
  return out;
}
