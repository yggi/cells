/**
 * Plugins: `show=` wheels beyond the language's own (decision 011). The app ships some (builtinPlugins.ts: the sun …);
 * a piece can also carry the code of one of its own. A plugin is a block of the piece's
 * text, between two lines:
 *
 *   === plugin sun ===
 *   { "fits": ["meter"], "size": 220, … }       the manifest: plain data, read here (the layout needs it)
 *   function draw(view, h, g) { … }              the drawing: code, run by the UI only (ui/plugin.ts)
 *   === end ===
 *
 * This module is pure: it splits a piece's text into the cells' text and its plugins, and reads the manifest. The
 * block is blanked in the cells' text, so a cell's line numbers are the piece's. Running the code is not its job.
 */
import type { Diagnostic } from './ast';

/** A dial: the wheel is turned by hand while stopped, and moves where play starts. */
interface PluginDial {
  /** What a screen reader calls it. */
  readonly label: string;
  /** Seconds of the piece for a full turn. */
  readonly turn: number;
  /** Seconds for one press of an arrow key. */
  readonly key: number;
}

/** A `show=` a piece carries: its manifest, and the code that draws it. */
export interface ShowPlugin {
  /** The word after `show=`. */
  readonly name: string;
  /** The kinds of cell it can show (layout/show.ts: voice, meter, table …). */
  readonly fits: readonly string[];
  /** Its wheel's width and height in the graph. */
  readonly size: number;
  /** Do edges meet a rim segment on it (as on a cell's own wheel)? Off for a wheel with no segments. */
  readonly rim: boolean;
  readonly meaning: string;
  readonly dial: PluginDial | null;
  /** Colours (any CSS colour), by name: the drawing reads them as `view.tokens`. */
  readonly tokens: Readonly<Record<string, string>>;
  /** The drawing, as written. */
  readonly code: string;
  /** One of the app's own (builtinPlugins.ts): trusted, and a piece can't write another of the name. Else the piece's own: trusted only by the user (ui/pluginTrust.ts). */
  readonly builtin: boolean;
  /** The line its block starts on. */
  readonly line: number;
}

export interface PluginSplit {
  /** The piece's text with every plugin block blanked (same number of lines). */
  readonly text: string;
  readonly plugins: readonly ShowPlugin[];
  readonly diagnostics: readonly Diagnostic[];
}

/** A colour, and nothing else: drawings put tokens into style text, so a token must not carry a declaration. */
const COLOUR = /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(?:rgb|rgba|hsl|hsla)\(\s*[-0-9.%\s,/]{1,40}\)|var\(--[a-z0-9-]{1,40}\))$/;

/** What a plugin is trusted by: all of it, manifest and code (the manifest feeds the drawing too). */
export const pluginKey = (p: Pick<ShowPlugin, 'fits' | 'size' | 'rim' | 'meaning' | 'dial' | 'tokens' | 'code'>): string =>
  JSON.stringify([p.fits, p.size, p.rim, p.meaning, p.dial, Object.entries(p.tokens)]) + '\n' + p.code;

const OPEN = /^=== plugin ([a-z]+) ===\s*$/;
const CLOSE = /^=== end ===\s*$/;
export const PLUGIN_SYNTAX = '=== plugin name === … === end ===';

/** Does the text carry a block at all? (the common case costs one scan) */
const HAS = /^=== plugin /m;

