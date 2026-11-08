/**
 * What fits the workbench (decision 047, points 2 and 3; decisions 065, 075): a fragment taken onto a workbench, and
 * whether it fits there. The workbench is a cells text; the fragment's holes are read off its text (`holes.ts`). Nothing
 * is bound by name.
 *
 * **A template** (`useOn`, `fitsAs`, #454) is taken by a `from` line, a copy whose inputs are its arguments: its main
 * argument the cell the host names, or the one cell that meets the main parameter, of what the workbench offers or else
 * all its cells.
 *
 * **A collection** (`fitsAs`) is judged by its lines: the workbench as written, then the fragment's lines. A line the
 * fragment gives word for word as the workbench does (its code, comments aside, whitespace collapsed) is the same line and
 * kept once (owner, on #22); a name both define by different lines is the fragment's own and renamed, `&kick` to `&kick2`
 * (the first `&kick<n>`, n from 2, that neither text names), with every use of it in the fragment, until no private name
 * collides (a rename can make a shared line differ, `[&kick, &sd]`, and so rename it too). The fragment's `from` lines are
 * carried over unless the workbench has them, before its declarations. It fits where every name it uses is defined on the
 * workbench, every clock need is met by the meter the workbench gives it (its main meter, or the one named), and the union
 * compiles with no diagnostic the workbench alone doesn't have. A hole read only as a sound (`Holes.sounds`: a groove's
 * `&bd`) doesn't block the fit (decision 054): it is `sounds`, the instrument to ask for next, and the union is judged with
 * a stand-in voice for each (`&bd s=white`), in no text the fit returns.
 *
 * **A repository's query** asks `cachedFit` (#587): `fitsAs` over the repository's own fragments, cached by text.
 */
import type { Diagnostic } from '../engine/ast';
import { compileSource } from '../engine/compile';
import { renameCell, splitComment } from '../engine/edit';
import type { CompileResult, Resolve, Used } from '../engine/program';
import { expansion, fragmentHash, signatureOf } from '../engine/use';
import { parse, readFrom } from '../engine/parser';
import { braidReadsOf } from '../engine/compiler/builtin';
import { clockNeeds, holesOf, linesRead, meterMeets, readOnlyAsSound, standIn, type ClockNeed, type TappedNeed } from './holes';

/** A collection's lines added to a workbench: the text, and what became of the fragment's names there. */
export interface Union {
  /** The workbench as written, then the fragment's lines that aren't already on it. */
  readonly text: string;
  /** The fragment's private names that collided, each to its new name (`&kick` → `&kick2`). */
  readonly renamed: ReadonlyMap<string, string>;
  /** The fragment's names whose line the workbench already gives word for word: kept once. */
  readonly shared: readonly string[];
  /** Every name the fragment defines, as it is named in the union (shared, renamed or as written). */
  readonly names: readonly string[];
}

/** Whether a collection's lines fit a workbench, and why not. */
interface Fit {
  readonly fits: boolean;
  readonly union: Union;
  /** Names the fragment uses that the workbench doesn't define (`key`: it has no main key), but for its sounds. */
  readonly missing: readonly string[];
  /** Names the fragment reads only as a sound that the workbench doesn't define: they don't block the fit. */
  readonly sounds: readonly string[];
  /** Its clock needs the workbench's meter doesn't meet (or a need with no meter there to meet it). */
  readonly unmet: readonly ClockNeed[];
  /** What the union's compile says that the workbench's alone doesn't; absent when a cheaper check failed first. */
  readonly diagnostics?: readonly Diagnostic[];
}

/** A declaration of a text: its cell's name (bare), its lines as written, and its code (comments aside, whitespace collapsed). */
export interface Line {
  readonly name: string;
  readonly written: string;
  readonly code: string;
}

