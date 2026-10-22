/**
 * `use "core kit"` (decision 054): a fragment taken into a piece by its id. What the compiler reads, the **expansion**,
 * is the piece's own lines, then each used fragment's lines the piece doesn't define, in the order the `use` lines are
 * written; a used fragment that uses others is expanded first, its own lines winning over theirs.
 *
 * - A line two used fragments give word for word (its code: comments aside, whitespace collapsed) is one line; a name
 *   they define by different lines, and the piece doesn't, is an error naming it and both ids. `use` never renames: a
 *   renamed voice changes its drum note (#117).
 * - An id used twice gives its lines once, at its first `use` (the second warns, in the piece).
 * - A cycle is an error naming it, and so is a depth past `USE_DEPTH`; an unresolved id is an error naming it, and the
 *   piece's other lines compile as they would without it. Each is said on the piece's `use` line it came through.
 * - Cells resolves nothing itself: the host hands each compile a resolver (`Resolve`), and the hashes its lockfile
 *   recorded (`Locked`); a recorded hash the library no longer gives plays the current version, with a warning.
 * - A fragment's hash is `e1:` and a hash of its text up to layout (decision 050's E1, its rung written first, so it
 *   still checks once E4 exists).
 *
 * `expand` writes the expansion out (Cell studio's "write out"); `expansion` is what `compileSource` reads. Pure.
 */
import { splitComment } from './edit';
import { readUse, USE_FORM } from './parser/use';
import type { Diagnostic, Span } from './ast';
import type { CompileOptions, Resolve, Used } from './program';

/** How deep `use` nests: a kit in a groove in a section in a piece is 3. */
export const USE_DEPTH = 8;

/** A line of a text, as the parser groups them (a line and those it continues onto). */
interface Line {
  /** The cell it declares (bare), or null for a `use` line or a line that declares none. */
  readonly name: string | null;
  /** Its `use`: the id, null for a malformed one; undefined for a line that isn't one. */
  readonly use: string | null | undefined;
  /** As written, its physical lines joined. */
  readonly written: string;
  /** Its code: comments aside, whitespace collapsed. */
  readonly code: string;
  /** Its first line, 1-based. */
  readonly line: number;
}

