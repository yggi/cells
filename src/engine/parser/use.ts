/** The `use` line's forms (decisions 054, 059): read by the parser, the expansion (`../use.ts`) and a piece file's lockfile. */

/** A `use` line, read: the fragment's id, and the names it asks for. */
export interface UseForm {
  /** The fragment's id: a word as written (`gm_kit`), or what the double quotes hold (`"harmonic minor"`). */
  readonly id: string;
  /** The names it asks for (`&bd`), in the order written, each once; null for every name the fragment defines. */
  readonly names: readonly string[] | null;
  /**
   * How it is written: `named` (`use &bd, &sd from gm_kit`), `short` (`use &aeolian`, the fragment named as its
   * cell), `all` (`use * from gm_kit`), or `quoted` (`use "harmonic minor"`, the old way: `use * from "harmonic minor"`).
   */
  readonly form: 'named' | 'short' | 'all' | 'quoted';
}

const NAME = '&[A-Za-z_][A-Za-z0-9_]*';
const ID = '([A-Za-z_][A-Za-z0-9_]*|"[^"]*\\S[^"]*")';
const QUOTED = /^\s*use\s+"([^"]*\S[^"]*)"\s*$/;
const ALL = new RegExp(`^\\s*use\\s+\\*\\s+from\\s+${ID}\\s*$`);
const NAMED = new RegExp(`^\\s*use\\s+(${NAME}(?:\\s*,\\s*${NAME})*)\\s+from\\s+${ID}\\s*$`);
const SHORT = new RegExp(`^\\s*use\\s+&([A-Za-z_][A-Za-z0-9_]*)\\s*$`);

/** An id as written: a word as it is, the double quotes taken off. */
const idOf = (written: string) => (written.startsWith('"') ? written.slice(1, -1) : written);

/** An id that can be written bare: a word. */
export const isWordId = (id: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(id);

/**
 * A `use` line (decisions 054, 059): the fragment it takes from and the names it asks for, or null where the line starts
 * with `use` and isn't one; undefined where it doesn't start with `use`.
 */
export function readUse(code: string): UseForm | null | undefined {
  if (!/^\s*use(?![A-Za-z0-9_])/.test(code)) return undefined;
  const quoted = QUOTED.exec(code);
  if (quoted) return { id: quoted[1]!, names: null, form: 'quoted' };
  const all = ALL.exec(code);
  if (all) return { id: idOf(all[1]!), names: null, form: 'all' };
  const named = NAMED.exec(code);
  if (named) return { id: idOf(named[2]!), names: [...new Set(named[1]!.split(',').map((n) => n.trim()))], form: 'named' };
  const short = SHORT.exec(code);
  if (short) return { id: short[1]!, names: [`&${short[1]}`], form: 'short' };
  return null;
}

/** A `use` line in its one spelling (decision 059): `use &x` where it names &x from x, the id bare where it is a word. */
export function writeUse({ id, names }: Pick<UseForm, 'id' | 'names'>): string {
  const from = isWordId(id) ? id : JSON.stringify(id);
  if (!names) return `use * from ${from}`;
  if (names.length === 1 && names[0] === `&${id}`) return `use &${id}`;
  return `use ${names.join(', ')} from ${from}`;
}

/** What a malformed `use` line is told. */
export const USE_FORM =
  'A use line says what it takes from which fragment: use &bd, &sd from gm_kit, use * from gm_kit, or use &aeolian (from aeolian); an id of more than a word in double quotes: use * from "harmonic minor"';

/**
 * A `from` line (decision 065): `&key from harmonic_minor D`, `&bar from swung_4_4(swing=8n:.64) &tempo`, `&bd, &sd from
 * gm_kit`, `* from gm_kit`; or, with no id, a fragment's signature: `&bar from (&swing) &tempo`.
 */
export type FromForm =
  | {
      readonly kind: 'use';
      /** The fragment's id, as `UseForm`'s. */
      readonly id: string;
      /** The names the line takes (`&key`), each once; null for `*`. */
      readonly names: readonly string[] | null;
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

const LEFT = new RegExp(`^\\s*(\\*|${NAME}(?:\\s*,\\s*${NAME})*)(?=\\s|$)`);
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
  const names = all ? null : [...new Set(left[1]!.split(',').map((n) => n.trim()))];
  const head = tokens.filter((t, i) => t.at >= leftEnd && i < from).map((t) => t.text);
  if (head.some((t) => !isAttribute(t)) || (all && head.length)) return null;
  const rest = code.slice(tokens[from]!.at + 4).trim();
  // (a signature: nothing, a list of parameters or a name after `from`, no id)
  if (rest === '' || rest.startsWith('(') || rest.startsWith('&')) {
    if (!names || head.length) return null;
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
  return { kind: 'use', id: idOf(idText), names, head, args, main: main || null };
}

/** What a malformed `from` line is told. */
export const FROM_FORM =
  'A from line says where its cells come from: &key from harmonic_minor D, &bar from swung_4_4(swing=8n:.64) &tempo, &bd, &sd from gm_kit, * from gm_kit; the head’s attributes go before from (&key label="…" from …), the named arguments in parentheses; with no id, a fragment’s signature: &bar from (&swing) &tempo';

/** How what a `use` line is told begins: a reader that sets that aside (the fit) reads it. */
export const USE_OLD = 'use is the old way';

/**
 * What a `use` line is told (decision 065): it is the old way, and says what the `from` line is. A template's arguments,
 * which the `use` read by name, are Normalise's to write (its Migrate step), since only the fragment says what they are.
 */
export const useOld = ({ id, names }: Pick<UseForm, 'id' | 'names'>): string =>
  `${USE_OLD}: say where the cells come from, ${names ? names.join(', ') : '*'} from ${isWordId(id) ? id : JSON.stringify(id)} (decision 065; Normalise writes it, with a template's arguments)`;
