/**
 * A cells text's notes drawn as a piano roll, for a decision or a review: one panel per text, stacked on one time axis
 * and one pitch axis, a colour per voice (kept across the panels), and, for two panels, the notes one plays and the
 * other doesn't outlined in ink. The picture is an SVG, which needs no browser; `--png` renders it in Chromium's
 * headless shell (Playwright's, `/opt/pw-browsers/`, or CHROME_SHELL) at twice its pixels. The pianoroll skill
 * (.claude/skills/pianoroll/SKILL.md) says when and how.
 *
 *   node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/pianoroll.ts \
 *     [--from 0] [--to 8] [--title "…"] [-o roll.svg] [--png] [--notes notes.json] <input>...
 *
 * An input is `example:<key>` (examples/<key>.md), a `.cells` text, a piece file (`.md`), or a `.json` of notes that `--notes` wrote (from
 * another checkout: the same text under another version of the language), each optionally `label=<input>`.
 * Lifted in spirit from yggi/jambot .claude/skills/screenshot @ ef79048 (inline SVG from the numbers, no library).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileSource } from '../src/engine/compile';
import { PRESETS } from '../src/engine/presets';
import { isPieceFile, readPiece } from '../src/engine/piecefile';
import { codeShifts } from '../src/engine/program';
import { resolveSeed } from '../src/repository/library';
import { eventsBetween, plan } from '../src/engine/realize';

/** A note as the event snapshot reads it: its voice, onset and length in seconds, and its pitch as a MIDI number (A4 = 69, fractional between). */
export interface Note {
  readonly voice: string;
  readonly at: number;
  readonly dur: number;
  readonly pitch: number;
}

/** One panel: a label and the notes it draws. */
export interface Roll {
  readonly label: string;
  readonly notes: readonly Note[];
}

/** The window drawn, in seconds: 8 s by default, a few bars at the examples' tempi. */
export const WINDOW = { from: 0, to: 8 };

/** The notes a cells text plays (its `use` lines read from the seed library) that start in [from, to), with a pitch (a note without one, a noise's, is left out). */
export function notesOf(source: string, from = WINDOW.from, to = WINDOW.to): Note[] {
  const result = compileSource(source, undefined, { resolve: resolveSeed });
  if (!result.ok) throw new Error(`the text doesn't compile: ${result.diagnostics.map((d) => d.message).join('; ')}`);
  return eventsBetween(plan(result, codeShifts(result)), from, to)
    .filter((e) => Number.isFinite(e.freq) && e.freq > 0)
    .map((e) => ({ voice: e.voice, at: e.at, dur: e.dur, pitch: 69 + 12 * Math.log2(e.freq / 440) }));
}

const noteKey = (n: Note) => `${n.voice}|${n.at.toFixed(4)}|${n.dur.toFixed(4)}|${n.pitch.toFixed(2)}`;

/** For each note of `a`, whether `b` lacks it (the same voice, onset, length and pitch), counted as a multiset. */
export function lacking(a: readonly Note[], b: readonly Note[]): boolean[] {
  const left = new Map<string, number>();
  for (const n of b) left.set(noteKey(n), (left.get(noteKey(n)) ?? 0) + 1);
  return a.map((n) => {
    const k = noteKey(n);
    const count = left.get(k) ?? 0;
    if (count > 0) left.set(k, count - 1);
    return count === 0;
  });
}

/** The categorical palette, in its fixed order (the dataviz skill's reference, light): a voice past the eighth is grey. */
export const VOICE_COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHER = '#8f8e88';
const SURFACE = '#fcfcfb';
const INK = '#0b0b0b';
const INK_2 = '#52514e';
const GRID = '#e4e3df';
const C_ROW = '#efeee9';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (x: number) => +x.toFixed(2);

