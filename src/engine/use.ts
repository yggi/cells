/**
 * `use` (decisions 054, 059): a fragment's lines taken into a piece, by its id. What the compiler reads, the
 * **expansion**, is the piece's own lines, then the lines each `use` takes that the piece doesn't define, in the order
 * the `use` lines are written; a used fragment that uses others is expanded first, its own lines winning over theirs.
 *
 * - `use * from gm_kit` takes every line (`use "gm_kit"`, the old way, is the same, and warns); `use &bd, &sd from
 *   gm_kit` takes the named cells and the fragment's lines they read, their closure (the names they write, `&x`,
 *   followed within the fragment: what the closure takes and the use doesn't name are the fragment's helpers); `use
 *   &aeolian` is `use &aeolian from aeolian`.
 * - A name the use asks for and the fragment doesn't define is an error naming the ones it does; a name it asks for
 *   that the piece defines is the piece's (it overrides), and says the use of it adds nothing, unless a line the use
 *   takes reads it (a helper named to override it: `use &bass, &bassV from …`); a helper the piece defines and the use
 *   doesn't name is an error (decision 059: a helper is the fragment's, and the piece's line would change what it reads),
 *   but an interface name (`&key`, `&bar` …: `INTERFACE_NAMES`), which is the piece's, read by the fragment's line (decision 060).
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
 * `from` lines (decision 064) are read here too. One that takes from a fragment with no signature, a collection (`&bd, &sd
 * from gm_kit`, `* from gm_kit`), is the `use` of those names. One that takes from a fragment with a signature, a
 * template (`&key from harmonic_minor D`), is a copy of it (`instantiate`): its head named as the line names it, its
 * parameters bound to the arguments, every other name it defines private to the copy, and what it took from collections
 * shared by name; the copy's lines are the level's own, as if written there.
 *
 * `expand` writes the expansion out (Cell studio's "write out"); `expansion` is what `compileSource` reads. Pure.
 */
import { splitComment } from './edit';
import { FROM_FORM, isAttribute, readFrom, readUse, topTokens, USE_FORM, type FromForm, type UseForm } from './parser/use';
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
  /** Its `from` (decision 064), read; null for a malformed one, undefined for a line that isn't one. */
  readonly from?: FromForm | null | undefined;
  /** Did it come from a collection (a `use`, a `from` without a signature)? Its names are shared, never a copy's own. */
  readonly shared?: boolean;
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
    if (whole) out.push(lineOf(whole, carry.written.join('\n'), carry.line));
    carry = null;
  });
  return out;
}

/** A line of code, read: the cell it declares and what it reads, or its `use` or `from`. */
function lineOf(code: string, written = code, line = 0): Line {
  const use = readUse(code);
  const from = use === undefined ? readFrom(code) : undefined;
  if (use !== undefined || from !== undefined) return { name: null, use, from, reads: [], written, code, line };
  const head = HEAD.exec(code);
  const reads = head ? [...new Set([...code.slice(head[0].length).matchAll(READS)].map((m) => m[1]!))] : [];
  return { name: head?.[1] ?? null, use, reads, written, code, line };
}

/** Does this text have a `use` or a `from` line? (Cheap: a text without one compiles as it always has.) */
export const hasUse = (text: string): boolean => /^\s*use(?![A-Za-z0-9_])/m.test(text) || /^\s*(?:\*|&[A-Za-z_][A-Za-z0-9_]*)(?=[\s,]).*\sfrom(?:\s|$)/m.test(text);

/** A fragment's signature (decision 064): what its `from` line with no id declares; null for a collection, which has none. */
export function signatureOf(text: string): Extract<FromForm, { kind: 'signature' }> | null {
  for (const l of linesOf(text)) if (l.from?.kind === 'signature') return l.from;
  return null;
}

/** A fragment's text without its signature: its lines, as a host that puts them on a workbench by hand reads them. */
export const bodyOf = (text: string): string =>
  text
    .split('\n')
    .filter((raw) => readFrom(splitComment(raw)[0].trim())?.kind !== 'signature')
    .join('\n');

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
  /** A template's parameters (bare), where a `use` line takes it the old way: the piece's own of these names are its arguments. */
  readonly parameters?: ReadonlySet<string>;
}

