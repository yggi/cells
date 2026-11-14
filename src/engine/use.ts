/**
 * `from` lines (decision 065; collections as decisions 054 and 059 ruled them): a fragment's lines taken into a piece, by
 * its id. What the compiler reads, the **expansion**, is the piece's own lines, then what each `from` line takes, in the
 * order they are written; a fragment that takes from others is expanded first, its own lines winning over theirs.
 *
 * - **From a collection** (a fragment with no signature): `* from gm_kit` takes every line; `&bd, &sd from gm_kit` the
 *   named cells and the fragment's lines they read, their closure (the names they write, `&x`, followed within the
 *   fragment: what the closure takes and the line doesn't name are the fragment's helpers). A name it asks for and the
 *   fragment doesn't define is an error naming the ones it does; a name it asks for that the piece defines is the
 *   piece's (it overrides), and says the line adds nothing, unless a line it takes reads it; a helper the piece defines
 *   and the line doesn't name is an error (decision 059: a helper is the fragment's, and the piece's line would change
 *   what it reads). No name is the piece's by convention (decision 075).
 * - **From a template** (a fragment with a signature: `&key from harmonic_minor D`): a copy of it (`instantiate`), its
 *   head named as the line names it, its parameters bound to the arguments, every other name it defines private to the
 *   copy, and what it took from collections shared by name; the copy's lines are the level's own, as if written there.
 * - A line two collections give word for word (its code: comments aside, whitespace collapsed) is one line; a name they
 *   define by different lines, and the piece doesn't, is an error naming it and both ids.
 * - A line renames what it takes, `&new=old` (decision 075 §3a–b): `&kick=bd from gm_kit` gives the kit's `&bd` as the
 *   piece's `&kick`, every line it takes reading it so; `&bass2=bass, &bassOut2=bassOut from bass_performer &l` a
 *   template's heads. The fragment's name is a word of the line, as a keyword is.
 * - A line taken twice from one id is taken once, at its first line; a line that then takes nothing says so.
 * - A cycle is an error naming it, and so is a depth past `FROM_DEPTH`; an unresolved id is an error naming it, and the
 *   piece's other lines compile as they would without it. Each is said on the piece's line it came through.
 * - Cells resolves nothing itself: the host hands each compile a resolver (`Resolve`), and the hashes its lockfile
 *   recorded (`Locked`); a recorded hash the library no longer gives plays the current version, with a warning.
 * - A fragment's hash is `e2:` and a hash of its text as a piece receives it (`identityText`, decision 089 §8): a
 *   declaration's association left out, a template's private names numbered, its interface by name. Its rung is written
 *   first, so a recorded `e1:` (every line's code, decision 050's E1) is still checked as `e1:` and warns no piece.
 * - A `use` line is retired (#588): the parser says so, and the expansion reads it as nothing.
 *
 * `expand` writes the expansion out (Cell studio's "write out"); `expansion` is what `compileSource` reads. Pure.
 */
import { splitComment } from './edit';
import { FROM_FORM, HEAD_FLAGS, isAttribute, readFrom, topTokens, type FromForm } from './parser/use';
import { counts } from './core/desugar';
import type { Diagnostic, Span } from './ast';
import { STYLE } from './style';
import { MOVED, RENAMED_IDS } from './renamed';
import { BOUND_BY_NAME, byNameMessage } from './byname';
import type { CompileOptions, Origin, Resolve, Take } from './program';

/** How deep `from` lines nest: a kit in a groove in a section in a piece is 3. */
export const FROM_DEPTH = 8;

/** A line of a text, as the parser groups them (a line and those it continues onto). */
interface Line {
  /** The cell it declares (bare), or null for a `from` line or a line that declares none. */
  readonly name: string | null;
  /** Its `from` (decision 065), read; null for a malformed one, undefined for a line that isn't one. */
  readonly from?: FromForm | null | undefined;
  /** Did it come from a collection (a `from` of a fragment without a signature)? Its names are shared, never a copy's own. */
  readonly shared?: boolean;
  /** The names its code writes after its head (`&x`, bare): what it reads. */
  readonly reads: readonly string[];
  /** As written, its physical lines joined. */
  readonly written: string;
  /** Its code: comments aside, whitespace collapsed. */
  readonly code: string;
  /** Its first line, 1-based. */
  readonly line: number;
  /** Where it came from, outermost first (#639): a fragment's line, each line that took it on before it; none for a level's own. */
  readonly origin?: readonly Origin[];
}

/** The lines, each with a step before its origin: the `from` line they came through. */
const via = (lines: readonly Line[], step: Origin): Line[] => lines.map((l) => ({ ...l, origin: [step, ...(l.origin ?? [])] }));

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

/** A line of code, read: the cell it declares and what it reads, or its `from`. */
function lineOf(code: string, written = code, line = 0): Line {
  const from = readFrom(code);
  if (from !== undefined) return { name: null, from, reads: [], written, code, line };
  const head = HEAD.exec(code);
  const reads = head ? [...new Set([...code.slice(head[0].length).matchAll(READS)].map((m) => m[1]!))] : [];
  return { name: head?.[1] ?? null, reads, written, code, line };
}

