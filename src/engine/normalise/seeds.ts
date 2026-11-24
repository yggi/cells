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
import { noisePlaces } from '../noise';
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

/**
 * Each noise voice the text declares that writes no seed, written with its place among the noise voices as its seed (#932): the
 * grains it was thrown from, so no sample moves, and no edit to the text then moves them. A voice whose place another voice
 * already writes as its seed (a voice added above one that wrote its own) takes the next number no voice uses, so no two noise
 * voices throw alike.
 */
function noiseSeeds(result: CompileResult): Rewrite<'seed'>[] {
  const places = noisePlaces(result);
  const written = new Set([...places.keys()].flatMap((n) => (result.cells.get(n)?.seeded ? [result.cells.get(n)!.seed] : [])));
  const out: Rewrite<'seed'>[] = [];
  for (const [name, place] of places) {
    const c = result.cells.get(name);
    if (!c || c.implicit || c.lambda || c.seeded) continue;
    let n = Number(place.slice('noise#'.length));
    if (written.has(n)) for (n = places.size; written.has(n); n++);
    written.add(n);
    out.push({
      id: `seed:${name}`,
      tool: 'normalise',
      rule: 'seed',
      title: `&${name}: its noise starts where its place among the noise voices says — write the seed it is thrown from, seed=${n}`,
      before: '',
      after: `seed=${n}`,
      apply: (src) => setAttr(src, name, 'seed', String(n)),
    });
  }
  return out;
}

/** Each chancy cell the text declares that writes no seed, written with its content key as its seed, and each noise voice. */
export function seeds(source: string, result: CompileResult): Rewrite<'seed'>[] {
  const key = drawKeyOf(result);
  const out: Rewrite<'seed'>[] = [...noiseSeeds(result)];
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