const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const CONTINUES = /[+*,[]\s*$/;

/** A text's declarations, a line (and the lines it continues onto: one ending in `+`, `*`, `,` or `[`) each, as the parser reads them. */
export function declarations(text: string): Line[] {
  const out: Line[] = [];
  let carry: { written: string[]; code: string[] } | null = null;
  for (const raw of text.split('\n')) {
    const code = splitComment(raw)[0];
    carry ??= { written: [], code: [] };
    carry.written.push(raw);
    carry.code.push(code);
    if (CONTINUES.test(code)) continue;
    const whole = carry.code.join(' ').trim().split(/\s+/).join(' ');
    const name = HEAD.exec(whole)?.[1];
    // (a from line declares none of the text's own: a use's cells are the fragment's, a signature declares what it takes, decision 065)
    if (name && readFrom(whole) === undefined) out.push({ name, written: carry.written.join('\n'), code: whole });
    carry = null;
  }
  return out;
}

/** Every name a text's code writes (`&x`), declared or used; its comments aside. */
const namesIn = (text: string) =>
  new Set(
    text
      .split('\n')
      .flatMap((line) => [...splitComment(line)[0].matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)])
      .map((m) => m[1] ?? ''),
  );

/** A text's `from` lines that take from a fragment (decision 065), their code collapsed, in order. */
const useLines = (text: string): string[] =>
  text
    .split('\n')
    .map((raw) => splitComment(raw)[0].trim().split(/\s+/).join(' '))
    .filter((code) => readFrom(code)?.kind === 'use');

/** The union of a fragment's lines with a workbench (see the module's comment). */
function unionByName(fragment: string, workbench: string): Union {
  const bench = new Map(declarations(workbench).map((l) => [l.name, l]));
  const taken = new Set([...namesIn(workbench), ...namesIn(fragment)]);
  const renamed = new Map<string, string>();
  for (;;) {
    let text = fragment;
    for (const [from, to] of renamed) text = renameCell(text, from, to);
    const lines = declarations(text);
    const shared: string[] = [];
    const collide: string[] = [];
    for (const line of lines) {
      const there = bench.get(line.name);
      if (!there) continue;
      if (there.code === line.code) shared.push(line.name);
      else collide.push(line.name);
    }
    if (!collide.length) {
      const benchUses = new Set(useLines(workbench));
      const uses = useLines(fragment).filter((u) => !benchUses.has(u));
      const kept = [...uses, ...lines.filter((l) => !shared.includes(l.name)).map((l) => l.written)];
      const head = workbench.replace(/\s+$/, '');
      const amp = (names: readonly string[]) => names.map((n) => `&${n}`);
      return {
        text: [...(head ? [head] : []), ...kept].join('\n'),
        renamed: new Map([...renamed].map(([from, to]) => [`&${from}`, `&${to}`])),
        shared: amp(shared),
        names: amp([...new Set(lines.map((l) => l.name))]),
      };
    }
    for (const name of collide) {
      let k = 2;
      while (taken.has(`${name}${k}`)) k++;
      taken.add(`${name}${k}`);
      renamed.set(name, `${name}${k}`);
    }
  }
}

/** Whether the meter a need reads in a compiled text (the one it names, or the main meter) meets it; never, where there is none. */
function meets(result: CompileResult, { need, tap }: TappedNeed): boolean {
  const name = need.meter ? need.meter.slice(1) : result.mainMeter;
  const meter = name === undefined ? null : result.cells.get(name)?.meter;
  return !!meter && meterMeets(need, meter, tap);
}

/** The names a compile reports as unknown cells (`&bd`). */
const unknownCells = (result: CompileResult): string[] => result.unknown.map((u) => `&${u.name}`);

const sameDiagnostic = (a: Diagnostic, b: Diagnostic) => a.severity === b.severity && a.message === b.message && a.span.line === b.span.line && a.span.col === b.span.col;

