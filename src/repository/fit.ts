/**
 * What fits the workbench (decision 047, points 2 and 3): the union of a fragment with the workbench's text, and whether
 * the fragment fits there. The workbench is a cells text; the fragment's holes are read off its text (`holes.ts`).
 *
 * **The union** is the workbench as written, then the fragment's lines: a line the fragment gives word for word as the
 * workbench does (its code, comments aside, whitespace collapsed) is the same line and kept once (owner, on #22); a name
 * both define by different lines is the fragment's own and renamed, `&kick` to `&kick2` (the first `&kick<n>`, n from 2,
 * that neither text names), with every use of it in the fragment, until no private name collides (a rename can make a
 * shared line differ, `[&kick, &sd]`, and so rename it too). The interface names (`INTERFACE_NAMES`: `&bar`, `&tempo`,
 * `&key`, `&tonic`, `&harm`) are never renamed: one the fragment defines differently is defined twice, and the fragment doesn't fit.
 * Lines of the fragment that declare nothing (blank, a comment alone) aren't carried over, but for its `use` lines
 * (decision 054), each carried over unless the workbench has it, before its declarations.
 *
 * **The fit:** every name the fragment uses is defined on the workbench (`key`, the old way: the workbench has a main key), no name is
 * defined twice by different lines, every clock need is met by the meter the workbench gives it (its main meter, or the
 * one named), and the union compiles with no diagnostic the workbench alone doesn't have (its own warnings, or an error a
 * hole of its own makes, are no fault of the fragment's). The checks run cheapest first, and the union is compiled only
 * when the others pass; its compile may be cached by text (`cachedCompile`). A hole read only as a sound (`Holes.sounds`:
 * a groove's `&bd`) doesn't block the fit (decision 054): what the workbench doesn't define of them is `sounds`, the
 * instrument to ask for next (a hole read as a line, a form's `&call`, is `missing`: a line fills it, #314), and the union is judged with a stand-in voice for each (`&bd s=white`), so that only the fragment's other faults count. The stand-ins are in no text the fit returns. What a workbench's `use` lines give it
 * counts as defined there, as its compile says.
 */
import type { Diagnostic } from '../engine/ast';
import { compileSource } from '../engine/compile';
import { renameCell, splitComment } from '../engine/edit';
import type { CompileResult, Resolve } from '../engine/program';
import { parse, readFrom } from '../engine/parser';
import { braidReadsOf } from '../engine/compiler/builtin';
import { clockNeeds, holesOf, INTERFACE_NAMES, linesRead, meterMeets, readOnlyAsSound, standIn, type ClockNeed, type TappedNeed } from './holes';

/** A fragment added to a workbench: the text, and what became of the fragment's names there. */
export interface Union {
  /** The workbench as written, then the fragment's lines that aren't already on it. */
  readonly text: string;
  /** The fragment's private names that collided, each to its new name (`&kick` → `&kick2`). */
  readonly renamed: ReadonlyMap<string, string>;
  /** The fragment's names whose line the workbench already gives word for word: kept once. */
  readonly shared: readonly string[];
  /** Interface names both define by different lines: never renamed, so defined twice. */
  readonly twice: readonly string[];
  /** Every name the fragment defines, as it is named in the union (shared, renamed or as written). */
  readonly names: readonly string[];
}

/** Whether a fragment fits a workbench, and why not. */
export interface Fit {
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

const INTERFACE = new Set(INTERFACE_NAMES.map((n) => n.replace(/^&/, '')));

/** A declaration of a text: its cell's name (bare), its lines as written, and its code (comments aside, whitespace collapsed). */
export interface Line {
  readonly name: string;
  readonly written: string;
  readonly code: string;
}

const HEAD = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
/** A `use` line's code, collapsed (decision 054). */
const USE = /^use\s/;
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

/** A text's `use` lines and the `from` lines that take from a fragment (decision 065), their code collapsed, in order. */
const useLines = (text: string): string[] =>
  text
    .split('\n')
    .map((raw) => splitComment(raw)[0].trim().split(/\s+/).join(' '))
    .filter((code) => USE.test(code) || readFrom(code)?.kind === 'use');

/** The union of a fragment with a workbench (see the module's comment). */
export function unionOf(fragment: string, workbench: string): Union {
  const bench = new Map(declarations(workbench).map((l) => [l.name, l]));
  const taken = new Set([...namesIn(workbench), ...namesIn(fragment)]);
  const renamed = new Map<string, string>();
  for (;;) {
    let text = fragment;
    for (const [from, to] of renamed) text = renameCell(text, from, to);
    const lines = declarations(text);
    const shared: string[] = [];
    const twice: string[] = [];
    const collide: string[] = [];
    for (const line of lines) {
      const there = bench.get(line.name);
      if (!there) continue;
      if (there.code === line.code) shared.push(line.name);
      else if (INTERFACE.has(line.name)) twice.push(line.name);
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
        twice: amp([...new Set(twice)]),
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
 * Whether a fragment fits a workbench (see the module's comment); `compiledBy` compiles a text, and may cache it
 * (`cachedCompile`). Their `use` lines (decision 054) read through `resolve`: the fragment is judged over its expansion,
 * its used fragments' holes and clock needs its own; `compiledBy`, where given, must read them through the same.
 */
export function fitOf(fragment: string, workbench: string, compiledBy?: (text: string) => CompileResult, resolve?: Resolve): Fit {
  const compiled = compiledBy ?? ((text: string) => compileSource(text, undefined, resolve ? { resolve } : {}));
  const holes = holesOf(fragment, compiled, resolve);
  const bench = compiled(workbench);
  const benchNames = new Set([...declarations(workbench).map((l) => `&${l.name}`), ...(bench.uses ?? []).flatMap((u) => u.gave)]);
  const unfilled = holes.uses.filter((name) => (name === 'key' ? !bench.mainKey : !benchNames.has(name)));
  const sounds = unfilled.filter((name) => holes.sounds.includes(name));
  const missing = unfilled.filter((name) => !sounds.includes(name));
  const read = linesRead(fragment, resolve);
  const sound = readOnlyAsSound(parse(read).cells);
  const union = unionOf(fragment, workbench);
  // (alone, with a stand-in for each sound hole: a line that strikes one doesn't compile without, and states no need)
  const aloneStand = holes.sounds.map(standIn);
  const alone = clockNeeds([read, ...aloneStand].join('\n'), compiled([fragment, ...aloneStand].join('\n')));
  const unmet = alone.filter((t) => !meets(bench, t)).map((t) => t.need);
  const failed = { fits: false, union, missing, sounds, unmet };
  if (missing.length || union.twice.length || unmet.length) return failed;
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
 * The fit cached by its two texts, the last `limit` asked for, its compiles cached by text (`cachedCompile`): what a
 * repository asks with a workbench, so a query asked again with the same workbench compiles nothing and derives nothing.
 */
export function cachedFit(limit = 512): (fragment: string, workbench: string) => Fit {
  const compiled = cachedCompile(limit);
  // (keyed by the workbench's length, the workbench, then the fragment: no two pairs of texts share a key)
  const fit = lru(limit, (key) => {
    const colon = key.indexOf(':');
    const end = colon + 1 + Number(key.slice(0, colon));
    return fitOf(key.slice(end), key.slice(colon + 1, end), compiled);
  });
  return (fragment, workbench) => fit(`${workbench.length}:${workbench}${fragment}`);
}
