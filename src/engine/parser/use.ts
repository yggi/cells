/** The `use` line's forms (decisions 054, 059): read by the parser, the expansion (`../use.ts`) and a piece file's lockfile. */

/** A `use` line, read: the fragment's id, and the names it asks for. */
export interface UseForm {
  /** The fragment's id: a word as written (`core_kit`), or what the double quotes hold (`"core kit"`). */
  readonly id: string;
  /** The names it asks for (`&bd`), in the order written, each once; null for every name the fragment defines. */
  readonly names: readonly string[] | null;
  /**
   * How it is written: `named` (`use &bd, &sd from core_kit`), `short` (`use &aeolian`, the fragment named as its
   * cell), `all` (`use * from core_kit`), or `quoted` (`use "core kit"`, the old way: `use * from "core kit"`).
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
  'A use line says what it takes from which fragment: use &bd, &sd from core_kit, use * from core_kit, or use &aeolian (from aeolian); an id of more than a word in double quotes: use * from "core kit"';

/** What the old spelling, `use "id"`, is told: it reads as `use * from "id"`. */
export const useQuoted = (id: string): string => `use "${id}" is the old way: write ${writeUse({ id, names: null })} (or name what it takes: use &a, &b from …)`;