/** What a level of the expansion gave: its lines, and, for each of its `use` lines, what that gave and what was overridden. */
interface Merged {
  readonly lines: readonly Line[];
  readonly per: readonly { readonly gave: readonly string[]; readonly overrode: readonly string[]; readonly read: readonly string[] }[];
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
  const per = used.map(({ id, names, lines: theirs, resolved, parameters }, i) => {
    const byName = new Map<string, Line>();
    for (const l of theirs) if (l.name && !byName.has(l.name)) byName.set(l.name, l);
    if (names && resolved) {
      const lacking = [...names].filter((n) => !byName.has(n));
      for (const n of lacking) say(i, `&${n} is not in ${quoted(id)}: it defines ${[...byName.keys()].map((m) => `&${m}`).join(', ')}`);
    }
    // (all of it, `*`: but a line the fragment's own lines read, where every one that reads it the level overrides, goes
    // with them, as a helper of the overridden line: `use * from "4/4 swung on 8n"` under the piece's own &bar takes no &swing)
    const shadowed = new Set<string>();
    if (!names)
      for (let more = true; more;) {
        more = false;
        for (const n of byName.keys()) {
          if (defined.has(n) || shadowed.has(n)) continue;
          const readers = theirs.filter((l) => l.name && l.name !== n && l.reads.includes(n));
          if (readers.length && readers.every((l) => defined.has(l.name!) || shadowed.has(l.name!))) {
            shadowed.add(n);
            more = true;
          }
        }
      }
    const asked = names ?? new Set([...byName.keys()].filter((n) => !shadowed.has(n)));
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
        // (an interface name the level defines is the level's: what the fragment's line reads, as the main key was, decision
        // 060; and so is a template's parameter, taken the old way: the level's line is its argument, decision 064)
        else if (INTERFACE.has(r) || parameters?.has(r)) continue;
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
    // (an override a taken line reads changes what it plays: the use of it is the override, not a use that adds nothing)
    const read = overrode.filter((n) => [...take].some((t) => byName.get(t)!.reads.includes(n.slice(1))));
    return { gave: [...gave], overrode, read };
  });
  return { lines, per };
}

/** A use's names, bare, or null for all: a `use` line's, or a `from` line's. */
const namesOf = (u: { readonly names: readonly string[] | null }): ReadonlySet<string> | null => (u.names ? new Set(u.names.map((n) => n.slice(1))) : null);

/** A `from` line that takes from a fragment (decision 064). */
type FromUse = Extract<FromForm, { kind: 'use' }>;

/** The use a line makes, a `use` line's or a `from` line's: the fragment's id and what it asks for; null for none. */
const entryOf = (l: Line): { readonly id: string; readonly names: readonly string[] | null; readonly from: FromUse | null } | null =>
  l.use ? { id: l.use.id, names: l.use.names, from: null } : l.from?.kind === 'use' ? { id: l.from.id, names: l.from.names, from: l.from } : null;

/** A line's references renamed (`&tonic` → `&key_tonic`), what the double quotes hold left as written. */
const renamed = (code: string, names: ReadonlyMap<string, string>): string =>
  code.replace(/"[^"]*"|&([A-Za-z_][A-Za-z0-9_]*)/g, (m: string, n?: string) => (n && names.has(n) ? `&${names.get(n)}` : m));

/** An attribute's key (`step` of `step=8n`). */
const keyOf = (attribute: string) => attribute.slice(0, attribute.indexOf('='));

/** A line with these attributes set (`label="…"`), the line's own of the same keys dropped: the rest inherited. */
function withAttributes(code: string, attributes: readonly string[]): string {
  const keys = new Set(attributes.map(keyOf));
  const [name, ...rest] = topTokens(code).map((t) => t.text);
  return [name!, ...rest.filter((t) => !(isAttribute(t) && keys.has(keyOf(t)))), ...attributes].join(' ');
}

/**
 * A value argument's line (decision 064 §6): its default's attributes where it sets none, and its own braid, the
 * default's dropped whole.
 */
function inherited(name: string, defaultCode: string, body: string): string {
  const set = new Set(topTokens(body).flatMap((t) => (isAttribute(t.text) ? [keyOf(t.text)] : [])));
  const kept = topTokens(defaultCode)
    .slice(1)
    .flatMap((t) => (isAttribute(t.text) && !set.has(keyOf(t.text)) ? [t.text] : []));
  return [`&${name}`, ...kept, body].join(' ');
}

