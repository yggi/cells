/**
 * The `from` line's forms (decision 065): read by the parser, the expansion (`../use.ts`) and a piece file's lockfile.
 * A `use` line (decisions 054, 059) is retired: Migrate stopped reading it (#588), and the parser says so.
 */

const NAME = '&[A-Za-z_][A-Za-z0-9_]*';

/** An id as written: a word as it is, the double quotes taken off. */
const idOf = (written: string) => (written.startsWith('"') ? written.slice(1, -1) : written);

/** An id that can be written bare: a word. */
export const isWordId = (id: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(id);

/** Does the line start with `use`, the retired form? */
export const isUse = (code: string): boolean => /^\s*use(?![A-Za-z0-9_])/.test(code);

/**
 * A `from` line (decision 065): `&key from harmonic_minor D`, `&bar from swung_4_4(swing=8n:.64) &tempo`, `&bd, &sd from
 * gm_kit`, `* from gm_kit`; or, with no id, a fragment's signature: `&bar from (&swing) &tempo`.
 */
export type FromForm =
  | {
      readonly kind: 'use';
      /** The fragment's id: a word as written (`gm_kit`), or what the double quotes hold (`"my riff"`). */
      readonly id: string;
      /** The names the line binds (`&key`, `&kick` of `&kick=bd`), each once; null for `*`. */
      readonly names: readonly string[] | null;
      /**
       * What each of `names` takes from the fragment, in the same order (`&bd` of `&kick=bd`; the name itself where the line
       * writes no `=`, decision 075 §3a); null for `*`. The fragment's name is a word of the line, as a keyword is.
       */
      readonly takes: readonly string[] | null;
      /** The head's attributes, written before `from` (`label="my key"`), each a `key=value` as written. */
      readonly head: readonly string[];
      /** The named arguments, in parentheses (`swing=8n:.64`), as written; null where there are none. */
      readonly args: readonly { readonly name: string; readonly value: string }[] | null;
      /** The rest of the line, the main argument as written (a cell's body), or null where there is none. */
      readonly main: string | null;
    }
  | {
      readonly kind: 'signature';
      /** The heads (`&bar`). */
      readonly names: readonly string[];
      /** The optional parameters (`&swing`), in the order written. */
      readonly optional: readonly string[];
      /** The main parameter (`&tempo`), or null where there is none. */
      readonly main: string | null;
    };

/** A line's top-level tokens: split at spaces outside quotes and brackets, each with where it starts. */
export function topTokens(text: string): { readonly text: string; readonly at: number }[] {
  const out: { text: string; at: number }[] = [];
  let depth = 0;
  let quoted = false;
  let start = -1;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (c === undefined || (!quoted && depth === 0 && /\s/.test(c))) {
      if (start >= 0) out.push({ text: text.slice(start, i), at: start });
      start = -1;
      continue;
    }
    if (start < 0) start = i;
    if (c === '"') quoted = !quoted;
    else if (!quoted && '([{'.includes(c)) depth++;
    else if (!quoted && ')]}'.includes(c)) depth = Math.max(0, depth - 1);
  }
  return out;
}

/** A list in parentheses, split at its top-level commas, each trimmed; null where it isn't one. */
function listIn(text: string): string[] | null {
  if (!text.startsWith('(') || !text.endsWith(')')) return null;
  const inner = text.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let i = 0; i <= inner.length; i++) {
    const c = inner[i];
    if (c === undefined || (c === ',' && !quoted && depth === 0)) {
      out.push(inner.slice(start, i).trim());
      start = i + 1;
      continue;
    }
    if (c === '"') quoted = !quoted;
    else if (!quoted && '([{'.includes(c)) depth++;
    else if (!quoted && ')]}'.includes(c)) depth--;
  }
  return out.length === 1 && out[0] === '' ? [] : out;
}