/** The picture: an SVG of the panels, stacked, on one time and pitch axis. With two panels, a note the other lacks is outlined. */
export function pianoRoll(rolls: readonly Roll[], { from = WINDOW.from, to = WINDOW.to, title = '' } = {}): { svg: string; width: number; height: number } {
  const voices: string[] = [];
  for (const roll of rolls) for (const n of roll.notes) if (!voices.includes(n.voice)) voices.push(n.voice);
  const colour = (voice: string) => VOICE_COLOURS[voices.indexOf(voice)] ?? OTHER;
  const pitches = rolls.flatMap((r) => r.notes.map((n) => n.pitch));
  const lo = pitches.length ? Math.floor(Math.min(...pitches)) - 1 : 59;
  const hi = pitches.length ? Math.ceil(Math.max(...pitches)) + 1 : 73;
  const rows = hi - lo + 1;
  const row = Math.max(3, Math.min(12, Math.floor(360 / rows)));
  const left = 44;
  const plotW = 960;
  const width = left + plotW + 16;
  const sx = plotW / (to - from);
  const step = [1, 2, 5, 10, 20, 30, 60].find((s) => (to - from) / s <= 16) ?? 120;
  const outlined = rolls.length === 2 ? [lacking(rolls[0].notes, rolls[1].notes), lacking(rolls[1].notes, rolls[0].notes)] : null;

  const out: string[] = [];
  let y = 8;
  if (title) {
    out.push(`<text x="${left}" y="${y + 16}" font-size="16" font-weight="600" fill="${INK}">${esc(title)}</text>`);
    y += 28;
  }
  // The legend: a swatch per voice, in the order the colours were given, and what an outline means.
  let lx = left;
  const legend = voices.slice(0, VOICE_COLOURS.length).map((v) => ({ name: v, fill: colour(v) }));
  if (voices.length > VOICE_COLOURS.length) legend.push({ name: `${voices.length - VOICE_COLOURS.length} more`, fill: OTHER });
  for (const { name, fill } of legend) {
    out.push(`<rect x="${lx}" y="${y + 3}" width="10" height="10" rx="2" fill="${fill}"/>`);
    out.push(`<text x="${lx + 14}" y="${y + 12}" font-size="11" fill="${INK_2}">${esc(name)}</text>`);
    lx += 14 + 6.5 * name.length + 14;
  }
  if (outlined) {
    out.push(`<rect x="${lx}" y="${y + 3}" width="10" height="10" rx="2" fill="${SURFACE}" stroke="${INK}" stroke-width="1.5"/>`);
    out.push(`<text x="${lx + 14}" y="${y + 12}" font-size="11" fill="${INK_2}">outlined: not in the other panel</text>`);
  }
  y += 22;

  rolls.forEach((roll, i) => {
    const only = outlined?.[i];
    const count = only ? only.filter(Boolean).length : 0;
    const head = `${roll.label}: ${roll.notes.length} notes${only ? `, ${count} not in the other` : ''}`;
    out.push(`<text x="${left}" y="${y + 13}" font-size="12" font-weight="600" fill="${INK}">${esc(head)}</text>`);
    y += 20;
    const top = y;
    const plotH = rows * row;
    const rowY = (p: number) => top + (hi - p) * row;
    // Rows: every C shaded and named, as a reference to read pitches against.
    for (let p = Math.ceil(lo / 12) * 12; p <= hi; p += 12) {
      out.push(`<rect x="${left}" y="${num(rowY(p))}" width="${plotW}" height="${row}" fill="${C_ROW}"/>`);
      out.push(`<text x="${left - 6}" y="${num(rowY(p) + row / 2 + 4)}" font-size="10" text-anchor="end" fill="${INK_2}">C${p / 12 - 1}</text>`);
    }
    for (let t = Math.ceil(from / step) * step; t <= to; t += step) {
      const x = num(left + (t - from) * sx);
      out.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${top + plotH}" stroke="${GRID}" stroke-width="1"/>`);
    }
    out.push(`<rect x="${left}" y="${top}" width="${plotW}" height="${plotH}" fill="none" stroke="${GRID}"/>`);
    roll.notes.forEach((n, j) => {
      const start = Math.max(n.at, from);
      const end = Math.min(n.at + n.dur, to);
      if (end <= start && n.at >= to) return;
      const x = left + (start - from) * sx;
      const w = Math.max(2, (end - start) * sx);
      const h = Math.max(2, row - 1);
      const ny = top + (hi - n.pitch) * row + (row - h) / 2;
      const ring = only?.[j] ? `stroke="${INK}" stroke-width="1.5"` : `stroke="${SURFACE}" stroke-width="1"`;
      out.push(
        `<rect class="note" x="${num(x)}" y="${num(ny)}" width="${num(w)}" height="${num(h)}" rx="${Math.min(2, h / 2)}" fill="${colour(n.voice)}" ${ring}><title>${esc(`${n.voice} ${num(n.at)} s, ${num(n.dur)} s, ${num(n.pitch)}`)}</title></rect>`,
      );
    });
    y = top + plotH + 8;
  });
  // The time axis, once, under the last panel.
  for (let t = Math.ceil(from / step) * step; t <= to; t += step) {
    out.push(`<text x="${num(left + (t - from) * sx)}" y="${y + 8}" font-size="10" text-anchor="middle" fill="${INK_2}">${t === from ? `${t} s` : t}</text>`);
  }
  const height = Math.ceil(y + 18);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">`,
    `<rect width="${width}" height="${height}" fill="${SURFACE}"/>`,
    ...out,
    '</svg>',
    '',
  ].join('\n');
  return { svg, width, height };
}

