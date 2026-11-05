/**
 * Patching as an edit (decision 067 §4; docs/notes/modular.md, rungs 5 and 6): the jacks a cell offers, and a cable
 * patched into one or pulled out of it, each a rewrite of the cell's own line, its comment and the rest of the line kept.
 * The code stays the single source of truth: a cable is a reference, written where the language reads it.
 *
 * - A voice's jacks are its moving sound parameters, `pitch=`, `env=` and `fm=`; an instrument's, its linear parameters
 *   (decision 067 §1). A cable into a moving parameter is a factor (`lpf=70..4800 * &eg * &lfo`); into a fixed one, at
 *   zero depth (`lpf=800..800 * &lfo`: decision 067 §4); into `pitch=`, `env=` or `fm=`, that cell.
 * - A module's jacks (a cell a `from` line takes from a fragment with a signature: decision 065) are its optional
 *   parameters, a cable its argument (`lowpass(cutoff=&lfo)`), none its knob (the parameter's default); and its main
 *   parameter, an input, a cable a reference in its mix (`[&saw, &sub]`).
 *
 * A jack that takes one cell (`env=`, `pitch=` and `fm=` written as a cell, a module's argument) takes one cable, as a
 * panel's does: one holding a cable, or a value written on the line, refuses another, so nothing is lost and a patch
 * pulled out gives the text back (#471's review). A cable comes from a cell the text defines, not from the cell itself.
 * The band is the frontend's to match (`jacksOf` says it): an audio cable into a CV jack is written as asked.
 */
import { signatureOf } from './use';
import { declLine, splitComment, splitWords } from './edit';
import { readFrom, topTokens } from './parser/use';
import { VOICE_PARAMS } from './attributes';
import type { Resolve } from './program';

/** A place a cable goes into. */
export interface Jack {
  /** The attribute (`lpf`, `pitch`, `env`, `fm`), or a module's parameter by its name (`cutoff`), or its input (`in`). */
  readonly port: string;
  /** Where it is written: an attribute of the cell's line, a module's argument, or a module's input (its main argument). */
  readonly kind: 'attribute' | 'argument' | 'input';
  /** What it takes: a level or a share (`cv`), or sound (`audio`). */
  readonly band: 'cv' | 'audio';
  /** The cells patched into it now, by name (no `&`), in the order written. */
  readonly patched: readonly string[];
  /** Its value with no cable, as written (`70..4800`, `800`, a module's default `map=lin .5`), or null where none is written. */
  readonly knob: string | null;
}

/** A patch the text can't take: why, in words. */
export class PatchError extends Error {}

/** The moving sound parameters a voice offers as jacks; an instrument's are the linear ones among them (decision 067 §1). */
export const MOVING = ['lpf', 'lpq', 'hpf', 'hpq', 'bpf', 'bpq', 'room', 'delay'] as const;
/** The jacks that take one cell, as written (`env=&pluck`), or, for `pitch=`, a range scaled by cells as a moving parameter. */
const CELL = ['pitch', 'env', 'fm'] as const;

const NAME = /^&([A-Za-z_][A-Za-z0-9_]*)$/;
const refName = (term: string) => NAME.exec(term)?.[1] ?? null;

/** One word of code from `i`, brackets, parentheses and quotes kept whole, and where it ends. */
function wordAt(code: string, i: number): { text: string; end: number } {
  let depth = 0;
  let quoted = false;
  let j = i;
  for (; j < code.length; j++) {
    const c = code[j]!;
    if (c === '"') quoted = !quoted;
    if (quoted) continue;
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth = Math.max(0, depth - 1);
    else if (/\s/.test(c) && depth === 0) break;
  }
  return { text: code.slice(i, j), end: j };
}

/** An attribute's value as written: its first word (`70..4800`, `800`, `&lfo`) and the cells it is multiplied by, and where it lies. */
interface Value {
  readonly base: string;
  readonly factors: readonly string[];
  readonly start: number;
  readonly end: number;
}