/**
 * Whether a fragment's lines fit a workbench (see the module's comment); `compiledBy` compiles a text, and may cache it
 * (`cachedCompile`). Their `from` lines read through `resolve`: the fragment is judged over its expansion, its used
 * fragments' holes and clock needs its own; `compiledBy`, where given, must read them through the same. `fitsAs`'
 * judgment of a collection (its lines read only what it defines, its sounds and its taps).
 */
function fitByName(fragment: string, workbench: string, compiledBy?: (text: string) => CompileResult, resolve?: Resolve): Fit {
  const compiled = compiledBy ?? ((text: string) => compileSource(text, undefined, resolve ? { resolve } : {}));
  const holes = holesOf(fragment, compiled, resolve);
  const bench = compiled(workbench);
  const benchNames = new Set([...declarations(workbench).map((l) => `&${l.name}`), ...(bench.uses ?? []).flatMap((u) => u.gave)]);
  const unfilled = holes.uses.filter((name) => (name === 'key' ? !bench.mainKey : !benchNames.has(name)));
  const sounds = unfilled.filter((name) => holes.sounds.includes(name));
  const missing = unfilled.filter((name) => !sounds.includes(name));
  const read = linesRead(fragment, resolve);
  const sound = readOnlyAsSound(parse(read).cells);
  const union = unionByName(fragment, workbench);
  // (alone, with a stand-in for each sound hole: a line that strikes one doesn't compile without, and states no need)
  const aloneStand = holes.sounds.map(standIn);
  const alone = clockNeeds([read, ...aloneStand].join('\n'), compiled([fragment, ...aloneStand].join('\n')));
  const unmet = alone.filter((t) => !meets(bench, t)).map((t) => t.need);
  const failed = { fits: false, union, missing, sounds, unmet };
  if (missing.length || unmet.length) return failed;
  // (a stand-in voice for each sound hole the workbench leaves: one a stand-in lets the compile reach is added, and so on)
  // (and one for each sound hole the workbench has itself, a groove added before its kit: not the fragment's fault)
  const benchDecls = parse(workbench).cells;
  const benchSound = readOnlyAsSound(benchDecls);
  const benchHoles = [...new Set(benchDecls.flatMap((d) => braidReadsOf(d)).map((n) => `&${n}`))].filter((n) => !benchNames.has(n) && !union.names.includes(n) && benchSound(n));
  const benchStand = benchHoles.map(standIn);
  const benchResult = benchStand.length ? compiled([workbench, ...benchStand].join('\n')) : bench;
  const judged = (): string => [union.text, ...new Set([...sounds.map(standIn), ...benchStand])].join('\n');
  let result = compiled(judged());
  for (;;) {
    const more = unknownCells(result).filter((n) => sound(n) && !sounds.includes(n) && !benchNames.has(n) && !union.names.includes(n));
    if (!more.length) break;
    sounds.push(...more);
    result = compiled(judged());
  }
  sounds.sort();
  const before = [...benchResult.diagnostics];
  // (a stand-in's sound isn't sent on a MIDI card, and the compile says so of it: not the fragment's fault)
  const standNames = new Set([...sounds, ...benchStand.map((l) => l.split(' ')[0]!)].map((n) => (n.startsWith('&') ? n : `&${n}`)));
  const diagnostics = result.diagnostics.filter((d) => {
    const m = /^(&\w+) is only on a MIDI card: its sound/.exec(d.message);
    if (m && standNames.has(m[1]!)) return false;
    const i = before.findIndex((b) => sameDiagnostic(b, d));
    if (i < 0) return true;
    before.splice(i, 1);
    return false;
  });
  // (the needs again, on the union as compiled: a line that only compiled once the workbench's names were there states its need here)
  const bare = (names: readonly string[]) => new Set(names.map((n) => n.slice(1)));
  const own = bare(union.names.filter((n) => !union.shared.includes(n)));
  const unmetThere = clockNeeds(judged(), result, bare(union.names), own)
    .filter((t) => !meets(result, t))
    .map((t) => t.need);
  return { fits: !diagnostics.length && !unmetThere.length, union, missing, sounds, unmet: unmetThere, diagnostics };
}