/**
 * A part of a document (decision 082): the signature that names `head` (bare), then every line its heads and optional
 * parameters read, wherever it sits, taken through the closure as a collection's names are; never its main parameter's
 * line (the document's own, what it plays with as a piece), nor another signature's. A text of one signature is its
 * own part. Null where no signature names the head.
 */
export function partOf(text: string, head: string): string | null {
  const lines = linesOf(text);
  const sigs = lines.flatMap((l) => (l.from?.kind === 'signature' ? [{ line: l, sig: l.from }] : []));
  const found = sigs.find((s) => s.sig.names.includes(`&${head}`));
  if (!found) return null;
  if (sigs.length === 1) return text;
  const { line: sigLine, sig } = found;
  const main = sig.main ? sig.main.slice(1) : null;
  const defines = new Map<string, Line>();
  for (const l of lines) {
    if (l.name) defines.set(l.name, l);
    else if (l.from?.kind === 'use') for (const n of l.from.names ?? []) defines.set(n.slice(1), l);
  }
  // (what a from line reads: the names its arguments write, past what it takes)
  const readsOf = (l: Line) => (l.from?.kind === 'use' ? [...l.code.slice(l.code.search(/\sfrom\s/)).matchAll(READS)].map((m) => m[1]!) : l.reads);
  const keep = new Set<Line>();
  const seen = new Set<string>();
  for (const queue = [...sig.names, ...sig.optional].map((n) => n.slice(1)); queue.length;) {
    const n = queue.shift()!;
    if (seen.has(n) || n === main) continue;
    seen.add(n);
    const l = defines.get(n);
    if (!l || keep.has(l)) continue;
    keep.add(l);
    queue.push(...readsOf(l));
  }
  return [sigLine.written.trim(), ...lines.filter((l) => keep.has(l)).map((l) => l.written)].join('\n');
}

/** A line that takes a fragment over a name (#692): the id it takes and its named arguments, as written (`ternary`, `{ answer: '&wonder' }`). */
export interface UseOver {
  readonly id: string;
  readonly args: Readonly<Record<string, string>>;
}

/**
 * Each line of a text that takes a fragment with `&head` as its main argument (attributes on it aside), in the order written (#692): how a
 * document plays its part, such as Kinderlieder's `&twinkleSong from ternary(answer=&wonder) &twinkle`, which takes
 * `ternary` over `&twinkle`, `&wonder` its answer.
 */
export const usesIn = (text: string, head: string): UseOver[] =>
  linesOf(text).flatMap((l) =>
    l.from?.kind === 'use' && l.from.main?.trim().split(/\s+/).at(-1) === `&${head}`
      ? [{ id: l.from.id, args: Object.fromEntries((l.from.args ?? []).map((a) => [a.name, a.value.trim()])) }]
      : [],
  );

/** The heads of each signature a text holds, in the order written: one entry a part (decision 082). */
export const partsOf = (text: string): string[][] => linesOf(text).flatMap((l) => (l.from?.kind === 'signature' ? [l.from.names.map((n) => n.slice(1))] : []));

/**
 * What a take reads of a document (decision 082): the part its line names by its first head, or the text as it is for a
 * file of one signature or none. Says, and gives null, where the line names no part's head or takes `*` from a document.
 */
function pickPart(id: string, text: string, from: FromUse, say: (message: string) => void): { text: string; part?: string } | null {
  const parts = partsOf(text);
  if (parts.length < 2) return { text };
  const heads = parts.map((p) => p.map((h) => `&${h}`).join(', ')).join(' · ');
  const asked = (from.takes ?? from.names)?.[0]?.slice(1);
  if (!asked) {
    say(`${quoted(id)} gives ${parts.length} parts, each taken by its head (${heads}): name one, not *`);
    return null;
  }
  const part = partOf(text, asked);
  if (part === null) {
    say(`${quoted(id)} gives no part headed &${asked}: its parts are ${heads}`);
    return null;
  }
  return { text: part, part: asked };
}

/** Does this text have a `from` line? (Cheap: a text without one compiles as it always has.) */
export const hasFrom = (text: string): boolean => /^\s*(?:\*|&[A-Za-z_][A-Za-z0-9_]*)(?=[\s,=]).*\sfrom(?:\s|$)/m.test(text);

/** A fragment's signature (decision 065): what its `from` line with no id declares; null for a collection, which has none. */
/** The heads every signature line of a text names (`&cycle from &day` gives `&cycle`): the cells a template defines. */
export const signatureHeads = (text: string): string[] =>
  text.split('\n').flatMap((line) => {
    const form = readFrom(splitComment(line)[0].trim());
    return form?.kind === 'signature' ? form.names : [];
  });

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

/** A fragment's `e1:` hash: its text up to layout (its lines' code, one to a line; decision 050's E1). What lockfiles recorded before decision 089. */
export const fragmentHashE1 = (text: string): string =>
  `e1:${hash64(
    linesOf(text)
      .map((l) => l.code)
      .join('\n'),
  )}`;

