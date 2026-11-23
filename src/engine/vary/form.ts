/**
 * A fragment's forms as Vary reads them (decision 052, point 10): the line two levels up (#51). A form is a cell of the
 * fragment's own that no line plays, its every step a splice of another cell (`&a`, `&a^3`, `inverse(&call)`,
 * `&call[::-1]`): a form's letters (`&chorus step=8n &a &a &b &a`) or a song plan's sections (`&verseChorus &intro &verse
 * &chorus …`). Two forms of as many slots whose slots pair one to one (`&intro` with `&introPlays` wherever either
 * stands: a song plan and the plan of who plays) are one form: varied together, by the first, the other carried slot for
 * slot.
 *
 * Its anchors are its first and last slot (a form's statement and its return, a song's intro and outro), or a frontend's
 * mask (`VaryOptions.fixed`). Its operators are the slot operators every level shares (`slots.ts`): rotate and reverse
 * between the anchors, swap two adjacent slots, substitute a slot by another the form holds. Pure.
 */

/** A step of a form: a splice of a cell, moved or read otherwise or not. */
const SPLICE = /^(?:&[A-Za-z_][A-Za-z0-9_]*(?:\^\$?-?\d+|\[[^\]]*\])*|(?:inverse|degree)\(.+\))$/;

/** A form as read: its cell and its slots as written, and the form it carries slot for slot, if any. */
export interface Form {
  /** Its cell, as a line is named: `&chorus`. */
  readonly name: string;
  readonly head: readonly string[];
  readonly attrs: readonly string[];
  readonly slots: readonly string[];
  /** The form varied with it, slot for slot (a song's plan of who plays). */
  readonly partner?: { readonly name: string; readonly head: readonly string[]; readonly attrs: readonly string[]; readonly slots: readonly string[] };
}

/** The default anchors of a form of `n` slots: its first and its last. */
export const FORM_FIXED: readonly number[] = [0, -1];

/** A cell's words as written (`declWords`): its head, attributes and braid. */
type Words = { readonly head: readonly string[]; readonly attrs: readonly string[]; readonly braid: readonly string[] } | null;

/**
 * The forms among a fragment's own cells: each one no line plays (`played`), no progression, with a voice of none, every
 * step a splice, two or more of them; then those of as many slots paired one to one joined, the first carrying the other.
 */
export function formsOf(own: Iterable<string>, words: (name: string) => Words, played: ReadonlySet<string>, voiced: (name: string) => boolean): Form[] {
  const read: Form[] = [];
  for (const name of own) {
    if (played.has(name) || voiced(name)) continue;
    const w = words(name);
    if (!w || w.braid.length < 2 || !w.braid.every((t) => SPLICE.test(t))) continue;
    read.push({ name: `&${name}`, head: w.head, attrs: w.attrs, slots: w.braid });
  }
  const out: Form[] = [];
  const taken = new Set<string>();
  for (const [i, f] of read.entries()) {
    if (taken.has(f.name)) continue;
    const partner = read.slice(i + 1).find((g) => !taken.has(g.name) && paired(f.slots, g.slots));
    if (partner) taken.add(partner.name);
    out.push(partner ? { ...f, partner } : f);
  }
  return out;
}

/** Whether two forms' slots pair one to one: as many, and each slot of one always beside the same slot of the other. */
function paired(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const ab = new Map<string, string>();
  const ba = new Map<string, string>();
  for (const [i, x] of a.entries()) {
    const y = b[i]!;
    if ((ab.get(x) ?? y) !== y || (ba.get(y) ?? x) !== x) return false;
    ab.set(x, y);
    ba.set(y, x);
  }
  return new Set(a).size > 1;
}
