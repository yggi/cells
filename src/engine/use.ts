/**
 * `use` (decisions 054, 059): a fragment's lines taken into a piece, by its id. What the compiler reads, the
 * **expansion**, is the piece's own lines, then the lines each `use` takes that the piece doesn't define, in the order
 * the `use` lines are written; a used fragment that uses others is expanded first, its own lines winning over theirs.
 *
 * - `use * from core_kit` takes every line (`use "core kit"`, the old way, is the same, and warns); `use &bd, &sd from
 *   core_kit` takes the named cells and the fragment's lines they read, their closure (the names they write, `&x`,
 *   followed within the fragment: what the closure takes and the use doesn't name are the fragment's helpers); `use
 *   &aeolian` is `use &aeolian from aeolian`.
 * - A name the use asks for and the fragment doesn't define is an error naming the ones it does; a name it asks for
 *   that the piece defines is the piece's (it overrides), and says the use of it adds nothing; a helper the piece
 *   defines is an error (decision 059: a helper is the fragment's, and the piece's line would change what it reads), but
 *   an interface name (`&key`, `&bar` …: `INTERFACE_NAMES`), which is the piece's, read by the fragment's line (decision 060).
 * - A line two used fragments give word for word (its code: comments aside, whitespace collapsed) is one line; a name
 *   they define by different lines, and the piece doesn't, is an error naming it and both ids. `use` never renames: a
 *   renamed voice changes its drum note (#117).
 * - A line taken twice from one id is taken once, at its first `use`; a use that then takes nothing says so.
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
import { readUse, USE_FORM, type UseForm } from './parser/use';
import type { Diagnostic, Span } from './ast';
import { INTERFACE_NAMES, type CompileOptions, type Resolve, type Used } from './program';

/** How deep `use` nests: a kit in a groove in a section in a piece is 3. */
export const USE_DEPTH = 8;

/** A line of a text, as the parser groups them (a line and those it continues onto). */
interface Line {
  /** The cell it declares (bare), or null for a `use` line or a line that declares none. */
  readonly name: string | null;
  /** Its `use`, read; null for a malformed one, undefined for a line that isn't one. */
  readonly use: UseForm | null | undefined;
  /** The names its code writes after its head (`&x`, bare): what it reads. */
  readonly reads: readonly string[];
  /** As written, its physical lines joined. */
  readonly written: string;
  /** Its code: comments aside, whitespace collapsed. */
  readonly code: string;
  /** Its first line, 1-based. */
  readonly line: number;
}

const HEAD = /^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const READS = /&([A-Za-z_][A-Za-z0-9_]*)/g;
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
    if (whole) {
      const head = HEAD.exec(whole);
      const reads = head ? [...new Set([...whole.slice(head[0].length).matchAll(READS)].map((m) => m[1]!))] : [];
      out.push({ name: head?.[1] ?? null, use: readUse(whole), reads, written: carry.written.join('\n'), code: whole, line: carry.line });
    }
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

/** What a `use` took: its fragment's lines (its own uses expanded), and the names it asks for (bare; null for all). */
interface Taken {
  readonly id: string;
  readonly names: ReadonlySet<string> | null;
  readonly lines: readonly Line[];
  /** Did its fragment resolve? (An unresolved one is said already: what it lacks isn't.) */
  readonly resolved: boolean;
}

/** What a level of the expansion gave: its lines, and, for each of its `use` lines, what that gave and what was overridden. */
interface Merged {
  readonly lines: readonly Line[];
  readonly per: readonly { readonly gave: readonly string[]; readonly overrode: readonly string[] }[];
}

/** The interface names, bare (`bar`, `key` …). */
const INTERFACE = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));

/**
 * A level's own lines, then the lines each use takes that its own don't define, in order: a line given word for word
 * twice kept once, a name given by different lines an error (said by `say`, with the index of the `use` that gave it
 * second), and so are a name asked for that the fragment lacks and a helper the level defines (`host` names the level).
 */
function merge(own: readonly Line[], used: readonly Taken[], say: (i: number, message: string) => void, host: string): Merged {
  const defined = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  const given = new Map<string, { id: string; code: string }>();
  const lines: Line[] = own.filter((l) => l.name);
  const per = used.map(({ id, names, lines: theirs, resolved }, i) => {
    const byName = new Map<string, Line>();
    for (const l of theirs) if (l.name && !byName.has(l.name)) byName.set(l.name, l);
    if (names && resolved) {
      const lacking = [...names].filter((n) => !byName.has(n));
      for (const n of lacking) say(i, `&${n} is not in ${quoted(id)}: it defines ${[...byName.keys()].map((m) => `&${m}`).join(', ')}`);
    }
    const asked = names ?? new Set(byName.keys());
    const overrode = [...asked].filter((n) => byName.has(n) && defined.has(n)).map((n) => `&${n}`);
    // (the closure: what the asked-for lines read within the fragment, but where the level writes its own)
    const take = new Set<string>();
    const clashed = new Set<string>();
    const queue = [...asked].filter((n) => byName.has(n) && !defined.has(n));
    for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
      if (take.has(n)) continue;
      take.add(n);
      for (const r of byName.get(n)!.reads) {
        if (!byName.has(r) || take.has(r) || asked.has(r) || clashed.has(r)) continue;
        if (!defined.has(r)) queue.push(r);
        // (an interface name the level defines is the level's: what the fragment's line reads, as the main key was, decision 060)
        else if (INTERFACE.has(r)) continue;
        else {
          clashed.add(r);
          say(i, `&${r} is ${quoted(id)}'s, read by its &${n}, and ${host}'s too: rename ${host}'s, or name &${r} in the use to override it`);
        }
      }
    }
    const gave = new Set<string>();
    for (const l of theirs) {
      if (!l.name || !take.has(l.name)) continue;
      const there = given.get(l.name);
      if (there) {
        // (a line taken twice from one id is taken once; from another id, word for word, it is one line both give)
        if (there.id !== id && there.code === l.code) gave.add(`&${l.name}`);
        else if (there.id !== id) say(i, `&${l.name} is defined by ${quoted(there.id)} and by ${quoted(id)}, by different lines: write it in the piece, or drop one use`);
        continue;
      }
      given.set(l.name, { id, code: l.code });
      gave.add(`&${l.name}`);
      lines.push(l);
    }
    return { gave: [...gave], overrode };
  });
  return { lines, per };
}