/**
 * A line of code without the association a declaration carries (decision 089): a signature's attributes after `from`
 * (`style=`, `facet=`, a template's arguments at its points), and nothing of a collection's `* from` line with no id,
 * which is all association. Any other line as it is.
 */
function withoutAssociation(code: string): string | null {
  const tokens = topTokens(code);
  const from = tokens.findIndex((t) => t.text === 'from');
  if (from < 1) return code;
  const after = tokens.slice(from + 1);
  if (tokens[0]!.text === '*' && from === 1 && after.every((t) => isAttribute(t.text))) return null;
  // (a signature: its parameters or its main name after `from`, no id; the rest are its declaration's attributes)
  if (after.length && !after[0]!.text.startsWith('(') && !after[0]!.text.startsWith('&') && !isAttribute(after[0]!.text)) return code;
  const kept = after.filter((t) => !isAttribute(t.text));
  if (kept.length === after.length) return code;
  return [...tokens.slice(0, from + 1), ...kept].map((t) => t.text).join(' ');
}

/** A name a line writes, `&name`. */
const WRITTEN = /&([A-Za-z_][A-Za-z0-9_]*)/g;

/**
 * A fragment as a piece receives it (decision 089 §8; the note 405's "E2 corrected"): its lines' code (comments aside,
 * whitespace collapsed), each declaration's association left out (`withoutAssociation`) and a declaration written twice
 * once; a template's own names numbered in the order it declares them (`&#1`, `&#2`), but those its signature declares
 * (its heads and parameters, what a piece names); a collection's cells by their names, since a piece takes them by name
 * (`&bd from gm_kit`); and each run counted as the core counts it (`x x` as `x!2`, decision 077 §3). What `e2:` hashes.
 * Normalise's respellings (E3) are a later rung: they need the fragment compiled, and a hash is read while one compiles.
 */
export function identityText(text: string): string {
  const seen = new Set<string>();
  const lines = linesOf(text).flatMap((l) => {
    const code = withoutAssociation(l.code);
    if (code === null) return [];
    if (readFrom(code) !== undefined && seen.has(code)) return [];
    seen.add(code);
    return [{ code, name: l.name }];
  });
  // (the signature as the lines read once their association is out: one with `style=` reads so only from decision 089's move on)
  const signature = signatureOf(lines.map((l) => l.code).join('\n'));
  const kept = new Set(signature ? [...signature.names, ...signature.optional, ...(signature.main ? [signature.main] : [])].map((n) => n.slice(1)) : []);
  const own = signature ? [...new Set(lines.flatMap((l) => (l.name && !kept.has(l.name) ? [l.name] : [])))] : [];
  const index = new Map(own.map((name, i) => [name, i + 1]));
  return counts(lines.map((l) => l.code).join('\n'))
    .split('\n')
    .map((code) => code.replace(WRITTEN, (written, name: string) => (index.has(name) ? `&#${index.get(name)}` : written)))
    .join('\n');
}

/** A fragment's hash: `e2:` and the hash of its text as a piece receives it (`identityText`, decision 089 §8). */
export const fragmentHash = (text: string): string => `e2:${hash64(identityText(text))}`;

/** Whether a recorded hash is a text's: an `e1:` read as `e1:` (what a lockfile wrote before decision 089), any other as `e2:`. */
export const hashIs = (recorded: string, text: string): boolean => recorded === (recorded.startsWith('e1:') ? fragmentHashE1(text) : fragmentHash(text));

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

/** What a level of the expansion gave: its lines, and, for each of its `from` lines, what that gave and what was overridden. */
interface Merged {
  readonly lines: readonly Line[];
  readonly per: readonly { readonly gave: readonly string[]; readonly overrode: readonly string[]; readonly read: readonly string[] }[];
}

/**
 * A level's own lines, then the lines each use takes that its own don't define, in order: a line given word for word
 * twice kept once, a name given by different lines an error (said by `say`, with the index of the `use` that gave it
 * second), and so are a name asked for that the fragment lacks and a helper the level defines (`host` names the level).
 */
