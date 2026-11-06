/**
 * What a draw is keyed on (decision 031, amended by #481): what its cell plays, not its name or its spelling. Chance
 * (`x?`, `[a|b]`, `[a b|c]`, `chance=`) is thrown per seed, cell, lap and step, and a noise starts each note at a grain
 * thrown the same way; keyed on a name, a text renamed drew differently (E2 wider than S1, decision 070), and keyed on its
 * text, a cell respelled would (Shorten's runs, a phrase made a cell). A cell's key is its flattened steps (where each
 * plays, how long, its value, its chance, its options, its laps and choices), its seed and chance, and its sound's
 * parameters, a cell one names read as that cell's key in turn, hashed: so a text renamed or respelled draws as it did,
 * and two cells that play alike draw alike. Pure.
 */
import type { CompileResult } from './program';
import { codeShifts } from './program';
import { flatten } from './flatten';
import { CELL_PARAMS } from './attributes';

/** A number for a text, the same for the same text: cyrb53 written in base 36 (a key, not a chance). */
function hashOf(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0) * 2 ** 21 + (h1 >>> 11)).toString(36);
}

/** A number as the key reads it: to 9 digits, so a sum in another order keys alike. */
const nine = (x: number) => +x.toPrecision(9);

const keyed = new WeakMap<CompileResult, (cell: string) => string>();

/** What a program's cells draw on, by name (see the module's comment); a name the program doesn't hold is its own key. */
export function drawKeyOf(result: CompileResult): (cell: string) => string {
  const known = keyed.get(result);
  if (known) return known;
  const shifts = codeShifts(result);
  const memo = new Map<string, string>();
  const keyOf = (name: string, seen: ReadonlySet<string>): string => {
    const k = memo.get(name);
    if (k !== undefined) return k;
    const c = result.cells.get(name);
    if (!c) return name;
    if (seen.has(name)) return '↺';
    const inner = new Set([...seen, name]);
    let steps: unknown[] = [];
    try {
      steps = flatten(result, name, shifts).map((e) => [
        nine(e.step),
        nine(e.duration),
        nine(e.value + e.alter + (e.transpose ?? 0)),
        e.chance ?? null,
        e.options?.map((o) => o.value + o.alter) ?? null,
        e.laps ? [e.laps.of, e.laps.is] : null,
        e.chosen?.map((x) => [nine(x.at), x.of, x.is, x.lap]) ?? null,
      ]);
    } catch {
      // (a cell that doesn't flatten, past the limit: keyed on the rest)
    }
    const params = Object.entries(c.params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([p, v]) => [p, typeof v === 'string' && CELL_PARAMS.has(p) ? keyOf(v, inner) : v]);
    // (its chance= is in its steps, each step's as thrown: a bare x? reads it, x?.3 says its own)
    const key = hashOf(JSON.stringify([c.seed, c.steps, steps, params.filter(([p]) => p !== 'chance'), c.env ? keyOf(c.env, inner) : null]));
    if (!seen.size) memo.set(name, key);
    return key;
  };
  const of = (cell: string) => keyOf(cell, new Set());
  keyed.set(result, of);
  return of;
}