/** The attributes that read a cell as that attribute alone (`step=&tempo`: a rate alone, `swing=&swing`: a swing alone). */
const ALONE = new Set(['step', 'loop', 'swing']);

/**
 * An argument as the cell it fills (decision 064 §5): a body as written, or, where it has no attribute and the template
 * reads the parameter only through one attribute that reads a cell as that attribute alone (`step=&tempo`,
 * `swing=&swing`), that attribute set to it (`124bpm` is `step=124bpm`, a rate alone).
 */
function asCell(body: string, parameter: string, lines: readonly Line[]): string {
  if (topTokens(body).some((t) => isAttribute(t.text))) return body;
  const keys = new Set<string>();
  let other = false;
  const ref = new RegExp(`&${parameter}(?![A-Za-z0-9_])`);
  for (const l of lines)
    for (const t of topTokens(l.code).slice(1)) {
      if (!ref.test(t.text)) continue;
      const read = new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)=&${parameter}(?![A-Za-z0-9_])`).exec(t.text);
      if (read) keys.add(read[1]!);
      else other = true;
    }
  const [key] = keys;
  return keys.size === 1 && !other && ALONE.has(key!) ? `${key}=${body}` : body;
}

/**
 * Does a line read this name as a value, not as a sound: in an attribute (`over=&key`, `step=&tempo`), a generator's or
 * an operation's arguments (`scale(dorian, &tonic)`), or through an operator (`&call^-2`, `&g[0:3]`)? A step of a braid
 * or a term of a mix (`&bd`, `&cp:0:.6`, `[&kick * &level]`) is a sound: the kit's vocabulary, read by name (decision 064 §3).
 */
function readsAsValue(code: string, name: string): boolean {
  const stack: ('call' | 'lambda' | 'group')[] = [];
  const attribute: boolean[] = [false];
  let quoted = false;
  let tokenStart = true;
  for (let i = 0; i < code.length; i++) {
    const c = code[i]!;
    if (c === '"') quoted = !quoted;
    if (quoted || c === '"') continue;
    const body = stack.every((k) => k === 'lambda');
    if (/\s/.test(c)) {
      if (body) attribute[attribute.length - 1] = false;
      tokenStart = true;
      continue;
    }
    if (tokenStart && body && /^[A-Za-z_][A-Za-z0-9_]*=/.test(code.slice(i))) attribute[attribute.length - 1] = true;
    tokenStart = false;
    if (c === '(') {
      const before = code[i - 1] ?? '';
      const kind = before === '&' ? 'lambda' : /[A-Za-z0-9_]/.test(before) ? 'call' : 'group';
      stack.push(kind);
      if (kind === 'lambda') {
        attribute.push(attribute.at(-1)!);
        tokenStart = true;
      }
      continue;
    }
    if (c === ')') {
      if (stack.pop() === 'lambda') attribute.pop();
      continue;
    }
    if (c !== '&') continue;
    const m = /^&([A-Za-z_][A-Za-z0-9_]*)/.exec(code.slice(i));
    if (m?.[1] !== name) continue;
    const after = code[i + m[0].length];
    if (attribute.some(Boolean) || stack.includes('call') || after === '^' || after === '[') return true;
  }
  return false;
}

/** What a use gives a level: the lines it takes, shared by name, and, from a template, a copy of its own. */
interface Given {
  readonly taken: Taken;
  readonly copy: readonly Line[];
  readonly args?: Readonly<Record<string, string>>;
}

/** Lines that came through a collection: their names are shared, never a copy's own. */
const sharedLines = (lines: readonly Line[]): Line[] => lines.map((l) => (l.shared ? l : { ...l, shared: true }));

/**
 * What a use of a resolved fragment gives (`path`: the ids that led here, this one last; `taken`: the names the level
 * holds, which a copy's own names stay clear of). A fragment with no signature is a collection, its lines taken by name;
 * with one, a `from` line takes a copy (`instantiate`), and a `use` line its lines as they are, its parameters read by
 * name as before (the old way).
 */
function give(entry: NonNullable<ReturnType<typeof entryOf>>, path: readonly string[], text: string, resolve: Resolve, say: (message: string) => void, taken: Set<string>): Given {
  const { id, from } = entry;
  const signatures = linesOf(text).flatMap((l) => (l.from?.kind === 'signature' ? [l.from] : []));
  if (!from || !signatures.length) {
    if (from && (from.head.length || from.args || from.main !== null))
      say(
        `${quoted(id)} has no signature, so it takes no arguments: a collection gives the cells it defines by name (${entry.names ? entry.names.join(', ') : '*'} from ${from.id})`,
      );
    const parameters = new Set(signatures.flatMap((g) => [...g.optional, ...(g.main ? [g.main] : [])]).map((n) => n.slice(1)));
    const lines = sharedLines(fragmentLines(path, text, resolve, say));
    return { taken: { id, names: namesOf(entry), lines, resolved: true, ...(parameters.size ? { parameters } : {}) }, copy: [] };
  }
  if (signatures.length > 1) say(`${quoted(id)} has ${signatures.length} signatures: a fragment has one (&head from (&optional) &main)`);
  return instantiate(from, id, signatures[0]!, path, text, resolve, say, taken);
}

/**
 * A copy of a template (decision 064): its head named as the line names it, its parameters bound to the arguments (a
 * bare reference is that cell; anything else a cell of the copy's, a named one its default changed where it says), and
 * every other name it defines its own, `&<head>_<name>`. What it took from collections is shared by name. What it reads
 * and neither defines nor declares, but as a sound, is an error.
 */
function instantiate(
  from: FromUse,
  id: string,
  signature: Extract<FromForm, { kind: 'signature' }>,
  path: readonly string[],
  text: string,
  resolve: Resolve,
  say: (message: string) => void,
  taken: Set<string>,
): Given {
  const full = fragmentLines(path, text, resolve, say);
  const own = full.filter((l) => !l.shared && l.name);
  const shared = full.filter((l) => l.shared && l.name);
  const definesOwn = new Set(own.map((l) => l.name!));
  const defines = new Set(full.flatMap((l) => (l.name ? [l.name] : [])));
  const bare = (n: string) => n.slice(1);
  const heads = signature.names.map(bare);
  const optional = signature.optional.map(bare);
  const main = signature.main ? bare(signature.main) : null;
  for (const h of heads) if (!definesOwn.has(h)) say(`${quoted(id)}'s signature names &${h} its head, and it doesn't define it`);
  for (const o of optional) if (!definesOwn.has(o)) say(`${quoted(id)}'s &${o} is an optional parameter: its line in the fragment is its default, and it has none`);
  if (main && defines.has(main)) say(`${quoted(id)}'s &${main} is its main parameter: it has no line, the argument is it`);
  // (the heads the line takes: one renamed as the line names it, several by their names)
  const names = new Map<string, string>();
  if (from.names?.length === 1 && heads.length === 1) names.set(heads[0]!, bare(from.names[0]!));
  else
    for (const n of from.names?.map(bare) ?? heads) {
      if (heads.includes(n)) names.set(n, n);
      else say(`&${n} is not a head of ${quoted(id)}: its head${heads.length > 1 ? 's are' : ' is'} ${heads.map((h) => `&${h}`).join(', ')}`);
    }
  const one = names.size === 1;
  if (from.head.length && !one) say(`The attributes before from are the head's, and this line takes ${names.size} heads from ${quoted(id)}: write them on each head's own line`);
  // (the arguments: a bare reference is that cell, anything else a cell of the copy's)
  const args = new Map((from.args ?? []).map((a) => [a.name, a.value] as const));
  for (const k of args.keys())
    if (!optional.includes(k))
      say(`${quoted(id)} takes no ${k}=: ${optional.length ? `its optional parameters are ${optional.map((o) => `${o}=`).join(', ')}` : 'it has no optional parameters'}`);
  if (main && from.main === null) say(`${quoted(id)} needs its main argument, &${main}, after its id: ${from.names?.[0] ?? `&${heads[0]}`} from ${from.id} …`);
  if (!main && from.main !== null)
    say(`${quoted(id)} takes no main argument: its signature has none (&${heads[0]} from ${signature.optional.length ? `(${signature.optional.join(', ')})` : ''})`);
  const BARE = /^&([A-Za-z_][A-Za-z0-9_]*)$/;
  const values = new Map<string, string>();
  for (const [k, v] of args) if (optional.includes(k)) values.set(k, v);
  if (main && from.main !== null) values.set(main, from.main);
  const byReference = new Set<string>();
  for (const [p, v] of values) {
    const ref = BARE.exec(v);
    if (ref) {
      names.set(p, ref[1]!);
      byReference.add(p);
    }
  }
  // (every other name the copy defines is its own, clear of the level's and of the template's shared ones)
  const prefix = names.get(heads[0]!) ?? [...names.values()][0] ?? heads[0]!;
  for (const n of [...names.values()]) taken.add(n);
  for (const n of [...definesOwn, ...(main ? [main] : [])]) {
    if (names.has(n)) continue;
    let mine = `${prefix}_${n}`;
    for (let k = 2; taken.has(mine) || defines.has(mine); k++) mine = `${prefix}${k}_${n}`;
    taken.add(mine);
    names.set(n, mine);
  }
  // (what it reads and neither defines nor declares, but as a sound, is not the level's to give by name)
  const declared = new Set([...defines, ...(main ? [main] : [])]);
  const undeclared = new Set<string>();
  for (const l of own)
    for (const r of l.reads)
      if (!declared.has(r) && !undeclared.has(r) && readsAsValue(l.code, r)) {
        undeclared.add(r);
        say(`${quoted(id)}'s &${l.name} reads &${r}, which it neither defines nor declares: name it in its signature (&${heads[0]} from (&${r}) …), or define it`);
      }
  const copy: Line[] = [];
  for (const l of own) {
    const p = l.name!;
    if (byReference.has(p)) continue;
    let code = renamed(l.code, names);
    if (values.has(p)) code = inherited(names.get(p)!, code, asCell(values.get(p)!, p, own));
    if (heads.includes(p) && from.head.length && one) code = withAttributes(code, from.head);
    copy.push(lineOf(code));
  }
  if (main && from.main !== null && !byReference.has(main)) copy.push(lineOf(`&${names.get(main)!} ${asCell(from.main, main, own)}`));
  const given = { id, names: new Set(shared.map((l) => l.name!)), lines: shared, resolved: true };
  return { taken: given, copy, args: Object.fromEntries(values) };
}

