/**
 * A template's sets of arguments, each a fragment of its own (#387, B1): a point of its association may carry them
 * (`args: { mode: aeolian }`), and the repository holds the template so taken, `diatonic(mode=aeolian)`, its text the
 * template with them bound. The seed's (`seed.ts`) and a learned layer's filed fragments (`fragments.ts`, `learned.ts`) alike.
 */
import { signatureOf } from '../engine/use';
import type { Fragment, WeightedPoint } from './fragments';

/** How a `from` line takes a template with these arguments, and the id a query answers with: `diatonic(mode=aeolian)`. */
export const takenAs = (id: string, args: Readonly<Record<string, string>>): string =>
  `${id}(${Object.entries(args)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')})`;

/**
 * A template with value arguments bound (#387): each argument's default line gone, its parameter out of the signature, its
 * value written where the parameter was read. `diatonic` with `mode=aeolian` is `&key from &tonic` and
 * `&key scale(aeolian, &tonic)`, the text the old `aeolian` was, so it plays (and hashes) as that did. A parameter
 * `base=` reads keeps its line, its value its braid, since `base=` takes a cell (`meter` with `grouping=meter("7/8")`:
 * `&grouping meter("7/8")`, #507).
 */
export function boundText(text: string, args: Readonly<Record<string, string>>): string {
  const signature = signatureOf(text);
  if (!signature) throw new Error(`boundText: a template's arguments, but the text has no signature`);
  const bound = Object.keys(args).map((k) => `&${k}`);
  for (const p of bound) if (!signature.optional.includes(p)) throw new Error(`boundText: ${p} is none of the signature's optional parameters (${signature.optional.join(', ')})`);
  const optional = signature.optional.filter((p) => !bound.includes(p));
  const head = `${signature.names.join(', ')} from ${optional.length ? `(${optional.join(', ')}) ` : ''}${signature.main ?? ''}`.trimEnd();
  const keptByBase = new Set(bound.filter((p) => new RegExp(`base=${p}(?![A-Za-z0-9_])`).test(text)));
  let wrote = false;
  return text
    .split('\n')
    .flatMap((line) => {
      if (/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(line) && !wrote && signatureOf(line)) {
        wrote = true;
        return [head];
      }
      // (a parameter base= reads stays a cell, its value its braid: `&grouping meter("7/8")`, #507; any other is written where it's read)
      const kept = bound.find((p) => new RegExp(`^\\s*${p}(?![A-Za-z0-9_])`).test(line));
      if (kept) return keptByBase.has(kept) ? [`${kept} ${args[kept.slice(1)]}`] : [];
      return [Object.entries(args).reduce((l, [k, v]) => (keptByBase.has(`&${k}`) ? l : l.replace(new RegExp(`&${k}(?![A-Za-z0-9_])`, 'g'), v)), line)];
    })
    .join('\n');
}

/**
 * A fragment as a repository holds it: its own, where it has points with no arguments, and one for each set of arguments
 * its points carry, the template with them bound, its id the way a `from` line takes it (`diatonic(mode=aeolian)`), in the
 * order the points first name them. A seed file's and a filed one's alike; a fragment with no arguments is itself.
 */
export function variantsOf(fragment: Fragment): Fragment[] {
  if (!fragment.association.some((wp) => wp.args)) return [fragment];
  const plain = fragment.association.filter((wp) => !wp.args);
  const sets = new Map<string, { args: Readonly<Record<string, string>>; points: WeightedPoint[] }>();
  for (const wp of fragment.association) {
    if (!wp.args) continue;
    const id = takenAs(fragment.id, wp.args);
    const { args: _, ...point } = wp;
    sets.set(id, { args: wp.args, points: [...(sets.get(id)?.points ?? []), point] });
  }
  return [
    ...(plain.length ? [{ ...fragment, association: plain }] : []),
    ...[...sets].map(([id, { args, points }]) => ({ id, text: boundText(fragment.text, args), association: points })),
  ];
}

/** The arguments a variant of this fragment is taken with, where `id` names one of its sets; undefined where it names none. */
export function argsOf(fragment: Fragment, id: string): Readonly<Record<string, string>> | undefined {
  return fragment.association.find((wp) => wp.args && takenAs(fragment.id, wp.args) === id)?.args;
}

/** Whether a point is of the variant taken with these arguments (none: the fragment's own points, with none). */
export const ofArgs = (wp: WeightedPoint, args: Readonly<Record<string, string>> | undefined): boolean =>
  args === undefined ? !wp.args : !!wp.args && JSON.stringify(Object.entries(wp.args)) === JSON.stringify(Object.entries(args));
