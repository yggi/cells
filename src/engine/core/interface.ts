/** What an interface keeps (decision 077 §2): read by `toCore`'s rounds and the core fold. Pure. */
import { declLine } from '../edit';

/**
 * Does a step keep the interface (decision 077 §2)? Each interface cell still declared, and still read by name where
 * another line read it before: a copy written out (`base=&grouping` as its steps), a table written in place, would leave
 * a parameter that nothing reads.
 */
export function keepsInterface(before: string, after: string, keep: ReadonlySet<string>): boolean {
  const readers = (t: string, n: string) => {
    const ref = new RegExp(`&${n}(?![A-Za-z0-9_])`);
    const own = declLine(t, n);
    return t.split('\n').filter((l, i) => i !== own && ref.test(l)).length;
  };
  return [...keep].every((n) => declLine(after, n) >= 0 && (readers(before, n) === 0 || readers(after, n) > 0));
}