export function splitPlugins(source: string, reserved: readonly string[] = [], builtin = false): PluginSplit {
  if (!HAS.test(source)) return { text: source, plugins: [], diagnostics: [] };
  const lines = source.split('\n');
  const plugins: ShowPlugin[] = [];
  const diagnostics: Diagnostic[] = [];
  const fail = (line: number, message: string, severity: 'error' | 'warning' = 'error') =>
    diagnostics.push({ severity, message, span: { line, col: 1, len: Math.max(1, lines[line - 1]?.length ?? 1) } });
  for (let i = 0; i < lines.length; i++) {
    const open = OPEN.exec(lines[i]);
    if (!open) {
      if (CLOSE.test(lines[i])) fail(i + 1, `=== end === without a plugin block before it (${PLUGIN_SYNTAX})`);
      continue;
    }
    const start = i;
    let end = start + 1;
    while (end < lines.length && !CLOSE.test(lines[end])) end++;
    const body = lines.slice(start + 1, end).join('\n');
    const closed = end < lines.length;
    if (!closed) fail(start + 1, `plugin ${open[1]} has no === end === line`);
    const name = open[1];
    if (reserved.includes(name)) fail(start + 1, `${name} is a show of its own: a plugin needs another name`);
    else if (plugins.some((p) => p.name === name)) fail(start + 1, `plugin ${name} is written twice`);
    else {
      const made = readBlock(name, body, start + 1, builtin);
      if (typeof made === 'string') fail(start + 1, `plugin ${name}: ${made}`);
      else plugins.push(made);
    }
    // blank the block (the lines stay, so the cells' line numbers do not move)
    for (let k = start; k <= Math.min(end, lines.length - 1); k++) lines[k] = '';
    i = end;
  }
  return { text: lines.join('\n'), plugins, diagnostics };
}

/** The first `{ … }` of a text, found by balancing braces outside strings; null if there is none. */
function firstObject(text: string): { json: string; rest: string } | null {
  const from = text.indexOf('{');
  if (from < 0 || text.slice(0, from).trim()) return null;
  let depth = 0;
  let quoted = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '\\') i++;
      else if (ch === '"') quoted = false;
    } else if (ch === '"') quoted = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return { json: text.slice(from, i + 1), rest: text.slice(i + 1) };
  }
  return null;
}

/** A block's manifest and code, or what is wrong with it. */
function readBlock(name: string, body: string, line: number, builtin: boolean): ShowPlugin | string {
  const obj = firstObject(body);
  if (!obj) return 'starts with its manifest, a { … } of JSON: { "fits": ["meter"], "size": 200 }';
  let m: unknown;
  try {
    m = JSON.parse(obj.json);
  } catch (e) {
    return `its manifest is not JSON (${(e as Error).message})`;
  }
  if (typeof m !== 'object' || m === null || Array.isArray(m)) return 'its manifest is an object';
  const o = m as Record<string, unknown>;
  const known = ['fits', 'size', 'rim', 'meaning', 'dial', 'tokens'];
  const stray = Object.keys(o).find((k) => !known.includes(k));
  if (stray) return `its manifest has no "${stray}" (it has: ${known.join(', ')})`;
  if (!Array.isArray(o.fits) || !o.fits.length || !o.fits.every((f) => typeof f === 'string')) return '"fits" lists the kinds of cell it shows: ["meter"]';
  const size = o.size ?? 200;
  if (typeof size !== 'number' || !(size >= 60 && size <= 400)) return '"size" is a number from 60 to 400';
  if (o.rim !== undefined && typeof o.rim !== 'boolean') return '"rim" is true or false';
  if (o.meaning !== undefined && typeof o.meaning !== 'string') return '"meaning" is a text';
  let dial: PluginDial | null = null;
  if (o.dial !== undefined) {
    const d = o.dial as Record<string, unknown> | null;
    const ok = d && typeof d === 'object' && typeof d.label === 'string' && typeof d.turn === 'number' && d.turn > 0 && typeof d.key === 'number' && d.key > 0;
    if (!ok) return '"dial" is { "label": "The day", "turn": 86400, "key": 3600 }: a name, seconds for a turn, seconds for a key press';
    dial = { label: d.label as string, turn: d.turn as number, key: d.key as number };
  }
  const tokens: Record<string, string> = {};
  if (o.tokens !== undefined) {
    const t = o.tokens as Record<string, unknown> | null;
    if (!t || typeof t !== 'object' || Object.values(t).some((v) => typeof v !== 'string' || !COLOUR.test(v)))
      return '"tokens" maps names to colours (#rgb, rgb(…), hsl(…), a name, var(--x)): { "sun": "#ffd84a" }';
    Object.assign(tokens, t);
  }
  return {
    name,
    fits: o.fits as string[],
    size,
    rim: o.rim !== false,
    meaning: (o.meaning as string | undefined) ?? '',
    dial,
    tokens,
    code: obj.rest.replace(/^\n+|\s+$/g, ''),
    builtin,
    line,
  };
}