/** A used fragment's lines, its own uses expanded (`path`: the ids that led here, this one last), or none where it can't be. */
function fragmentLines(path: readonly string[], text: string, resolve: Resolve, say: (message: string) => void): readonly Line[] {
  const own = linesOf(text);
  const where = ` (in ${pathOf(path)})`;
  const sayHere = (message: string) => say(`${message}${where}`);
  const taken = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  const copies: Line[] = [];
  const used = own.flatMap((l): Taken[] => {
    if (l.use === null || l.from === null) {
      sayHere(l.use === null ? USE_FORM : FROM_FORM);
      return [];
    }
    const entry = entryOf(l);
    if (!entry) return [];
    const { id } = entry;
    const names = namesOf(entry);
    const next = [...path, id];
    if (path.includes(id)) say(`use ${quoted(id)} is a cycle: ${pathOf(next)}`);
    else if (next.length > USE_DEPTH) say(`use ${quoted(id)} nests past ${USE_DEPTH} deep: ${pathOf(next)}`);
    else {
      const theirs = resolve(id);
      if (theirs === null) sayHere(`No fragment ${quoted(id)} to use`);
      else {
        const g = give(entry, next, theirs, resolve, say, taken);
        copies.push(...g.copy);
        return [g.taken];
      }
    }
    return [{ id, names, lines: [], resolved: false }];
  });
  return merge([...own, ...copies], used, (_, message) => sayHere(message), quoted(path.at(-1)!)).lines;
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

/** The expansion of a text (see the module's comment), its `use` and `from` lines resolved by `options`. */
export function expansion(text: string, { resolve, locked = [] }: CompileOptions = {}): Expansion {
  const own = linesOf(text);
  const uses = own.flatMap((l) => {
    const entry = entryOf(l);
    return entry ? [{ line: l, ...entry }] : [];
  });
  const diagnostics: Diagnostic[] = [];
  const spanOf = (l: Line): Span => {
    const first = l.written.split('\n')[0] ?? '';
    const col = first.search(/\S/);
    return { line: l.line, col: col + 1, len: first.trimEnd().length - col };
  };
  const hashes: (string | null)[] = [];
  const copies: (readonly Line[])[] = [];
  const args: (Readonly<Record<string, string>> | undefined)[] = [];
  const taken = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  const used = uses.map((u): Taken => {
    const { id } = u;
    const names = namesOf(u);
    const span = spanOf(u.line);
    const say = (message: string) => diagnostics.push({ severity: 'error', message, span });
    const recorded = locked.find((k) => k.id === id)?.hash;
    const theirs = resolve ? resolve(id, ...(recorded ? [recorded] : [])) : null;
    if (theirs === null) {
      say(resolve ? `No fragment ${quoted(id)} to use` : `No library to use ${quoted(id)} from: compileSource(text, env, { resolve })`);
      hashes.push(null);
      copies.push([]);
      args.push(undefined);
      return { id, names, lines: [], resolved: false };
    }
    const hash = fragmentHash(theirs);
    hashes.push(hash);
    if (recorded && recorded !== hash) diagnostics.push({ severity: 'warning', message: `${quoted(id)} has changed since this piece was saved: its current version plays`, span });
    const g = give(u, [id], theirs, resolve!, say, taken);
    copies.push(g.copy);
    args.push(g.args);
    return g.taken;
  });
  const merged = merge([...own, ...copies.flat()], used, (i, message) => diagnostics.push({ severity: 'error', message, span: spanOf(uses[i]!.line) }), 'the piece');
  // (a use that adds nothing says so: what it names the piece defines, or an earlier use of its id took it all; a copy
  // of a template always adds its own)
  uses.forEach((u, i) => {
    const { gave, overrode, read } = merged.per[i]!;
    if (!used[i]!.resolved || args[i]) return;
    const warn = (message: string) => diagnostics.push({ severity: 'warning', message, span: spanOf(u.line) });
    const { id, names } = u;
    const earlier = uses.findIndex((v) => v.id === id && !args[uses.indexOf(v)]);
    if (!gave.length && earlier < i) warn(`${quoted(id)} is used already, on line ${uses[earlier]!.line.line}: this use adds nothing`);
    else if (names) for (const n of overrode.filter((o) => !read.includes(o))) warn(`The piece defines ${n}, so taking it from ${quoted(id)} adds nothing`);
    else if (!gave.length && overrode.length) warn(`The piece defines all ${quoted(id)} gives (${overrode.join(', ')}): this use adds nothing`);
  });
  // (the used lines after the piece's, each remembering the use it came through: a copy's first, then what was taken)
  const head = text.split('\n').length;
  const from = new Map<Line, number>([...copies.flatMap((c, i) => c.map((l) => [l, i] as const)), ...used.flatMap((u, i) => u.lines.map((l) => [l, i] as const))]);
  const added = merged.lines.filter((l) => from.has(l));
  const through: Span[] = [];
  for (const l of added) for (let k = l.written.split('\n').length; k > 0; k--) through.push(spanOf(uses[from.get(l)!]!.line));
  return {
    text: added.length ? [text, ...added.map((l) => l.written)].join('\n') : text,
    uses: uses.map((u, i) => {
      const copied = copies[i]!.filter((l) => from.get(l) === i && l.name).map((l) => `&${l.name}`);
      const visible = args[i] ? (u.names ?? []).filter((n) => copied.includes(n)) : [];
      return {
        id: u.id,
        names: u.names,
        span: spanOf(u.line),
        hash: hashes[i] ?? null,
        gave: args[i] ? [...new Set([...visible, ...copied, ...merged.per[i]!.gave])] : merged.per[i]!.gave,
        overrode: merged.per[i]!.overrode,
        ...(args[i] ? { args: args[i] } : {}),
      };
    }),
    // (a copy's lines are the piece's own, as if written there: the built-in card hears them; what was taken by name isn't)
    given: new Set(added.flatMap((l) => (l.name && l.shared ? [l.name] : []))),
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
    .filter((raw, i) => (readUse(splitComment(raw)[0]) === undefined && readFrom(splitComment(raw)[0])?.kind !== 'use') || kept.has(i + 1))
    .join('\n');
  const added = x.text.split('\n').slice(text.split('\n').length);
  return [own.replace(/\s+$/, ''), ...added].join('\n') + (text.endsWith('\n') ? '\n' : '');
}