/** Chromium's headless shell: CHROME_SHELL, else Playwright's. The full browser's `--screenshot` crops its window, so not it. */
export function chromeShell(): string | null {
  if (process.env.CHROME_SHELL) return process.env.CHROME_SHELL;
  return globSync('/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell').sort().at(-1) ?? null;
}

/** Renders the SVG at `svgPath` to `pngPath` at twice its pixels; throws with the browser's words when it can't. */
export function toPng(svgPath: string, pngPath: string, width: number, height: number): void {
  const shell = chromeShell();
  if (!shell) throw new Error('no Chromium headless shell: set CHROME_SHELL, or `npx playwright install chromium-headless-shell`');
  const run = spawnSync(
    shell,
    [
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      `--window-size=${width},${height}`,
      `--screenshot=${pngPath}`,
      pathToFileURL(svgPath).href,
    ],
    { encoding: 'utf8', timeout: 60_000 },
  );
  if (run.status !== 0 || !existsSync(pngPath)) throw new Error(`Chromium didn't render ${svgPath}: ${run.stderr || run.error}`);
}

/** An input's label and notes: `example:<key>`, a `.cells` text, a piece file (`.md`) or a `.json` of notes, optionally `label=<input>`. */
export function readInput(input: string, from = WINDOW.from, to = WINDOW.to): Roll {
  const eq = /^([^=/]+)=(.+)$/.exec(input);
  const [label, what] = eq ? [eq[1], eq[2]] : [null, input];
  if (what.startsWith('example:')) {
    const key = what.slice('example:'.length);
    const source = (PRESETS as Record<string, { source: string } | undefined>)[key]?.source;
    if (source === undefined) throw new Error(`no example ${key}`);
    return { label: label ?? key, notes: notesOf(source, from, to) };
  }
  if (what.endsWith('.json')) {
    const saved = JSON.parse(readFileSync(what, 'utf8')) as Roll;
    return { label: label ?? saved.label, notes: saved.notes.filter((n) => n.at < to && n.at >= from) };
  }
  const text = readFileSync(what, 'utf8');
  const piece = isPieceFile(text) ? readPiece(text) : null;
  if (piece && 'problems' in piece) throw new Error(`${what}: ${piece.problems.map((p) => `line ${p.line}: ${p.message}`).join('; ')}`);
  return { label: label ?? basename(what), notes: notesOf(piece ? piece.text : text, from, to) };
}

/** The command line (the header says how): returns what it wrote. */
export function main(args: readonly string[]): string[] {
  const options = { from: WINDOW.from, to: WINDOW.to, title: '', out: 'pianoroll.svg', png: false, notes: '' };
  const inputs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--from') options.from = Number(args[++i]);
    else if (arg === '--to') options.to = Number(args[++i]);
    else if (arg === '--title') options.title = args[++i];
    else if (arg === '-o') options.out = args[++i];
    else if (arg === '--notes') options.notes = args[++i];
    else if (arg === '--png') options.png = true;
    else inputs.push(arg);
  }
  if (inputs.length === 0 || !(options.to > options.from))
    throw new Error('usage: tools/pianoroll.ts [--from s] [--to s] [--title t] [-o out.svg] [--png] [--notes out.json] <input>...');
  const rolls = inputs.map((input) => readInput(input, options.from, options.to));
  if (options.notes) {
    writeFileSync(options.notes, `${JSON.stringify(rolls[0])}\n`);
    return [options.notes];
  }
  const { svg, width, height } = pianoRoll(rolls, options);
  writeFileSync(options.out, svg);
  if (!options.png) return [options.out];
  const png = options.out.replace(/\.svg$/, '') + '.png';
  toPng(options.out, png, width, height);
  return [options.out, png];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    for (const file of main(process.argv.slice(2))) console.log(file);
  } catch (error) {
    console.error(`pianoroll: ${(error as Error).message}`);
    process.exit(1);
  }
}