function merge(own: readonly Line[], used: readonly Taken[], say: (i: number, message: string) => void, host: string): Merged {
  const defined = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  // (what the level's own lines read: a helper of a line it overrides that its own line reads too goes on being given)
  const readHere = new Set(own.flatMap((l) => l.reads));
  const given = new Map<string, { id: string; code: string }>();
  const lines: Line[] = own.filter((l) => l.name);
  const per = used.map(({ id, names, lines: theirs, resolved }, i) => {
    const byName = new Map<string, Line>();
    for (const l of theirs) if (l.name && !byName.has(l.name)) byName.set(l.name, l);
    if (names && resolved) {
      const lacking = [...names].filter((n) => !byName.has(n));
      for (const n of lacking) say(i, `&${n} is not in ${quoted(id)}: it defines ${[...byName.keys()].map((m) => `&${m}`).join(', ')}`);
    }
    // (all of it, `*`: but a line the fragment's own lines read, where every one that reads it the level overrides, goes
    // with them, as a helper of the overridden line: `use * from meter(swing=8n:2/3)` under the piece's own &bar takes no &swing;
    // unless the level's own lines read it, as a line written in the overridden one's place does, word for word)
    const shadowed = new Set<string>();
    if (!names)
      for (let more = true; more;) {
        more = false;
        for (const n of byName.keys()) {
          if (defined.has(n) || shadowed.has(n) || readHere.has(n)) continue;
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
        // (&style, which a fragment may not define at all: said once, below)
        else if (r === STYLE) continue;
        else {
          clashed.add(r);
          say(i, `&${r} is ${quoted(id)}'s, read by its &${n}, and ${host}'s too: rename ${host}'s, or name &${r} in the use to override it`);
        }
      }
    }
    // (the section's style is the composer's: a fragment reads it, a score writes it, decision 063 §3; #391)
    if (byName.has(STYLE))
      say(
        i,
        `&${STYLE} is the composer's, the section's style: ${quoted(id)} defines it, where a fragment only reads it (the score writes &${STYLE} style=…; a reader with none plays the centre)`,
      );
    const gave = new Set<string>();
    for (const l of theirs) {
      if (!l.name || !take.has(l.name)) continue;
      if (l.name === STYLE) continue;
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

/** A `from` line's names, bare, or null for all. */
const namesOf = (u: { readonly names: readonly string[] | null }): ReadonlySet<string> | null => (u.names ? new Set(u.names.map((n) => n.slice(1))) : null);

/** A `from` line that takes from a fragment (decision 065). */
type FromUse = Extract<FromForm, { kind: 'use' }>;

/** The use a `from` line makes: the fragment's id and what it asks for; null for any other line. */
const entryOf = (l: Line): { readonly id: string; readonly names: readonly string[] | null; readonly from: FromUse } | null =>
  l.from?.kind === 'use' ? { id: l.from.id, names: l.from.names, from: l.from } : null;

/** A line's references renamed (`&tonic` → `&key_tonic`), what the double quotes hold left as written. */
const renamed = (code: string, names: ReadonlyMap<string, string>): string =>
  code.replace(/"[^"]*"|&([A-Za-z_][A-Za-z0-9_]*)/g, (m: string, n?: string) => (n && names.has(n) ? `&${names.get(n)}` : m));

/** An attribute's key (`step` of `step=8n`). */
const keyOf = (attribute: string) => attribute.slice(0, attribute.indexOf('='));

/**
 * A line with these attributes set (`label="…"`), the line's own of the same keys dropped: the rest inherited. A flag
 * (`off`, #686) goes after the name, where a cell's line writes it, and once.
 */
function withAttributes(code: string, attributes: readonly string[]): string {
  const flags = attributes.filter((a) => HEAD_FLAGS.has(a));
  const set = attributes.filter((a) => !HEAD_FLAGS.has(a));
  const keys = new Set(set.map(keyOf));
  const [name, ...rest] = topTokens(code).map((t) => t.text);
  return [name!, ...flags, ...rest.filter((t) => !(isAttribute(t) && keys.has(keyOf(t))) && !flags.includes(t)), ...set].join(' ');
}

/**
 * A value argument's line (decision 065 §6): its default's attributes where it sets none, and its own braid, the
 * default's dropped whole.
 */
function inherited(name: string, defaultCode: string, body: string): string {
  const set = new Set(topTokens(body).flatMap((t) => (isAttribute(t.text) ? [keyOf(t.text)] : [])));
  const kept = topTokens(defaultCode)
    .slice(1)
    .flatMap((t) => (isAttribute(t.text) && !set.has(keyOf(t.text)) ? [t.text] : []));
  return [`&${name}`, ...kept, body].join(' ');
}

/**
 * An argument written as an inline cell, `&(map=adsr .002 .3 .5 .06)`, as its body (decision 065 §5: it is a new cell,
 * read as the fragment reads the parameter; #428); anything else as written.
 */
function unwrapped(argument: string): string {
  const v = argument.trim();
  if (!v.startsWith('&(') || !v.endsWith(')')) return argument;
  // (the parenthesis that opens it closes it at the end: `&(a) * &(b)` is two)
  let depth = 0;
  let quoted = false;
  for (let i = 1; i < v.length; i++) {
    const c = v[i]!;
    if (c === '"') quoted = !quoted;
    if (quoted) continue;
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0 && i < v.length - 1) return argument;
  }
  return v.slice(2, -1).trim();
}

/** The attributes that read a cell as that attribute alone (`step=&tempo`: a rate alone, `swing=&swing`: a swing alone). */
const ALONE = new Set(['step', 'loop', 'swing']);

/**
 * An argument as the cell it fills (decision 065 §5): a body as written, or, where it has no attribute and the template
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
 * or a term of a mix (`&bd`, `&cp:0:.6`, `[&kick * &level]`) is a sound: the kit's vocabulary, read by name (decision 065 §3).
 */
export function readsAsValue(code: string, name: string): boolean {
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

/**
 * What a line that renames takes from a collection (`&kick=bd`, decision 075 §3a): the fragment's names to the line's, or
 * null where it renames nothing. A name it takes the fragment lacks is said here (and left out), and so is a name it
 * binds the fragment also gives by another line: the two would be one name.
 */
function renamesOf(from: FromUse, lines: readonly Line[], id: string, say: (message: string) => void): { names: Map<string, string>; lacking: Set<string> } | null {
  if (!from.names || !from.takes || from.takes.every((t, i) => t === from.names![i])) return null;
  const defined = new Set(lines.flatMap((l) => (l.name ? [l.name] : [])));
  const names = new Map<string, string>();
  const lacking = new Set<string>();
  from.names.forEach((n, i) => {
    const [mine, theirs] = [n.slice(1), from.takes![i]!.slice(1)];
    if (!defined.has(theirs)) {
      say(`&${theirs} is not in ${quoted(id)}: it defines ${[...defined].map((m) => `&${m}`).join(', ')}`);
      lacking.add(mine);
    } else if (mine !== theirs) {
      if (defined.has(mine) && !from.takes!.includes(`&${mine}`))
        say(`&${mine}=${theirs}: ${quoted(id)} defines &${mine} too, by its own line: take &${theirs} under another name`);
      names.set(theirs, mine);
    }
  });
  return { names, lacking };
}

/** Read the old way, at a piece's level: the names it defines, and where a parameter it filled by name is said. */
interface OldBinding {
  readonly defines: ReadonlySet<string>;
  readonly warn: (message: string) => void;
}

/** A piece's own lines, as a `*` from a template meets them: the names it defines, and what each of its lines reads. */
interface Level {
  readonly defines: ReadonlySet<string>;
  readonly reads: ReadonlyMap<string, readonly string[]>;
  /** Each of its lines' code, by the cell it declares. */
  readonly codes: ReadonlyMap<string, string>;
  /** Says a warning on the line the copy came through. */
  readonly warn?: (message: string) => void;
}

/** Lines that came through a collection: their names are shared, never a copy's own. */
const sharedLines = (lines: readonly Line[]): Line[] => lines.map((l) => (l.shared ? l : { ...l, shared: true }));

/**
 * What a use of a resolved fragment gives (`path`: the ids that led here, this one last; `taken`: the names the level
 * holds, which a copy's own names stay clear of). A fragment with no signature is a collection, its lines taken by name;
 * with one, a `from` line takes a copy (`instantiate`).
 */
function give(
  entry: NonNullable<ReturnType<typeof entryOf>>,
  path: readonly string[],
  text: string,
  resolve: Resolve,
  say: (message: string) => void,
  taken: Set<string>,
  old?: OldBinding,
  level?: Level,
): Given {
  const { id, from } = entry;
  const signatures = linesOf(text).flatMap((l) => (l.from?.kind === 'signature' ? [l.from] : []));
  if (!signatures.length) {
    if (from.head.length || from.args || from.main !== null)
      say(
        `${quoted(id)} has no signature, so it takes no arguments: a collection gives the cells it defines by name (${entry.names ? entry.names.join(', ') : '*'} from ${from.id})`,
      );
    const lines = sharedLines(fragmentLines(path, text, resolve, say));
    const renames = renamesOf(from, lines, id, say);
    if (!renames) return { taken: { id, names: namesOf(entry), lines, resolved: true }, copy: [] };
    // (a line that renames, `&kick=bd`: the fragment's lines with each name it takes renamed, wherever they write it)
    const asked = new Set(from.names!.map((n) => n.slice(1)).filter((n) => !renames.lacking.has(n)));
    const touches = (l: Line) => (l.name !== null && renames.names.has(l.name)) || l.reads.some((r) => renames.names.has(r));
    const theirs = lines.map((l) =>
      touches(l) ? { ...lineOf(renamed(l.code, renames.names), renamed(l.written, renames.names), l.line), ...(l.origin ? { origin: l.origin } : {}) } : l,
    );
    return { taken: { id, names: asked, lines: sharedLines(theirs), resolved: true }, copy: [] };
  }
  if (signatures.length > 1) say(`${quoted(id)} has ${signatures.length} signatures: a fragment has one (&head from (&optional) &main)`);
  return instantiate(from, id, signatures[0]!, path, text, resolve, say, taken, old, level);
}

/**
 * A copy of a template (decision 065): its head named as the line names it, its parameters bound to the arguments (a
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
  old?: OldBinding,
  level?: Level,
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
  // (an optional parameter's default is a line of the template's own, or one it takes from a collection: a groove's
  // drums from the kit, `&bd, &sd from gm_kit`, decision 075, #560)
  for (const o of optional) if (!defines.has(o)) say(`${quoted(id)}'s &${o} is an optional parameter: its line in the fragment is its default, and it has none`);
  if (main && defines.has(main)) say(`${quoted(id)}'s &${main} is its main parameter: it has no line, the argument is it`);
  // (the heads the line takes: one renamed as the line names it, several by their names or as it renames them,
  // `&bass2=bass, &bassOut2=bassOut`, decision 075 §3b)
  const names = new Map<string, string>();
  const takes = from.takes?.map(bare) ?? heads;
  const binds = from.names?.map(bare) ?? heads;
  if (binds.length === 1 && heads.length === 1 && (takes[0] === binds[0] || takes[0] === heads[0])) names.set(heads[0]!, binds[0]!);
  else
    takes.forEach((t, i) => {
      if (heads.includes(t)) names.set(t, binds[i]!);
      else say(`&${t} is not a head of ${quoted(id)}: its head${heads.length > 1 ? 's are' : ' is'} ${heads.map((h) => `&${h}`).join(', ')}`);
    });
  const one = names.size === 1;
  if (from.head.length && !one) say(`The attributes before from are the head's, and this line takes ${names.size} heads from ${quoted(id)}: write them on each head's own line`);
  // (the arguments: a bare reference is that cell, anything else a cell of the copy's)
  const args = new Map((from.args ?? []).map((a) => [a.name, a.value] as const));
  // (read the old way: a parameter the library read by name before it declared it, filled by the piece's cell of its
  // name, BOUND_BY_NAME)
  const readByName = old ? (BOUND_BY_NAME.get(id) ?? []).filter((p) => optional.includes(p) && !args.has(p) && old.defines.has(p)) : [];
  for (const p of readByName) args.set(p, `&${p}`);
  if (readByName.length) old!.warn(byNameMessage(id, readByName, `${from.id}(${[...args].map(([k, v]) => `${k}=${v}`).join(', ')})`));
  for (const k of args.keys())
    if (!optional.includes(k))
      say(`${quoted(id)} takes no ${k}=: ${optional.length ? `its optional parameters are ${optional.map((o) => `${o}=`).join(', ')}` : 'it has no optional parameters'}`);
  if (main && from.main === null) say(`${quoted(id)} needs its main argument, &${main}, after its id: ${from.names?.[0] ?? `&${heads[0]}`} from ${from.id} …`);
  if (!main && from.main !== null)
    say(`${quoted(id)} takes no main argument: its signature has none (&${heads[0]} from ${signature.optional.length ? `(${signature.optional.join(', ')})` : ''})`);
  const BARE = /^&([A-Za-z_][A-Za-z0-9_]*)$/;
  const values = new Map<string, string>();
  for (const [k, v] of args) if (optional.includes(k)) values.set(k, unwrapped(v));
  if (main && from.main !== null) values.set(main, unwrapped(from.main));
  const byReference = new Set<string>();
  for (const [p, v] of values) {
    const ref = BARE.exec(v);
    if (ref) {
      names.set(p, ref[1]!);
      byReference.add(p);
    }
  }
  // (a copy takes the heads it names and what they read within the template, as a named use took its closure: a head it
  // doesn't name, and what only that reads, it leaves; and a parameter an argument binds to a cell, and what only its
  // default reads)
  const reached = new Set<string>();
  const byName = new Map(full.flatMap((l) => (l.name ? [[l.name, l] as const] : [])));
  for (const queue = [...heads.filter((h) => names.has(h))]; queue.length;) {
    const n = queue.shift()!;
    if (reached.has(n)) continue;
    reached.add(n);
    if (byReference.has(n)) continue;
    for (const r of byName.get(n)?.reads ?? []) if (byName.has(r)) queue.push(r);
  }
  // (every other name the copy defines is its own, clear of the level's and of the template's shared ones)
  const prefix = names.get(heads[0]!) ?? [...names.values()][0] ?? heads[0]!;
  for (const n of [...names.values()]) taken.add(n);
  // (a parameter whose default a collection gives, given a value, is a cell of the copy's own too)
  const sharedValued = optional.filter((o) => !definesOwn.has(o) && values.has(o) && !byReference.has(o));
  for (const n of [...definesOwn, ...(main ? [main] : []), ...sharedValued]) {
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
  // (`*` takes the heads the piece doesn't define, as from a collection: a head it writes itself is its own, and of the
  // copy only what its other heads read, and what the piece's own line for it reads, are taken; cell-studio#610)
  const overridden = from.names === null && level ? heads.filter((h) => level.defines.has(h)) : [];
  if (overridden.length) {
    const back = new Map([...names].map(([t, mine]) => [mine, t] as const));
    reached.clear();
    // (and what any of the piece's lines reads of it: a copy's own name, or a name it shares from a collection, `&bd`)
    const read = [...level!.reads.values()].flat();
    const seeds = [...heads.filter((h) => !overridden.includes(h)), ...read.flatMap((r) => back.get(r) ?? (byName.has(r) && !definesOwn.has(r) ? [r] : []))];
    for (const queue = seeds.filter((n) => !overridden.includes(n)); queue.length;) {
      const n = queue.shift()!;
      if (reached.has(n) || overridden.includes(n)) continue;
      reached.add(n);
      if (byReference.has(n)) continue;
      for (const r of byName.get(n)?.reads ?? []) if (byName.has(r)) queue.push(r);
    }
  }
  const copy: Line[] = [];
  for (const l of own) {
    const p = l.name!;
    if (byReference.has(p) || !reached.has(p) || overridden.includes(p)) continue;
    let code = renamed(l.code, names);
    if (values.has(p)) code = inherited(names.get(p)!, code, asCell(values.get(p)!, p, own));
    if (heads.includes(p) && from.head.length && one) code = withAttributes(code, from.head);
    copy.push({ ...lineOf(code), ...(l.origin ? { origin: l.origin } : {}) });
  }
  if (main && from.main !== null && !byReference.has(main)) copy.push(lineOf(`&${names.get(main)!} ${asCell(values.get(main)!, main, own)}`));
  for (const p of sharedValued) copy.push({ ...lineOf(inherited(names.get(p)!, byName.get(p)!.code, asCell(values.get(p)!, p, own))), origin: byName.get(p)!.origin ?? [] });
  // (a parameter's default a collection gives is shared by its name: a cell of the piece's of that name stands in for it,
  // which the line doesn't say, so it is said here, but where the piece's line is the default's word for word, #637)
  if (level?.warn && !old)
    for (const o of optional)
      if (!definesOwn.has(o) && !values.has(o) && level.defines.has(o) && reached.has(o) && level.codes.get(o) !== byName.get(o)?.code)
        level.warn(`The piece defines &${o}, and ${quoted(id)} takes its &${o} from a collection by default: pass yours, ${from.id}(${o}=&${o}), or rename it`);
  // (what it took from a collection, shared by name, but a parameter's default an argument replaced)
  const sharing = shared.filter((l) => reached.has(l.name!) && !byReference.has(l.name!) && !sharedValued.includes(l.name!));
  const given = { id, names: new Set(sharing.map((l) => l.name!)), lines: sharing, resolved: true };
  return { taken: given, copy, args: Object.fromEntries(values) };
}

/** A used fragment's lines, its own uses expanded (`path`: the ids that led here, this one last), or none where it can't be. */
function fragmentLines(path: readonly string[], text: string, resolve: Resolve, say: (message: string) => void): readonly Line[] {
  const here = path.at(-1)!;
  const own = linesOf(text).map((l) => ({ ...l, origin: [{ id: here, line: l.line }] }));
  const where = ` (in ${pathOf(path)})`;
  const sayHere = (message: string) => say(`${message}${where}`);
  const taken = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  const copies: Line[] = [];
  const used = own.flatMap((l): Taken[] => {
    if (l.from === null) {
      sayHere(FROM_FORM);
      return [];
    }
    const entry = entryOf(l);
    if (!entry) return [];
    const { id } = entry;
    const names = namesOf(entry);
    const next = [...path, id];
    if (path.includes(id)) say(`use ${quoted(id)} is a cycle: ${pathOf(next)}`);
    else if (next.length > FROM_DEPTH) say(`use ${quoted(id)} nests past ${FROM_DEPTH} deep: ${pathOf(next)}`);
    else {
      const whole = resolve(id);
      const theirs = whole === null ? null : (pickPart(id, whole, entry.from, sayHere)?.text ?? null);
      if (whole === null) sayHere(`No fragment ${quoted(id)} to use`);
      else if (theirs !== null) {
        const g = give(entry, next, theirs, resolve, say, taken);
        const step = { id: here, line: l.line };
        copies.push(...via(g.copy, step));
        return [{ ...g.taken, lines: via(g.taken.lines, step) }];
      }
    }
    return [{ id, names, lines: [], resolved: false }];
  });
  return merge([...own, ...copies], used, (_, message) => sayHere(message), quoted(path.at(-1)!)).lines;
}

/** What a use of an id the seed renamed says: its start (`is renamed`) is stable, for a frontend that matches it. */
const renamedMessage = (id: string, word: string) => `${quoted(id)} is renamed ${word}: write from ${word} (#387; Migrate rewrites it)`;

/**
 * The line a fragment forwards to, where its text is one `from` line of a collection and nothing else (a retired id the
 * library reads so, #196): what a line of it is told, which Migrate's `forwarded` rule writes.
 */
function forwardsTo(text: string): string | null {
  const lines = linesOf(text);
  const only = lines.length === 1 ? lines[0]!.from : null;
  return only?.kind === 'use' && !only.head.length && !only.args && only.main === null ? only.id : null;
}

/** The expansion of a text, as the compiler reads it. */
export interface Expansion {
  /** The piece's own text as written, then the used lines (so the piece's lines keep their numbers). */
  readonly text: string;
  /** Its `from` lines, compiled: what each resolved to, gave and was overridden in. */
  readonly takes: readonly Take[];
  /** Every name a `from` line gave (bare). */
  readonly given: ReadonlySet<string>;
  /** What the expansion says: an unresolved id, a cycle, a depth past `FROM_DEPTH`, a collision, a changed version. */
  readonly diagnostics: readonly Diagnostic[];
  /** For each line of `text` past the piece's own, the `from` line it came through. */
  readonly through: (line: number) => Span | null;
  /** Where each line it added came from, by the name it declares (`Origin`, #639). */
  readonly origins: ReadonlyMap<string, readonly Origin[]>;
}

/** The expansion of a text (see the module's comment), its `use` and `from` lines resolved by `options`. */
export function expansion(text: string, { resolve, locked = [], old = false }: CompileOptions = {}): Expansion {
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
  const parts: (string | undefined)[] = [];
  const taken = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
  const level: Level = {
    defines: new Set(taken),
    reads: new Map(own.flatMap((l) => (l.name ? [[l.name, l.reads] as const] : []))),
    codes: new Map(own.flatMap((l) => (l.name ? [[l.name, l.code] as const] : []))),
  };
  const used = uses.map((u): Taken => {
    const { id } = u;
    const names = namesOf(u);
    const span = spanOf(u.line);
    const say = (message: string) => diagnostics.push({ severity: 'error', message, span });
    // (a document's part is locked by its id and head, `kinderlied/twinkle`, decision 082)
    const head = (u.from.takes ?? u.from.names)?.[0]?.slice(1);
    const recorded = (locked.find((k) => head !== undefined && k.id === `${id}/${head}`) ?? locked.find((k) => k.id === id))?.hash;
    // (a seed fragment a piece took in as its part, read the old way as that part, decision 082: Migrate's `moved` rewrites it)
    const moved = old ? MOVED.get(id) : undefined;
    if (moved) diagnostics.push({ severity: 'warning', message: `${quoted(id)} is a part of ${moved.document} now: take it from there (Migrate rewrites it)`, span });
    const whole = resolve ? (moved ? partOf(resolve(moved.document) ?? '', moved.head) : resolve(id, ...(recorded ? [recorded] : []))) : null;
    const picked = whole === null ? null : pickPart(id, whole, u.from, say);
    const theirs = picked?.text ?? null;
    parts.push(picked?.part);
    if (theirs === null) {
      if (whole === null) say(resolve ? `No fragment ${quoted(id)} to use` : `No library to use ${quoted(id)} from: compileSource(text, env, { resolve })`);
      hashes.push(null);
      copies.push([]);
      args.push(undefined);
      return { id, names, lines: [], resolved: false };
    }
    const hash = fragmentHash(theirs);
    hashes.push(hash);
    if (recorded && !hashIs(recorded, theirs))
      diagnostics.push({ severity: 'warning', message: `${quoted(id)} has changed since this piece was saved: its current version plays`, span });
    // (an id the seed renamed, which this resolver reads as its word: the old way for a minor version, #387)
    const word = RENAMED_IDS.get(id);
    if (word !== undefined && resolve!(word) === theirs) diagnostics.push({ severity: 'warning', message: renamedMessage(id, word), span });
    // (an id that only forwards to another, retired: read as what it forwards to, for a minor version, #196)
    const to = forwardsTo(theirs);
    if (to !== null) diagnostics.push({ severity: 'warning', message: `${quoted(id)} only forwards to ${quoted(to)}: take from it (Migrate rewrites it)`, span });
    const binding = old
      ? { defines: new Set(own.flatMap((l) => (l.name ? [l.name] : []))), warn: (message: string) => diagnostics.push({ severity: 'warning', message, span }) }
      : undefined;
    const g = give(u, [id], theirs, resolve!, say, taken, binding, { ...level, warn: (message: string) => diagnostics.push({ severity: 'warning', message, span }) });
    const step = { id: null, line: u.line.line };
    copies.push(via(g.copy, step));
    args.push(g.args);
    return { ...g.taken, lines: via(g.taken.lines, step) };
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
    takes: uses.map((u, i) => {
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
        ...(parts[i] ? { part: parts[i] } : {}),
      };
    }),
    // (a copy's lines are the piece's own, as if written there: the built-in card hears them; what was taken by name isn't)
    given: new Set(added.flatMap((l) => (l.name && l.shared ? [l.name] : []))),
    diagnostics,
    through: (line) => (line > head ? (through[line - head - 1] ?? null) : null),
    origins: new Map(added.flatMap((l) => (l.name && l.origin ? [[l.name, l.origin] as const] : []))),
  };
}

/**
 * A piece's expansion written out (decision 054; #177's `inline`, Cell studio's "write out"): its own lines, its `use`
 * lines gone, then the used lines it doesn't define. A `use` that doesn't resolve stays, so nothing is lost.
 */
export function expand(text: string, resolve: Resolve, locked?: CompileOptions['locked']): string {
  if (!hasFrom(text)) return text;
  const x = expansion(text, { resolve, ...(locked ? { locked } : {}) });
  const kept = new Set(x.takes.filter((u) => u.hash === null).map((u) => u.span.line));
  const own = text
    .split('\n')
    .filter((raw, i) => readFrom(splitComment(raw)[0])?.kind !== 'use' || kept.has(i + 1))
    .join('\n');
  const added = x.text.split('\n').slice(text.split('\n').length);
  return [own.replace(/\s+$/, ''), ...added].join('\n') + (text.endsWith('\n') ? '\n' : '');
}