/** What `make` gives for a key, kept for the last `limit` keys asked for, the least recently used dropped first. */
function lru<T>(limit: number, make: (key: string) => T): (key: string) => T {
  const cache = new Map<string, T>();
  return (key) => {
    if (cache.has(key)) {
      const hit = cache.get(key) as T;
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const made = make(key);
    cache.set(key, made);
    if (cache.size > limit) cache.delete(cache.keys().next().value!);
    return made;
  };
}

/**
 * A compile cached by text: the last `limit` texts compiled. At 512, a library of 31 fragments, each alone and in its union
 * with a workbench, holds about ten workbenches' queries.
 */
export const cachedCompile = (limit = 512): ((text: string) => CompileResult) => lru(limit, (text) => compileSource(text));

/**
 * The fit cached, what a repository asks with a workbench (#587): `fitsAs` of a fragment's text, read as the fragment
 * `fit_<its hash>` through `resolve` (the repository's own fragments, which its `from` lines take from), its main argument
 * `main` where the query names one (a template's; a collection takes none). Its compiles are cached by text, and its
 * answers by the text, the workbench and the main argument, the last `limit` of each: a query asked again with the same
 * workbench compiles nothing and derives nothing.
 */
export function cachedFit(resolve: Resolve, limit = 512): (text: string, workbench: string, main?: string) => FitAs {
  const own = new Map<string, string>();
  const resolving: Resolve = (id, hash) => own.get(id) ?? resolve(id, hash);
  const compiled = lru(limit, (text: string) => compileSource(text, undefined, { resolve: resolving }));
  const fit = lru(limit, (key) => {
    const { id, workbench, main } = JSON.parse(key) as { id: string; workbench: string; main: string | null };
    return fitsAs(id, workbench, { resolve: resolving, compiled, ...(main === null ? {} : { main }) });
  });
  return (text, workbench, main) => {
    const id = `fit_${fragmentHash(text).slice(3)}`;
    own.set(id, text);
    return fit(JSON.stringify({ id, workbench, main: main ?? null }));
  };
}

/**
 * A template taken onto a workbench by a `from` line (decision 065, #454): what `useOn` writes. The copy's names are its
 * own (`&bassline_bassNext`), its inputs the arguments the line gives, so a template can be taken twice and no name of
 * the workbench is bound to it by convention.
 */
export interface UseOn {
  /** The workbench as written, then the `from` line. */
  readonly text: string;
  /** The `from` line written (`&bassline from walking_bass &harm`). */
  readonly line: string;
  /** The names the line takes: the head as named (one), or a template's heads by their names (several). */
  readonly heads: readonly string[];
  /** The main argument as written (`&harm`, `D`), or null: the template has no main parameter, or the workbench no cell for it. */
  readonly main: string | null;
  /** What the copy gives, as the compile reads it (`CompileResult.uses`); null where the template didn't resolve. */
  readonly used: Used | null;
}

/** What `useOn` is told: the head's name, the main argument, the named arguments, and how to read the library. */
export interface UseOnOptions {
  readonly resolve: Resolve;
  /** The head's name; by default the template's own, numbered clear of the workbench's (`&bassline2`). */
  readonly head?: string;
  /** The main argument, as a `from` line writes it (`&harm`, `D`); by default the one cell of the workbench (or of what it offers) that meets the main parameter. */
  readonly main?: string;
  /** The named arguments (`{ swing: '8n:.64' }`). */
  readonly args?: Readonly<Record<string, string>>;
  /** Compiles a text (its `from` lines read through `resolve`), and may cache it (`cachedCompile`). */
  readonly compiled?: (text: string) => CompileResult;
}

const ID_ARGS = /^([^(]*)\((.*)\)$/;

/** A `from` line: names, the id with its arguments (the id's own, `meter(swing=8n:2/3)`, then the line's), the main argument. */
function fromLine(heads: readonly string[], id: string, args: Readonly<Record<string, string>> | undefined, main: string | null): string {
  const m = ID_ARGS.exec(id);
  const written = [...(m ? [m[2]!] : []), ...Object.entries(args ?? {}).map(([k, v]) => `${k}=${v}`)];
  return `${heads.join(', ')} from ${m ? m[1] : id}${written.length ? `(${written.join(', ')})` : ''}${main ? ` ${main}` : ''}`;
}

const compilerOf = (resolve: Resolve, compiled?: (text: string) => CompileResult) => compiled ?? ((text: string) => compileSource(text, undefined, { resolve }));

/** What a compile says that another doesn't (each said once as often as the other says it). */
function newDiagnostics(result: CompileResult, before: readonly Diagnostic[]): Diagnostic[] {
  const left = [...before];
  return result.diagnostics.filter((d) => {
    const i = left.findIndex((b) => sameDiagnostic(b, d));
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
}

/**
 * The workbench's cell a template's main parameter is read from, where useOn isn't told one (decision 075: by what a
 * cell is, never its name). The candidates are the workbench's cells, or, where it declares what it offers (the heads of
 * its own signature, `&harm, &key from`), those. A candidate meets the parameter where the copy compiles over it with
 * nothing said that the workbench alone doesn't say (its sound holes stood in), read the way the template reads it (a
 * table by `over=`, a rate by `step=`, a note as a tonic). Exactly one that does is it; none or several,
 * and there is none: the fit is then `missing` the parameter, and the host names the argument (`main`) or the
 * workbench says what it offers. A meter reads as a table, so a harmony beside it is two candidates: offer one.
 */
function mainOn(
  bench: string,
  id: string,
  heads: readonly string[],
  args: UseOnOptions['args'],
  compiled: (text: string) => CompileResult,
  stand: readonly string[],
): string | null {
  const alone = compiled([bench, ...stand].join('\n'));
  const meets = (cell: string) => !newDiagnostics(compiled([bench, fromLine(heads, id, args, cell), ...stand].join('\n')), alone.diagnostics).length;
  const offers = parse(bench).offers;
  const named = offers?.length ? offers.map((n) => `&${n}`) : declarations(bench).map((l) => `&${l.name}`);
  // (two that meet are already none: the rest isn't compiled)
  const meeting: string[] = [];
  for (const n of named) if (!heads.includes(n) && meets(n) && meeting.push(n) > 1) return null;
  return meeting[0] ?? null;
}

/** A name clear of the workbench's: the name, else the first `name<n>`, n from 2, that the workbench doesn't write. */
function clearOf(bench: string, name: string): string {
  const taken = namesIn(bench);
  const bare = name.replace(/^&/, '');
  if (!taken.has(bare)) return `&${bare}`;
  let k = 2;
  while (taken.has(`${bare}${k}`)) k++;
  return `&${bare}${k}`;
}

/**
 * A template taken onto a workbench (decision 065, #454): the workbench with `&head from id(args) main` written on it, and
 * what the copy gives. Without `head`, the template's head numbered clear of the workbench's names; a template of several
 * heads is taken by their names. Without `main`, the one cell of the workbench that meets the main parameter (`mainOn`). A
 * fragment with no signature, a collection, is taken by every name it defines (`* from id`).
 */
export function useOn(bench: string, id: string, options: UseOnOptions): UseOn {
  const compiled = compilerOf(options.resolve, options.compiled);
  const text = options.resolve(id);
  const head = bench.replace(/\s+$/, '');
  const written = (line: string) => [...(head ? [head] : []), line].join('\n');
  const usedBy = (whole: string): Used | null => compiled(whole).uses?.at(-1) ?? null;
  const signature = text === null ? null : signatureOf(text);
  if (text === null || !signature) {
    const line = `* from ${id}`;
    return { text: written(line), line, heads: [], main: null, used: text === null ? null : usedBy(written(line)) };
  }
  const heads = signature.names.length === 1 ? [options.head ?? clearOf(bench, signature.names[0]!)] : signature.names;
  const stand = holesOf(text, compiled, options.resolve)
    .sounds.filter((s) => !namesIn(bench).has(s.slice(1)))
    .map(standIn);
  const main = options.main ?? (signature.main ? mainOn(bench, id, heads, options.args, compiled, stand) : null);
  const line = fromLine(heads, id, options.args, main);
  return { text: written(line), line, heads, main, used: usedBy(written(line)) };
}

/** Whether a template fits a workbench taken by a `from` line, and why not: `fitsAs`'s answer. */
export interface FitAs {
  readonly fits: boolean;
  /** The `from` line on the workbench (`useOn`); for a collection, the workbench with its lines (the fit by lines). */
  readonly text: string;
  /** The copy, where a template was taken (`useOn`); null for a collection. */
  readonly use: UseOn | null;
  /** For a collection, its union: what became of its names on the workbench (renamed, shared). */
  readonly union?: Union;
  /** The parameters the workbench has no cell for (the main one, `&harm`); for a collection, the names it uses that the workbench lacks. */
  readonly missing: readonly string[];
  /** The names it reads only as a sound that the workbench doesn't define: they don't block the fit. */
  readonly sounds: readonly string[];
  /** Its clock needs the workbench's meter doesn't meet. */
  readonly unmet: readonly ClockNeed[];
  /** What the compile says that the workbench's alone doesn't; absent when a cheaper check failed first. */
  readonly diagnostics?: readonly Diagnostic[];
}

/**
 * Whether a fragment fits a workbench, read by its signature (decision 065, #454): a template fits where the workbench
 * gives its main argument (`useOn`: the cell that meets it, or `options.main`), the copy compiles with nothing said that
 * the workbench alone doesn't say (a sound hole stood in, as the fit by lines stands one), and its clock needs are met by the meter
 * it taps. Nothing is bound by name. A collection (no signature) is judged as the fit by lines judges it: its lines read only what
 * it defines, its sounds and its taps.
 */
export function fitsAs(id: string, bench: string, options: UseOnOptions): FitAs {
  const compiled = compilerOf(options.resolve, options.compiled);
  const text = options.resolve(id);
  if (text === null) return { fits: false, text: bench, use: null, missing: [], sounds: [], unmet: [] };
  const signature = signatureOf(text);
  if (!signature) {
    const f = fitByName(text, bench, compiled, options.resolve);
    return {
      fits: f.fits,
      text: f.union.text,
      use: null,
      union: f.union,
      missing: f.missing,
      sounds: f.sounds,
      unmet: f.unmet,
      ...(f.diagnostics ? { diagnostics: f.diagnostics } : {}),
    };
  }
  const use = useOn(bench, id, { ...options, compiled });
  if (signature.main && use.main === null) return { fits: false, text: use.text, use, missing: [signature.main], sounds: [], unmet: [] };
  const benchNames = new Set(namesIn(bench));
  const sounds = holesOf(text, compiled, options.resolve)
    .sounds.filter((s) => !benchNames.has(s.slice(1)))
    .sort();
  const stand = sounds.map(standIn);
  const judged = [use.text, ...stand].join('\n');
  const result = compiled(judged);
  const standNames = new Set(sounds);
  const diagnostics = newDiagnostics(result, compiled([bench, ...stand].join('\n')).diagnostics).filter((d) => {
    const m = /^(&\w+) is only on a MIDI card: its sound/.exec(d.message);
    return !(m && standNames.has(m[1]!));
  });
  const gave = new Set((use.used?.gave ?? []).map((n) => n.slice(1)));
  const unmet = clockNeeds(expansion(judged, { resolve: options.resolve }).text, result, gave, gave)
    .filter((t) => !meets(result, t))
    .map((t) => t.need);
  return { fits: !diagnostics.length && !unmet.length, text: use.text, use, missing: [], sounds, unmet, diagnostics };
}
