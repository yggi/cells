/**
 * A fragment's association, read from its text (decision 089): its declaration lines, a template's signature or a
 * collection's `* from` with no id, each with its attributes. The compile never reads them, so no style comes into a
 * piece from one; the repository reads them here, as it reads a signature.
 *
 *   &key from (&mode) &tonic style=(&deepHouse | &swingJazz) mode=dorian
 *   * from style=(&synthPop | &(map=style sync=.3 harm=.45 bite=.65 mood=.5) * .5) facet=instrument
 *   * from facet=module
 *
 * - `style=` is a point, `&funk` (a style of `styles`, followed wherever it is placed) or inline,
 *   `&(map=style sync=.3 bite=.55 ± .1)`: its axes by name, any of them (a point may leave an axis out, decision 041),
 *   or all four in order; `± r` is the point's reach on that axis, kept and read by no query yet (§6). `* w` is its
 *   weight, 1 where left out; `( a | b )` is a set, found at each.
 * - `facet=` where it differs from the folder's (§3); a fragment with no folder writes it, and a declaration with
 *   neither counts for every facet.
 * - Every other attribute is a template's argument at these points (§4): its optional parameter, a value as a line
 *   writes it. `style` and `facet` are reserved.
 * - No `style=` is no style: found at `ANY_DISTANCE` from every style (§5).
 *
 * Pure.
 */
import { splitComment } from '../engine/edit';
import { topTokens } from '../engine/parser/use';
import { AXIS_NAMES } from '../engine/style';
import type { StylePoint, WeightedPoint } from './fragments';

/** The styles a declaration names, by name: `&funk` is Funk's point. */
export type StyleNames = ReadonlyMap<string, StylePoint>;

/** The facet a seed folder's fragments are found as (§3): `fragments/modes/` is `mode`. */
export const FOLDER_FACETS: Readonly<Record<string, string>> = {
  bands: 'band',
  bass: 'bass',
  expression: 'expression',
  forms: 'form',
  harmony: 'harmony',
  instruments: 'instrument',
  meters: 'meter',
  modes: 'mode',
  modules: 'module',
  motifs: 'motif',
  performers: 'performer',
  rhythms: 'rhythm',
  stab: 'stab',
  styles: 'style',
};

/** The words a declaration's attributes reserve: no template has a parameter of either name (§4). */
export const RESERVED = ['style', 'facet'] as const;

const NUMBER = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
const NAMES = /^&[A-Za-z_][A-Za-z0-9_]*(?:\s*,\s*&[A-Za-z_][A-Za-z0-9_]*)*$/;

/** Whether a line of code is a declaration: a signature, or `* from` with no id (its attributes after `from`). */
export function isDeclaration(code: string): boolean {
  return declarationAttributes(code) !== null;
}

/** A declaration's attributes, as written after `from` (its parameters aside); null where the line is none. */
function declarationAttributes(code: string): string[] | null {
  const tokens = topTokens(code);
  const from = tokens.findIndex((t) => t.text === 'from');
  if (from < 1) return null;
  const left = code.slice(0, tokens[from]!.at).trim();
  const after = tokens.slice(from + 1).map((t) => t.text);
  const isAttr = (t: string) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(t) || t === '*' || NUMBER.test(t);
  if (left === '*') return after.every(isAttr) ? after : null;
  if (!NAMES.test(left)) return null;
  let i = 0;
  if (after[i]?.startsWith('(')) i++;
  if (after[i]?.startsWith('&') && !after[i]!.startsWith('&(')) i++;
  // (an id after `from` is a take, `&bd from gm_kit`: no declaration)
  if (i === 0 && after.length && !isAttr(after[0]!)) return null;
  return after.slice(i).every(isAttr) ? after.slice(i) : null;
}

/** What a declaration line says: its points, each weighted, of a facet, with a template's arguments. */
export interface Declared {
  readonly points: readonly WeightedPoint[];
  readonly problems: readonly string[];
}

/** One point of a `style=`: a name, or an inline style, its axes by name or in order. */
function readPoint(text: string, styles: StyleNames): { point: StylePoint; reach?: StylePoint } | string {
  if (/^&[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
    const point = styles.get(text.slice(1));
    return point ? { point } : `style=${text}: no style of that name in styles`;
  }
  const inline = /^&\(\s*map=style\s+([\s\S]*)\)$/.exec(text);
  if (!inline) return `style=${text}: a style, &funk, or an inline one, &(map=style sync=.3 bite=.55)`;
  const body = inline[1]!.trim();
  const ordered = body.split(/\s+/);
  if (ordered.length === AXIS_NAMES.length && ordered.every((v) => NUMBER.test(v))) return { point: Object.fromEntries(AXIS_NAMES.map((a, i) => [a, parseFloat(ordered[i]!)])) };
  const point: Record<string, number> = {};
  const reach: Record<string, number> = {};
  const AXIS = /([A-Za-z_]+)=(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+))(?:\s*(?:±|\+-)\s*([0-9]+(?:\.[0-9]+)?|\.[0-9]+))?/y;
  let at = 0;
  while (at < body.length) {
    while (body[at] === ' ') at++;
    if (at >= body.length) break;
    AXIS.lastIndex = at;
    const m = AXIS.exec(body);
    if (!m) return `style=${text}: an axis by name, sync=.3, or one ± a reach, bite=.55 ± .1`;
    const [, axis, value, r] = m;
    if (!AXIS_NAMES.includes(axis!)) return `style=${text}: ${axis} is no axis (the axes: ${AXIS_NAMES.join(' ')})`;
    if (axis! in point) return `style=${text}: ${axis}= twice`;
    point[axis!] = parseFloat(value!);
    if (r !== undefined) reach[axis!] = parseFloat(r);
    at = AXIS.lastIndex;
  }
  if (!Object.keys(point).length) return `style=${text}: a point names an axis at least`;
  return Object.keys(reach).length ? { point, reach } : { point };
}