const HEAD = /^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const CONTINUES = /[+*,[]\s*$/;

/** A text's lines, as the parser groups them; blank lines and comments alone left out. */
function linesOf(text: string): Line[] {
  const out: Line[] = [];
  let carry: { written: string[]; code: string[]; line: number } | null = null;
  text.split('\n').forEach((raw, i) => {
    const code = splitComment(raw)[0];
    carry ??= { written: [], code: [], line: i + 1 };
    carry.written.push(raw);
    carry.code.push(code);
    if (CONTINUES.test(code)) return;
    const whole = carry.code.join(' ').trim().split(/\s+/).join(' ');
    if (whole) out.push({ name: HEAD.exec(whole)?.[1] ?? null, use: readUse(whole), written: carry.written.join('\n'), code: whole, line: carry.line });
    carry = null;
  });
  return out;
}

/** Does this text have a `use` line? (Cheap: a text without one compiles as it always has.) */
export const hasUse = (text: string): boolean => /^\s*use(?![A-Za-z0-9_])/m.test(text);

/** A string's hash, 64 bits as 16 hex digits (two FNV-1a passes, 32 bits each, from different offsets). */
function hash64(s: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** A fragment's hash: `e1:` and the hash of its text up to layout (its lines' code, one to a line). */
export const fragmentHash = (text: string): string =>
  `e1:${hash64(
    linesOf(text)
      .map((l) => l.code)
      .join('\n'),
  )}`;

const quoted = (id: string) => JSON.stringify(id);
const pathOf = (path: readonly string[]) => path.map(quoted).join(' → ');

/** What a level of the expansion gave: its lines, and, for each of its `use` lines, what that gave and what was overridden. */
interface Merged {
  readonly lines: readonly Line[];
  readonly per: readonly { readonly gave: readonly string[]; readonly overrode: readonly string[] }[];
}

/**
 * A level's own lines, then each used fragment's lines its own don't define, in order: a line given word for word twice
 * kept once, a name given by different lines an error (said by `say`, with the index of the `use` that gave it second).
 */
function merge(own: readonly Line[], used: readonly { id: string; lines: readonly Line[] }[], say: (i: number, message: string) => void): Merged {
  const defined = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  const given = new Map<string, { id: string; code: string }>();
  const lines: Line[] = own.filter((l) => l.name);
  const per = used.map(({ id, lines: theirs }, i) => {
    const gave = new Set<string>();
    const overrode = new Set<string>();
    for (const l of theirs) {
      if (!l.name) continue;
      if (defined.has(l.name)) {
        overrode.add(`&${l.name}`);
        continue;
      }
      const there = given.get(l.name);
      if (there && there.id !== id) {
        if (there.code === l.code) gave.add(`&${l.name}`);
        else say(i, `&${l.name} is defined by ${quoted(there.id)} and by ${quoted(id)}, by different lines: write it in the piece, or drop one use`);
        continue;
      }
      given.set(l.name, { id, code: l.code });
      gave.add(`&${l.name}`);
      lines.push(l);
    }
    return { gave: [...gave], overrode: [...overrode] };
  });
  return { lines, per };
}

/** A used fragment's lines, its own uses expanded (`path`: the ids that led here, this one last), or none where it can't be. */
function fragmentLines(path: readonly string[], text: string, resolve: Resolve, say: (message: string) => void): readonly Line[] {
  const own = linesOf(text);
  const where = ` (in ${pathOf(path)})`;
  const seen = new Set<string>();
  const used = own.flatMap((l) => {
    if (l.use === undefined) return [];
    if (l.use === null) {
      say(`${USE_FORM}${where}`);
      return [];
    }
    const id = l.use;
    // (an id used twice gives its lines once)
    if (seen.has(id)) return [];
    seen.add(id);
    const next = [...path, id];
    if (path.includes(id)) say(`use ${quoted(id)} is a cycle: ${pathOf(next)}`);
    else if (next.length > USE_DEPTH) say(`use ${quoted(id)} nests past ${USE_DEPTH} deep: ${pathOf(next)}`);
    else {
      const theirs = resolve(id);
      if (theirs === null) say(`No fragment ${quoted(id)} to use${where}`);
      else return [{ id, lines: fragmentLines(next, theirs, resolve, say) }];
    }
    return [{ id, lines: [] }];
  });
  return merge(own, used, (_, message) => say(`${message}${where}`)).lines;
}

/** The expansion of a text, as the compiler reads it. */
export interface Expansion {
  /** The piece's own text as written, then the used lines (so the piece's lines keep their numbers). */
  readonly text: string;
  /** Its `use` lines, compiled: what each resolved to, gave and was overridden in. */
  readonly uses: readonly Used[];
  /** Every name a `use` gave (bare). */
  readonly given: ReadonlySet<string>;
  /** What the expansion says: an unresolved id, a cycle, a depth past `USE_DEPTH`, a collision, a changed version. */
  readonly diagnostics: readonly Diagnostic[];
  /** For each line of `text` past the piece's own, the `use` line it came through. */
  readonly through: (line: number) => Span | null;
}

/** The expansion of a text (see the module's comment), its `use` lines resolved by `options`. */
export function expansion(text: string, { resolve, locked = [] }: CompileOptions = {}): Expansion {
  const own = linesOf(text);
  const uses = own.filter((l): l is Line & { use: string } => typeof l.use === 'string');
  const diagnostics: Diagnostic[] = [];
  const spanOf = (l: Line): Span => {
    const first = l.written.split('\n')[0] ?? '';
    const col = first.search(/\S/);
    return { line: l.line, col: col + 1, len: first.trimEnd().length - col };
  };
  const hashes: (string | null)[] = [];
  const first = new Map<string, number>();
  const used = uses.map((u, i) => {
    const span = spanOf(u);
    // (an id used twice gives its lines once, at its first use; the second adds nothing, and says so)
    const earlier = first.get(u.use);
    if (earlier !== undefined) {
      diagnostics.push({ severity: 'warning', message: `use ${quoted(u.use)} is written already, on line ${uses[earlier]!.line}: this one adds nothing`, span });
      hashes.push(hashes[earlier] ?? null);
      return { id: u.use, lines: [] };
    }
    first.set(u.use, i);
    const say = (message: string) => diagnostics.push({ severity: 'error', message, span });
    const recorded = locked.find((k) => k.id === u.use)?.hash;
    const theirs = resolve ? resolve(u.use, ...(recorded ? [recorded] : [])) : null;
    if (theirs === null) {
      say(resolve ? `No fragment ${quoted(u.use)} to use` : `No library to use ${quoted(u.use)} from: compileSource(text, env, { resolve })`);
      hashes.push(null);
      return { id: u.use, lines: [] };
    }
    const hash = fragmentHash(theirs);
    hashes.push(hash);
    if (recorded && recorded !== hash)
      diagnostics.push({ severity: 'warning', message: `${quoted(u.use)} has changed since this piece was saved: its current version plays`, span });
    return { id: u.use, lines: fragmentLines([u.use], theirs, resolve!, say) };
  });
  const merged = merge(own, used, (i, message) => diagnostics.push({ severity: 'error', message, span: spanOf(uses[i]!) }));
  // (the used lines after the piece's, each remembering the use it came through)
  const head = text.split('\n').length;
  const from = new Map<Line, number>(used.flatMap((u, i) => u.lines.map((l) => [l, i] as const)));
  const added = merged.lines.filter((l) => from.has(l));
  const through: Span[] = [];
  for (const l of added) for (let k = l.written.split('\n').length; k > 0; k--) through.push(spanOf(uses[from.get(l)!]!));
  return {
    text: added.length ? [text, ...added.map((l) => l.written)].join('\n') : text,
    uses: uses.map((u, i) => ({ id: u.use, span: spanOf(u), hash: hashes[i] ?? null, gave: merged.per[i]!.gave, overrode: merged.per[i]!.overrode })),
    given: new Set(added.flatMap((l) => (l.name ? [l.name] : []))),
    diagnostics,
    through: (line) => (line > head ? (through[line - head - 1] ?? null) : null),
  };
}

/**
 * A piece's expansion written out (decision 054; #177's `inline`, Cell studio's "write out"): its own lines, its `use`
 * lines gone, then the used lines it doesn't define. A `use` that doesn't resolve stays, so nothing is lost.
 */
export function expand(text: string, resolve: Resolve, locked?: CompileOptions['locked']): string {
  if (!hasUse(text)) return text;
  const x = expansion(text, { resolve, ...(locked ? { locked } : {}) });
  const kept = new Set(x.uses.filter((u) => u.hash === null).map((u) => u.span.line));
  const own = text
    .split('\n')
    .filter((raw, i) => readUse(splitComment(raw)[0]) === undefined || kept.has(i + 1))
    .join('\n');
  const added = x.text.split('\n').slice(text.split('\n').length);
  return [own.replace(/\s+$/, ''), ...added].join('\n') + (text.endsWith('\n') ? '\n' : '');
}
