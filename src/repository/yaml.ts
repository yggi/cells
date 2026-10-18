/**
 * YAML, the subset a fragment file's frontmatter is written in (decision 047, #143): parsed here, so cells takes no
 * dependency and stays pure. What a file may say, and what any YAML 1.2 parser reads the same:
 *
 * - **Block maps** (`key: value`, nested by indenting) and **block lists** (`- item`, a map's first entry on the dash
 *   line, or a list indented under its key or level with it). Keys are plain words: not quoted, not a number.
 * - **Scalars:** plain text, `"double"` (JSON's escapes) or `'single'` (`''` a quote) quoted strings, decimal numbers,
 *   `true` `false`, `null` `~`. A timestamp (`2026-10-18T21:00:00Z`) stays the string it is written as, and is written
 *   quoted, so a YAML 1.1 parser (js-yaml, SilverBullet's) reads it as a string too.
 * - **Flow** only as a list of scalars, `[a, b]`, and the empty map `{}`.
 *
 * It refuses, naming the line: anchors and aliases (`&a`, `*a`), tags (`!x`), directives and a second document (`%`,
 * `---`, `...`), comments (`#`), block scalars (`|`, `>`), a plain value over two lines, flow beyond `[a, b]` (`{a: 1}`,
 * `[[a]]`), complex keys (`?`), a key given twice, numbers it doesn't read as YAML does (`0x1F`, `0o7`, `.inf`, `.nan`),
 * and tabs in an indent. `writeYaml` writes one canonical form of what `readYaml` reads, so writing what it read gives the
 * same text whenever the text was written that way.
 */

/** A value the subset holds: a scalar, a list, or a map whose keys keep their order. */
export type YamlValue = string | number | boolean | null | readonly YamlValue[] | { readonly [key: string]: YamlValue };

/** A parsed value and the line it starts on, so a reader can name the line of what it refuses. */
export type YamlNode =
  | { readonly kind: 'scalar'; readonly line: number; readonly value: string | number | boolean | null }
  | { readonly kind: 'list'; readonly line: number; readonly items: readonly YamlNode[] }
  | { readonly kind: 'map'; readonly line: number; readonly entries: readonly { readonly key: string; readonly line: number; readonly value: YamlNode }[] };

/** What is wrong, and on which line of the file. */
export interface YamlProblem {
  readonly line: number;
  readonly message: string;
}

class Refusal extends Error {
  constructor(
    readonly line: number,
    message: string,
  ) {
    super(message);
  }
}