/** A name on a `from` line's left side: `&key`, or `&kick=bd`, the piece's name for the fragment's `bd`. */
const TAKEN = `${NAME}(?:=[A-Za-z_][A-Za-z0-9_]*)?`;
const LEFT = new RegExp(`^\\s*(\\*|${TAKEN}(?:\\s*,\\s*${TAKEN})*)(?=\\s|$)`);
const NAME_ALONE = new RegExp(`^${NAME}$`);
const WORD_ID = /^[A-Za-z_][A-Za-z0-9_]*/;
const QUOTED_ID = /^"[^"]*\S[^"]*"/;
/** A token that is an attribute, `key=value`. */
export const isAttribute = (token: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*=/.test(token);

/**
 * A `from` line (decision 065), read: a use of a fragment or a signature; null where the line has a top-level `from`
 * after its names and isn't one; undefined where it isn't a `from` line at all (a cell, a `use` line).
 */
export function readFrom(code: string): FromForm | null | undefined {
  const left = LEFT.exec(code);
  if (!left) return undefined;
  const tokens = topTokens(code);
  const leftEnd = left[0].length;
  const from = tokens.findIndex((t) => t.at >= leftEnd && t.text === 'from');
  if (from < 0) return undefined;
  const all = left[1] === '*';
  const pairs = all ? null : left[1]!.split(',').map((n) => n.trim().split('=') as [string, string?]);
  const taken = pairs?.map(([n, t]) => [n, t === undefined ? n : `&${t}`] as const) ?? null;
  // (a line that renames binds each name once and takes each of the fragment's once: `&a=bd, &a=sd` is two meanings)
  const once = (xs: readonly string[]) => new Set(xs).size === xs.length;
  if (taken && pairs!.some(([, t]) => t !== undefined) && !(once(taken.map(([n]) => n)) && once(taken.map(([, t]) => t)))) return null;
  const unique = taken ? [...new Map(taken)] : null;
  const names = unique ? unique.map(([n]) => n) : null;
  const takes = unique ? unique.map(([, t]) => t) : null;
  const head = tokens.filter((t, i) => t.at >= leftEnd && i < from).map((t) => t.text);
  if (head.some((t) => !isAttribute(t)) || (all && head.length)) return null;
  const rest = code.slice(tokens[from]!.at + 4).trim();
  // (a signature: nothing, a list of parameters or a name after `from`, no id)
  if (rest === '' || rest.startsWith('(') || rest.startsWith('&')) {
    if (!names || head.length || takes!.some((t, i) => t !== names[i])) return null;
    const after = topTokens(rest);
    const optional = after[0]?.text.startsWith('(') ? listIn(after[0].text) : [];
    if (optional === null || optional.some((p) => !NAME_ALONE.test(p))) return null;
    const mains = after.slice(after[0]?.text.startsWith('(') ? 1 : 0);
    if (mains.length > 1 || (mains[0] && !NAME_ALONE.test(mains[0].text))) return null;
    return { kind: 'signature', names, optional: [...new Set(optional)], main: mains[0]?.text ?? null };
  }
  const idText = (QUOTED_ID.exec(rest) ?? WORD_ID.exec(rest))?.[0];
  if (!idText) return null;
  let tail = rest.slice(idText.length);
  let args: { name: string; value: string }[] | null = null;
  const open = /^\s*\(/.exec(tail);
  if (open) {
    const list = topTokens(tail.trimStart())[0]!.text;
    const parts = listIn(list);
    if (!parts) return null;
    args = [];
    for (const p of parts) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S[\s\S]*)$/.exec(p);
      if (!m || args.some((a) => a.name === m[1])) return null;
      args.push({ name: m[1]!, value: m[2]!.trim() });
    }
    tail = tail.trimStart().slice(list.length);
  } else if (tail && !/^\s/.test(tail)) return null;
  const main = tail.trim();
  return { kind: 'use', id: idOf(idText), names, takes, head, args, main: main || null };
}

/** A `from` line's left side, written: `&kick=bd, &sd`, or `*` for every name. */
export const leftOf = (names: readonly string[] | null, takes: readonly string[] | null = names): string =>
  names ? names.map((n, i) => (takes && takes[i] !== n ? `${n}=${takes[i]!.slice(1)}` : n)).join(', ') : '*';

/** What a malformed `from` line is told. */
export const FROM_FORM =
  'A from line says where its cells come from: &key from harmonic_minor D, &bar from swung_4_4(swing=8n:.64) &tempo, &bd, &sd from gm_kit, &kick=bd from gm_kit (the piece’s &kick, the kit’s bd), * from gm_kit; the head’s attributes go before from (&key label="…" from …), the named arguments in parentheses; with no id, a fragment’s signature: &bar from (&swing) &tempo';

/**
 * What a `use` line is told (decision 065, #588): it is retired, and the line says where its cells come from. It names no
 * `from` line of its own, since only the fragment says whether that is a collection's (`&bd, &sd from gm_kit`) or a
 * template's, with its arguments (`&key from diatonic D`): #406.
 */
export const USE_RETIRED =
  'use is retired (decision 065): a line says where its cells come from, &bd, &sd from gm_kit (a collection, by name) or &key from diatonic(mode=dorian) D (a template, with its arguments)';