/** A use line's names, bare, or null for all. */
const namesOf = (u: UseForm): ReadonlySet<string> | null => (u.names ? new Set(u.names.map((n) => n.slice(1))) : null);

/** A used fragment's lines, its own uses expanded (`path`: the ids that led here, this one last), or none where it can't be. */
function fragmentLines(path: readonly string[], text: string, resolve: Resolve, say: (message: string) => void): readonly Line[] {
  const own = linesOf(text);
  const where = ` (in ${pathOf(path)})`;
  const used = own.flatMap((l): Taken[] => {
    if (l.use === undefined) return [];
    if (l.use === null) {
      say(`${USE_FORM}${where}`);
      return [];
    }
    const { id } = l.use;
    const names = namesOf(l.use);
    const next = [...path, id];
    if (path.includes(id)) say(`use ${quoted(id)} is a cycle: ${pathOf(next)}`);
    else if (next.length > USE_DEPTH) say(`use ${quoted(id)} nests past ${USE_DEPTH} deep: ${pathOf(next)}`);
    else {
      const theirs = resolve(id);
      if (theirs === null) say(`No fragment ${quoted(id)} to use${where}`);
      else return [{ id, names, lines: fragmentLines(next, theirs, resolve, say), resolved: true }];
    }
    return [{ id, names, lines: [], resolved: false }];
  });
  return merge(own, used, (_, message) => say(`${message}${where}`), quoted(path.at(-1)!)).lines;
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
  const uses = own.filter((l): l is Line & { use: UseForm } => !!l.use);
  const diagnostics: Diagnostic[] = [];
  const spanOf = (l: Line): Span => {
    const first = l.written.split('\n')[0] ?? '';
    const col = first.search(/\S/);
    return { line: l.line, col: col + 1, len: first.trimEnd().length - col };
  };
  const hashes: (string | null)[] = [];
  const used = uses.map((u): Taken => {
    const { id } = u.use;
    const names = namesOf(u.use);
    const span = spanOf(u);
    const say = (message: string) => diagnostics.push({ severity: 'error', message, span });
    const recorded = locked.find((k) => k.id === id)?.hash;
    const theirs = resolve ? resolve(id, ...(recorded ? [recorded] : [])) : null;
    if (theirs === null) {
      say(resolve ? `No fragment ${quoted(id)} to use` : `No library to use ${quoted(id)} from: compileSource(text, env, { resolve })`);
      hashes.push(null);
      return { id, names, lines: [], resolved: false };
    }
    const hash = fragmentHash(theirs);
    hashes.push(hash);
    if (recorded && recorded !== hash) diagnostics.push({ severity: 'warning', message: `${quoted(id)} has changed since this piece was saved: its current version plays`, span });
    return { id, names, lines: fragmentLines([id], theirs, resolve!, say), resolved: true };
  });
  const merged = merge(own, used, (i, message) => diagnostics.push({ severity: 'error', message, span: spanOf(uses[i]!) }), 'the piece');
  // (a use that adds nothing says so: what it names the piece defines, or an earlier use of its id took it all)
  uses.forEach((u, i) => {
    const { gave, overrode } = merged.per[i]!;
    if (!used[i]!.resolved) return;
    const warn = (message: string) => diagnostics.push({ severity: 'warning', message, span: spanOf(u) });
    const { id, names } = u.use;
    const earlier = uses.findIndex((v) => v.use.id === id);
    if (!gave.length && earlier < i) warn(`${quoted(id)} is used already, on line ${uses[earlier]!.line}: this use adds nothing`);
    else if (names) for (const n of overrode) warn(`The piece defines ${n}, so taking it from ${quoted(id)} adds nothing`);
    else if (!gave.length && overrode.length) warn(`The piece defines all ${quoted(id)} gives (${overrode.join(', ')}): this use adds nothing`);
  });
  // (the used lines after the piece's, each remembering the use it came through)
  const head = text.split('\n').length;
  const from = new Map<Line, number>(used.flatMap((u, i) => u.lines.map((l) => [l, i] as const)));
  const added = merged.lines.filter((l) => from.has(l));
  const through: Span[] = [];
  for (const l of added) for (let k = l.written.split('\n').length; k > 0; k--) through.push(spanOf(uses[from.get(l)!]!));
  return {
    text: added.length ? [text, ...added.map((l) => l.written)].join('\n') : text,
    uses: uses.map((u, i) => ({ id: u.use.id, names: u.use.names, span: spanOf(u), hash: hashes[i] ?? null, gave: merged.per[i]!.gave, overrode: merged.per[i]!.overrode })),
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