const DECIMAL = /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/;
const OTHER_NUMBER = /^([-+]?0x[0-9a-fA-F]+|[-+]?0o[0-7]+|[-+]?\.(inf|Inf|INF)|\.(nan|NaN|NAN))$/;
const NULL = /^(null|Null|NULL|~)$/;
const TRUE = /^(true|True|TRUE)$/;
const FALSE = /^(false|False|FALSE)$/;
/** What a YAML 1.1 parser reads as a boolean: written quoted, so no parser reads it as one. */
const OLD_BOOLEAN = /^(y|Y|yes|Yes|YES|n|N|no|No|NO|on|On|ON|off|Off|OFF)$/;
/** What a YAML 1.1 parser reads as a timestamp (js-yaml's two forms): written quoted, so no parser reads it as a date. */
const TIMESTAMP = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$|^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}([Tt]|[ \t]+)[0-9]{1,2}:[0-9]{2}:[0-9]{2}(\.[0-9]*)?([ \t]*(Z|[-+][0-9]{1,2}(:[0-9]{2})?))?$/;
const INDICATOR = /^[-?:,[\]{}#&*!|>'"%@`]/;
/** A key the subset reads: plain, starting with no indicator, without `: ` or ` #`, not a whole number (an object would reorder it). */
const isKey = (key: string) => key !== '' && !INDICATOR.test(key) && !/: |:$| #|^\s|\s$/.test(key) && !/^[0-9]+$/.test(key) && !/[\n\r\t]/.test(key);

/** A plain scalar's value; refuses what it doesn't read. */
function plainValue(text: string, line: number, inFlow: boolean): string | number | boolean | null {
  const [first] = text;
  if (first === '&' || first === '*') throw new Refusal(line, `an ${first === '&' ? 'anchor' : 'alias'} (${text}): the subset has none; write the value out`);
  if (first === '!') throw new Refusal(line, `a tag (${text}): the subset has none`);
  if (first === '|' || first === '>') throw new Refusal(line, `a block scalar (${first}): write the text on one line, quoted, with \\n`);
  if (first === '{' || first === '[') throw new Refusal(line, `flow style beyond [a, b] (${text}): write the map or the list as a block`);
  if (/^([-?:]( |$)|[%@`,\]}])/.test(text)) throw new Refusal(line, `${first} can't start a plain value: quote it`);
  if (first === '#' || text.includes(' #')) throw new Refusal(line, `a comment: the subset has none; say it in the prose or under a key`);
  if (/: |:$/.test(text)) throw new Refusal(line, `a colon and a space in a plain value (${text}): quote it`);
  if (inFlow && /[[\]{},]/.test(text)) throw new Refusal(line, `flow style beyond [a, b] (${text}): quote an item that holds , [ ] { }`);
  if (NULL.test(text)) return null;
  if (TRUE.test(text)) return true;
  if (FALSE.test(text)) return false;
  if (DECIMAL.test(text)) return Number(text);
  if (OTHER_NUMBER.test(text)) throw new Refusal(line, `a number the subset doesn't read (${text}): write it in decimal, or quote it`);
  return text;
}

/** A quoted scalar at the start of `text`: its value and the length it takes. */
function quoted(text: string, line: number): { value: string; length: number } {
  if (text[0] === "'") {
    let value = '';
    for (let i = 1; i < text.length; i++) {
      if (text[i] !== "'") value += text[i];
      else if (text[i + 1] === "'") value += text[i++];
      else return { value, length: i + 1 };
    }
  } else {
    for (let i = 1; i < text.length; i++) {
      if (text[i] === '\\') i++;
      else if (text[i] === '"') {
        try {
          return { value: JSON.parse(text.slice(0, i + 1)) as string, length: i + 1 };
        } catch {
          throw new Refusal(line, `an escape the subset doesn't read in ${text.slice(0, i + 1)}: it reads JSON's (\\" \\\\ \\n \\t \\uXXXX …)`);
        }
      }
    }
  }
  throw new Refusal(line, `a quoted string that isn't closed on its line (${text})`);
}

/** A scalar written after a key or a dash, on its own line: plain, quoted, `[a, b]` or `{}`. */
function scalarNode(text: string, line: number): YamlNode {
  if (text === '{}') return { kind: 'map', line, entries: [] };
  if (text[0] === '"' || text[0] === "'") {
    const { value, length } = quoted(text, line);
    if (text.slice(length).trim()) throw new Refusal(line, `text after a quoted string (${text.slice(length).trim()})`);
    return { kind: 'scalar', line, value };
  }
  if (text[0] === '[' && text.endsWith(']')) {
    const items: YamlNode[] = [];
    let rest = text.slice(1, -1).trim();
    while (rest) {
      let value: string | number | boolean | null;
      if (rest[0] === '"' || rest[0] === "'") {
        const q = quoted(rest, line);
        value = q.value;
        rest = rest.slice(q.length).trim();
      } else {
        const end = rest.indexOf(',');
        const item = (end < 0 ? rest : rest.slice(0, end)).trim();
        if (!item) throw new Refusal(line, `an empty item in ${text}`);
        value = plainValue(item, line, true);
        rest = end < 0 ? '' : rest.slice(end);
      }
      items.push({ kind: 'scalar', line, value });
      if (rest && rest[0] !== ',') throw new Refusal(line, `a list item followed by ${rest[0]}, not a comma`);
      rest = rest.slice(1).trim();
      if (!rest && text.slice(1, -1).trim().endsWith(',')) throw new Refusal(line, `an empty item at the end of ${text}`);
    }
    return { kind: 'list', line, items };
  }
  return { kind: 'scalar', line, value: plainValue(text, line, false) };
}

interface Line {
  line: number;
  indent: number;
  text: string;
}

/**
 * The value YAML text holds, as nodes with their lines, or what is wrong with it; the first line of `text` is line
 * `firstLine` of its file. Empty text is the empty map.
 */
export function readYaml(text: string, firstLine = 1): { node: YamlNode } | { problems: YamlProblem[] } {
  const lines: Line[] = [];
  try {
    text.split('\n').forEach((raw, i) => {
      const line = firstLine + i;
      if (!raw.trim()) return;
      const indent = raw.length - raw.trimStart().length;
      if (raw.slice(0, indent).includes('\t')) throw new Refusal(line, 'a tab in an indent: indent with spaces');
      const content = raw.trim();
      if (/^(---|\.\.\.)(\s|$)/.test(content)) throw new Refusal(line, `a second document (${content}): the frontmatter is one`);
      if (content[0] === '%') throw new Refusal(line, `a directive (${content}): the subset has none`);
      if (content[0] === '#') throw new Refusal(line, 'a comment: the subset has none; say it in the prose or under a key');
      lines.push({ line, indent, text: content });
    });
    if (!lines.length) return { node: { kind: 'map', line: firstLine, entries: [] } };
    let at = 0;
    const isItem = (l: Line) => l.text === '-' || l.text.startsWith('- ');

    const block = (indent: number): YamlNode => (isItem(lines[at]!) ? list(indent) : map(indent));

    /** The value after a key's colon or a dash: on the same line, or the block indented under it (`deeper` than `indent`). */
    const valueAfter = (rest: string, line: number, indent: number, allowLevelList: boolean): YamlNode => {
      const next = lines[at];
      if (rest) {
        if (next && next.indent > indent) throw new Refusal(next.line, 'a value over two lines, or indented under a value: the subset reads a value on one line');
        return scalarNode(rest, line);
      }
      if (next && next.indent > indent) return block(next.indent);
      if (next && allowLevelList && next.indent === indent && isItem(next)) return list(indent);
      return { kind: 'scalar', line, value: null };
    };

    const list = (indent: number): YamlNode => {
      const items: YamlNode[] = [];
      const start = lines[at]!.line;
      while (at < lines.length && lines[at]!.indent === indent && isItem(lines[at]!)) {
        const current = lines[at]!;
        const rest = current.text.slice(1).trimStart();
        const column = indent + current.text.length - rest.length;
        if (rest && (/^-( |$)/.test(rest) || /^[^"'[{][^]*?(: |:$)/.test(rest))) {
          // a map's first entry, or a list, on the dash line: read as if indented to where it starts
          lines[at] = { line: current.line, indent: column, text: rest };
          items.push(block(column));
        } else {
          at++;
          items.push(valueAfter(rest, current.line, indent, false));
        }
      }
      return { kind: 'list', line: start, items };
    };

    const map = (indent: number): YamlNode => {
      const entries: { key: string; line: number; value: YamlNode }[] = [];
      const start = lines[at]!.line;
      while (at < lines.length && lines[at]!.indent === indent) {
        const { line, text } = lines[at]!;
        if (isItem(lines[at]!)) throw new Refusal(line, 'a list item where a key was expected');
        if (text[0] === '?') throw new Refusal(line, 'a complex key (?): keys are plain words');
        const colon = text.search(/: |:$/);
        if (colon < 0) throw new Refusal(line, `no key: a line in a map is \`key: value\` (${text})`);
        const key = text.slice(0, colon);
        if (key[0] === '"' || key[0] === "'") throw new Refusal(line, `a quoted key (${key}): keys are plain words`);
        if (/^[0-9]+$/.test(key)) throw new Refusal(line, `a key that is a number (${key}): keys are words`);
        if (!isKey(key)) throw new Refusal(line, `a key the subset doesn't read (${key}): keys are plain words`);
        if (entries.some((e) => e.key === key)) throw new Refusal(line, `the key ${key} is given twice`);
        at++;
        entries.push({ key, line, value: valueAfter(text.slice(colon + 1).trim(), line, indent, true) });
      }
      return { kind: 'map', line: start, entries };
    };

    const node = block(lines[0]!.indent);
    if (at < lines.length) throw new Refusal(lines[at]!.line, 'indented as no key above it is');
    return { node };
  } catch (e) {
    if (e instanceof Refusal) return { problems: [{ line: e.line, message: e.message }] };
    throw e;
  }
}

/** A node's value: lists as arrays, maps as objects with their keys in order. */
export function yamlValue(node: YamlNode): YamlValue {
  if (node.kind === 'scalar') return node.value;
  if (node.kind === 'list') return node.items.map(yamlValue);
  return Object.fromEntries(node.entries.map((e) => [e.key, yamlValue(e.value)]));
}

const isScalar = (v: YamlValue): v is string | number | boolean | null => v === null || typeof v !== 'object';

/** A string written plain where reading it back gives it unchanged, else double-quoted (JSON's escapes). */
function writeString(s: string, inFlow: boolean): string {
  let plain = s !== '' && s === s.trim() && !INDICATOR.test(s) && !/[\n\r\t\\]/.test(s) && !OLD_BOOLEAN.test(s) && !TIMESTAMP.test(s) && !(inFlow && /[[\]{},]/.test(s));
  if (plain) {
    try {
      plain = plainValue(s, 0, inFlow) === s;
    } catch {
      plain = false;
    }
  }
  return plain ? s : JSON.stringify(s);
}

function writeScalar(v: string | number | boolean | null, inFlow = false): string {
  if (typeof v === 'string') return writeString(v, inFlow);
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`writeYaml: ${v} is no number the subset writes`);
  return String(v);
}

/** A value after a key or a dash: on the line (a scalar, a list of scalars, `{}`), or null for a block under it. */
function inline(v: YamlValue): string | null {
  if (isScalar(v)) return writeScalar(v);
  if (Array.isArray(v)) return v.every(isScalar) ? `[${v.map((x) => writeScalar(x as string | number | boolean | null, true)).join(', ')}]` : null;
  return Object.keys(v).length ? null : '{}';
}

/** The lines of a list or a map at an indent. */
function blockLines(v: YamlValue, indent: string): string[] {
  if (Array.isArray(v))
    return v.flatMap((item: YamlValue) => {
      const one = inline(item);
      if (one !== null) return [`${indent}- ${one}`];
      const [first, ...rest] = blockLines(item, `${indent}  `);
      return [`${indent}- ${first!.trimStart()}`, ...rest];
    });
  return Object.entries(v as { readonly [key: string]: YamlValue }).flatMap(([key, value]) => {
    if (!isKey(key)) throw new Error(`writeYaml: the key ${JSON.stringify(key)} is no key the subset reads (a plain word)`);
    const one = inline(value);
    return one !== null ? [`${indent}${key}: ${one}`] : [`${indent}${key}:`, ...blockLines(value, `${indent}  `)];
  });
}

/** A map as YAML text in the subset's one canonical form, a line each, ending in a newline (none for the empty map). */
export function writeYaml(map: { readonly [key: string]: YamlValue }): string {
  return blockLines(map, '')
    .map((l) => `${l}\n`)
    .join('');
}