/** `key=`'s value on a line of code, its ` * term`s with it (sound.md, *Parameters as cells*), or null where it isn't written. */
function valueOf(code: string, key: string): Value | null {
  const m = new RegExp(`(^|\\s)${key}=`).exec(code);
  if (!m) return null;
  const start = m.index + m[0].length;
  const first = wordAt(code, start);
  const factors: string[] = [];
  let end = first.end;
  for (;;) {
    const times = /^\s*\*\s*/.exec(code.slice(end));
    if (!times) break;
    const term = wordAt(code, end + times[0].length);
    if (!term.text) break;
    factors.push(term.text);
    end = term.end;
  }
  return { base: first.text, factors, start, end };
}

const writeValue = (base: string, factors: readonly string[]) => [base, ...factors].join(' * ');

/** The line that takes &cell from a fragment, as its one head (a module), with its form; or null. */
function moduleLine(lines: readonly string[], cell: string): { index: number; form: Extract<NonNullable<ReturnType<typeof readFrom>>, { kind: 'use' }> } | null {
  for (let i = 0; i < lines.length; i++) {
    const form = readFrom(splitComment(lines[i]!)[0].trim());
    if (form && form.kind === 'use' && form.names?.length === 1 && form.names[0] === `&${cell}`) return { index: i, form };
  }
  return null;
}

/** A fragment's line for a name (`&cutoff map=lin .5`), its body (`map=lin .5`), or null. */
function lineBody(text: string, name: string): string | null {
  for (const l of text.split('\n')) {
    const code = splitComment(l)[0].trim();
    if (code.startsWith(`${name} `) && readFrom(code) === undefined) return code.slice(name.length).trim();
  }
  return null;
}

/** Does the fragment read its main parameter as a sound: a term of a mix (`[&in]`, `[&eg * &level * &in]`)? */
const readsAsSound = (text: string, name: string) => new RegExp(`\\[[^\\]]*${name}(?![A-Za-z0-9_])[^\\]]*\\]`).test(text);