/** A `style=`'s points, each with its weight: a point, a point * w, or a set ( a | b * w ). */
function readStyle(text: string, styles: StyleNames): { point: StylePoint; weight: number; reach?: StylePoint }[] | string {
  const set = /^\(([\s\S]*)\)$/.exec(text);
  const members = set ? splitTop(set[1]!, '|') : [text];
  const out: { point: StylePoint; weight: number; reach?: StylePoint }[] = [];
  for (const raw of members) {
    const m = /^([\s\S]*?)(?:\s*\*\s*(-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)))?$/.exec(raw.trim())!;
    const read = readPoint(m[1]!.trim(), styles);
    if (typeof read === 'string') return read;
    const weight = m[2] === undefined ? 1 : parseFloat(m[2]);
    if (!(weight > 0)) return `style=${text}: a weight is a number above 0`;
    out.push({ ...read, weight });
  }
  return out;
}

/** A text split at a separator outside parentheses. */
function splitTop(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === sep && depth === 0) {
      out.push(text.slice(start, i));
      start = i + 1;
    }
  }
  out.push(text.slice(start));
  return out;
}

/** One declaration line's points (§1–§6), or what is wrong with it. */
export function readDeclaration(code: string, options: { readonly facet?: string; readonly styles: StyleNames; readonly template: boolean }): Declared | null {
  const attrs = declarationAttributes(code);
  if (attrs === null) return null;
  const problems: string[] = [];
  let style: string | null = null;
  let facet = options.facet;
  const args: Record<string, string> = {};
  for (let i = 0; i < attrs.length; i++) {
    const t = attrs[i]!;
    const eq = t.indexOf('=');
    if (eq < 0) {
      problems.push(`${t}: an attribute, name=value`);
      continue;
    }
    const name = t.slice(0, eq);
    let value = t.slice(eq + 1);
    // (a lone point's weight written after it: style=&funk * .5)
    if (name === 'style' && attrs[i + 1] === '*' && NUMBER.test(attrs[i + 2] ?? '')) {
      value = `${value} * ${attrs[i + 2]}`;
      i += 2;
    }
    if (name === 'style') style = value;
    else if (name === 'facet') facet = value;
    else if (!options.template) problems.push(`${name}=: a collection's declaration has no arguments (style= and facet= only)`);
    else if (/^[A-Za-z0-9_.#:/+*(),"' -]+$/.test(value) && !/[&=]/.test(value)) args[name] = value;
    else problems.push(`${name}=${value}: an argument is a value (a word, a number, 8n:2/3, meter("7/8"))`);
  }
  const extra = { ...(facet === undefined ? {} : { facet }), ...(Object.keys(args).length ? { args } : {}) };
  if (style === null) return { points: [{ point: {}, weight: 1, ...extra }], problems };
  const read = readStyle(style, options.styles);
  if (typeof read === 'string') return { points: [], problems: [...problems, read] };
  return { points: read.map(({ point, weight, reach }) => ({ point, weight, ...extra, ...(reach ? { reach } : {}) })), problems };
}

/**
 * A fragment's association from its text (decision 089): each declaration line's points, in order; null where it has no
 * declaration (its association is elsewhere: a file's frontmatter, for a release). A template's declarations are its
 * signature lines, a bare one no style; a collection's, its `* from` lines with no id.
 */
export function associationOf(
  text: string,
  options: { readonly facet?: string; readonly styles: StyleNames },
): { association: WeightedPoint[]; problems: string[]; explicit: boolean } | null {
  const lines = text.split('\n').map((raw) => splitComment(raw)[0].trim());
  const template = lines.some((code) => {
    const a = declarationAttributes(code);
    return a !== null && !code.startsWith('*');
  });
  const association: WeightedPoint[] = [];
  const problems: string[] = [];
  let found = false;
  let explicit = false;
  for (const code of lines) {
    const d = readDeclaration(code, { ...options, template });
    if (!d) continue;
    found = true;
    // (a declaration that says something: an attribute, or a collection's `* from`; a bare signature says no style)
    if (code.startsWith('*') || declarationAttributes(code)!.length) explicit = true;
    association.push(...d.points);
    problems.push(...d.problems);
  }
  return found ? { association, problems, explicit } : null;
}

/**
 * A text without its association (decision 089): each signature once, its attributes dropped, and a collection's
 * `* from` lines gone. The lines a piece takes from it, as they were before the association moved into the text.
 */
export function withoutDeclarations(text: string): string {
  const seen = new Set<string>();
  return text
    .split('\n')
    .flatMap((raw) => {
      const code = splitComment(raw)[0].trim();
      const attrs = declarationAttributes(code);
      if (attrs === null) return [raw];
      if (code.startsWith('*')) return [];
      const bare = attrs.length ? code.slice(0, code.lastIndexOf(attrs[0]!)).trimEnd() : code;
      if (seen.has(bare)) return [];
      seen.add(bare);
      return [attrs.length ? bare : raw];
    })
    .join('\n');
}