/** A mix written in place (`[&saw, &sub * .5]`), its entries; or null for anything else. */
function entriesOf(main: string): string[] | null {
  const t = main.trim();
  if (!t.startsWith('[') || !t.endsWith(']') || wordAt(t, 0).text !== t) return null;
  const inner = t.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const c of inner) {
    if (c === '[' || c === '(') depth++;
    if (c === ']' || c === ')') depth--;
    if (c === ',' && depth === 0) (out.push(cur.trim()), (cur = ''));
    else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** An entry's sound, the cell it names (`&sub * .5` → `sub`), or null. */
const entryCell = (entry: string) => /^&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[^(])/.exec(entry.trim())?.[1] ?? null;

/** What a cell's own line is: a voice (sound parameters, or a braid at audio rate), an instrument (one mix), or neither. */
function sortOf(code: string): 'voice' | 'instrument' | null {
  const words = splitWords(code).slice(1);
  if (words.some((w) => /^map=(sample|midi|role)\b/.test(w))) return null;
  const braid = words.filter((w) => !/^[a-z][a-zA-Z]*=/.test(w) && w !== 'off');
  if (braid.length === 1 && braid[0]!.startsWith('[')) return 'instrument';
  return words.some((w) => VOICE_PARAMS.has(w.slice(0, Math.max(0, w.indexOf('='))))) ? 'voice' : null;
}

/** The jacks &cell offers, patched or not (see the module's comment); none for a cell that is no voice, instrument or module. */
export function jacksOf(source: string, cell: string, resolve?: Resolve): Jack[] {
  const lines = source.split('\n');
  const module = moduleLine(lines, cell);
  if (module) {
    const text = resolve?.(module.form.id) ?? null;
    const signature = text ? signatureOf(text) : null;
    if (!text || !signature) return [];
    const args = new Map((module.form.args ?? []).map((a) => [a.name, a.value]));
    const jacks: Jack[] = signature.optional.map((p) => {
      const name = p.slice(1);
      const given = args.get(name);
      const patched = given && refName(given) ? [refName(given)!] : [];
      // (a jack takes sound where its default is one: a voice's line, or a mix; a level, an envelope, a wave turned slowly is CV)
      const knob = lineBody(text, p);
      const band: Jack['band'] = knob && (knob.startsWith('[') || sortOf(`${p} ${knob}`) === 'voice') ? 'audio' : 'cv';
      return { port: name, kind: 'argument', band, patched, knob: given && !patched.length ? given : knob };
    });
    if (signature.main) {
      const main = module.form.main;
      const entries = main ? (entriesOf(main) ?? [main]) : [];
      const patched = entries.flatMap((e) => entryCell(e) ?? []);
      jacks.push({ port: signature.main.slice(1), kind: 'input', band: readsAsSound(text, signature.main) ? 'audio' : 'cv', patched, knob: null });
    }
    return jacks;
  }
  const i = declLine(source, cell);
  if (i < 0) return [];
  const code = splitComment(lines[i]!)[0];
  const sort = sortOf(code);
  if (!sort) return [];
  const attribute = (port: string, band: Jack['band']): Jack => {
    const v = valueOf(code, port);
    if (!v) return { port, kind: 'attribute', band, patched: [], knob: null };
    const alone = refName(v.base);
    return { port, kind: 'attribute', band, patched: [...(alone ? [alone] : []), ...v.factors.flatMap((f) => refName(f) ?? [])], knob: alone ? null : v.base };
  };
  const jacks = MOVING.map((k) => attribute(k, 'cv'));
  if (sort === 'instrument') return jacks;
  jacks.push(attribute('pitch', 'cv'), attribute('env', 'cv'), attribute('fm', 'audio'));
  if (valueOf(code, 'fm')) jacks.push(attribute('index', 'cv'));
  return jacks;
}

/** &cell's line with a cable from &from patched into `port` (see the module's comment). */
export function patch(source: string, cell: string, port: string, from: string, resolve?: Resolve): string {
  return rewire(source, cell, port, from, 'in', resolve);
}

/** &cell's line with the cable from &from pulled out of `port`: the jack back to its knob. */
export function unpatch(source: string, cell: string, port: string, from: string, resolve?: Resolve): string {
  return rewire(source, cell, port, from, 'out', resolve);
}

/** Does the text define &name: a line of its own, or a `from` line that takes it? */
function defines(source: string, name: string): boolean {
  if (declLine(source, name) >= 0) return true;
  return source.split('\n').some((l) => {
    const form = readFrom(splitComment(l)[0].trim());
    return !!form && form.kind === 'use' && !!form.names?.includes(`&${name}`);
  });
}

function rewire(source: string, cell: string, port: string, from: string, way: 'in' | 'out', resolve?: Resolve): string {
  const jack = jacksOf(source, cell, resolve).find((j) => j.port === port);
  if (!jack) throw new PatchError(`&${cell} has no jack ${port}`);
  if (way === 'in' && jack.patched.includes(from)) return source;
  if (way === 'out' && !jack.patched.includes(from)) return source;
  if (way === 'in') {
    if (from === cell) throw new PatchError(`&${cell} can't be patched into itself`);
    if (!defines(source, from)) throw new PatchError(`&${from} is defined nowhere in the text: write it first`);
  }
  const lines = source.split('\n');
  const module = jack.kind === 'attribute' ? null : moduleLine(lines, cell);
  const index = module ? module.index : declLine(source, cell);
  const [code, comment] = splitComment(lines[index]!.replace(/\r$/, ''));
  const cr = lines[index]!.endsWith('\r') ? '\r' : '';
  const next = module ? moduleCode(code, module.form, jack, from, way) : attributeCode(code, cell, jack, from, way);
  // (a comment keeps the space that set it apart)
  lines[index] = (comment ? `${next.trimEnd()} ` : next.trimEnd()) + comment + cr;
  return lines.join('\n');
}

/** A cell line's code with &from patched into, or out of, the attribute `jack`. */
function attributeCode(code: string, cell: string, jack: Jack, from: string, way: 'in' | 'out'): string {
  const v = valueOf(code, jack.port);
  const ref = `&${from}`;
  const set = (value: string | null) => {
    if (v)
      return value === null
        ? (code.slice(0, v.start - jack.port.length - 1).trimEnd() + ' ' + code.slice(v.end).trimStart()).trim()
        : code.slice(0, v.start) + value + code.slice(v.end);
    const head = /^\s*&[A-Za-z_][A-Za-z0-9_]*/.exec(code)![0];
    return `${head} ${jack.port}=${value}${code.slice(head.length)}`;
  };
  const single = (CELL as readonly string[]).includes(jack.port) && !(v && v.base.includes('..'));
  if (single) {
    if (way === 'out') return v && refName(v.base) === from && !v.factors.length ? set(null) : code;
    if (v) throw new PatchError(`&${cell}'s ${jack.port}= holds ${v.base}: pull it out first (a jack takes one cable)`);
    return set(ref);
  }
  if (way === 'in') {
    if (!v) throw new PatchError(`&${cell} has no ${jack.port}= written: write its value first (${jack.port}=…), a knob for the cable to move`);
    if (refName(v.base))
      throw new PatchError(`&${cell}'s ${jack.port}= is one cell, &${refName(v.base)}: two cells multiply a range (${jack.port}=lo..hi * &a * &b), or add (a sum)`);
    // (into a fixed parameter at zero depth: decision 067 §4)
    const base = v.base.includes('..') ? v.base : `${v.base}..${v.base}`;
    return set(writeValue(base, [...v.factors, ref]));
  }
  if (!v) return code;
  if (refName(v.base) === from && !v.factors.length) return set(null);
  const factors = v.factors.filter((f) => refName(f) !== from);
  if (factors.length) return set(writeValue(v.base, factors));
  // (no cable left: the range's foot, the value it played at a share of 0; lo..lo is lo)
  return set(v.base.split('..')[0]!);
}

/** A module's `from` line with &from patched into, or out of, its argument or its input. */
function moduleCode(code: string, form: Extract<NonNullable<ReturnType<typeof readFrom>>, { kind: 'use' }>, jack: Jack, from: string, way: 'in' | 'out'): string {
  const tokens = topTokens(code);
  const at = tokens.findIndex((t) => t.text === 'from');
  const idToken = tokens[at + 1]!;
  const id = idToken.text.replace(/\(.*$/s, '');
  const ref = `&${from}`;
  let args = [...(form.args ?? [])];
  let main = form.main;
  if (jack.kind === 'argument') {
    const given = args.find((a) => a.name === jack.port);
    const name = form.names![0]!;
    if (way === 'in' && given)
      throw new PatchError(
        refName(given.value)
          ? `${name}'s ${jack.port} holds &${refName(given.value)}: pull it out first (a jack takes one cable)`
          : `${name}'s ${jack.port} is set on the line (${given.value}): a cable would replace it, so clear it first (a jack takes one cable; a knob and a cable together are a sum)`,
      );
    args = args.filter((a) => a.name !== jack.port);
    if (way === 'in') args.push({ name: jack.port, value: ref });
  } else {
    const entries = main ? (entriesOf(main) ?? [main]) : [];
    if (way === 'in') main = entries.length ? `[${[...entries, ref].join(', ')}]` : ref;
    else {
      const kept = entries.filter((e) => entryCell(e) !== from);
      if (!kept.length) throw new PatchError(`${ref} is the only input of &${form.names![0]!.slice(1)}: a module takes something in (patch another first)`);
      main = kept.length === 1 && refName(kept[0]!) ? kept[0]! : `[${kept.join(', ')}]`;
    }
  }
  const list = args.length ? `(${args.map((a) => `${a.name}=${a.value}`).join(', ')})` : '';
  return `${code.slice(0, idToken.at)}${id}${list}${main ? ` ${main}` : ''}`;
}
