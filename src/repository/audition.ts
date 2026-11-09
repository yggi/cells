/**
 * A fragment heard alone (#640, rung C3 of yggi/cell-studio#621): a fragment doesn't play by itself, since its main
 * parameter is a hole and it has no card, so a host gives it what it lacks, by what the fragment reads and what each head
 * compiles to, never by a name it is expected to have (decision 075):
 *  - **each hole a stand-in:** a tempo, a meter or a key as a piece writes one; a line, stepped; a sound a voice, or the
 *    host's kit's own drum where the kit defines the name (a groove's `&bd`, the kit's vocabulary, decision 065 §3); a
 *    style the fragment picks from (`&style[bite]`), a hole or an optional parameter, a style cell at the point given
 *    (the centre of each axis it leaves out), a parameter's written over its default line as a `from` line's argument is;
 *  - **each head played on one card:** a gate as itself, a line through a voice, a voice playing a line, a meter tapped, a
 *    table read, a sound as it is, an envelope on a voice of its own. A template's heads are its signature's; a
 *    collection's are the cells nothing else in it reads.
 * The host's lines are named apart (`_h…`) and listed, each stand-in with the hole it fills, so a frontend can show and
 * change them. `coreFragment` hears a fragment through the same host, with plain stand-ins (no kit, no style), to core it.
 * Pure.
 */
import { compileSource } from '../engine/compile';
import type { CoreOptions } from '../engine/core';
import { parse } from '../engine/parser';
import type { CompileResult } from '../engine/program';
import { AXES } from '../engine/style';
import { signatureOf } from '../engine/use';
import type { StylePoint } from './fragments';
import { holesOf, type Holes } from './holes';

/** The host's own cells, named so no fragment's are. */
export const HOST = { voice: '_hv', line: '_hl', meter: '_hbar', card: '_hout', read: '_hr' } as const;

/** How a host stands in for a sound and a style: `coreFragment`'s plain one has neither a kit nor a style. */
export interface StandIns {
  /** The id of the kit whose drums stand in for the sounds it defines (`gm_kit`); null for a voice for every sound. */
  readonly kit: string | null;
  /** Where a style the fragment picks from stands: a point on the axes (the centre where an axis is left out); null for none. */
  readonly style: StylePoint | null;
}

/** A stand-in for a hole, by how the fragment reads it. */
function standIn(name: string, sound: boolean, styled: StylePoint | null): string {
  const bare = name.replace(/^&/, '');
  if (styled) return `&${bare} map=style ${AXES.map((a) => `${a.name}=${styled[a.name] ?? (a.range[0] + a.range[1]) / 2}`).join(' ')}`;
  if (sound) return `&${bare} s=sine loop=C4`;
  if (bare === 'tempo') return `&${bare} step=2`;
  if (bare === 'bar') return `&${bare} meter("4/4") step=2`;
  if (bare === 'key') return `&${bare} scale(major)`;
  // (a line, or a part a gate plays: notes that step; a table read with over= reads them as well)
  return `&${bare} step=pulse*2 0 2 4 5`;
}

/** How a head plays on the host's card, by what it compiled to; null where it plays no way the host knows. */
export function entryOf(result: CompileResult, head: string, tap: string): { entry: string; line?: string } | null {
  const c = result.cells.get(head);
  if (!c) return null;
  if (c.map?.kind === 'role' || c.map?.kind === 'adsr' || c.map?.kind === 'style') return null;
  if (c.gate) return { entry: `&${head}` };
  if (c.voice) return { entry: `&${HOST.line} * &${head}` };
  // (a mix, a sound of sounds: played as it is)
  if (c.map?.kind === 'sample' || c.sort === 'signal') return { entry: `&${head}` };
  // (a meter that keeps time, tapped; a table, a key or a mode, read by a line over it)
  if (c.meter && result.clocks.get(head)?.cell === head) return { entry: `&${HOST.read} * &${HOST.voice}`, line: `&${HOST.read} step=&${head}:pulse 0 2 4 5` };
  if (c.meter || c.scan || !c.clock) return { entry: `&${HOST.read} * &${HOST.voice}`, line: `&${HOST.read} over=&${head} step=${tap}pulse*2 0 1 2 3` };
  if (c.steps > 0) return { entry: `&${head} * &${HOST.voice}` };
  return null;
}

/** Why a host plays nothing: none of the heads plays any way the host knows. */
export const NO_HEAD = 'no head plays in a host';

/** A text and its host, as the host is built: before its card (to read what each head compiles to) and with it. */
export interface Hosted {
  /** The fragment's text (an argument the host gives written over its parameter's default line), then the host's lines. */
  readonly source: string;
  readonly holes: Holes;
  /** The host's lines, as written after the fragment's: each stand-in with the hole it fills, the host's own with none. */
  readonly lines: readonly { readonly line: string; readonly fills: string | null }[];
  /** The heads it plays. */
  readonly heads: readonly string[];
  /** Did the host write a meter of its own (the fragment taps one it doesn't define, and doesn't read `&bar`)? */
  readonly meterless: boolean;
  /** Why nothing plays: no head the host can play, or a host that doesn't compile; absent where it plays. */
  readonly why?: string;
}

/** The cells a text declares that nothing else in it reads. */
function roots(text: string): string[] {
  const names = parse(text)
    .cells.filter((d) => !d.lambda)
    .map((d) => d.name);
  return names.filter((n) => !text.split('\n').some((l) => !new RegExp(`^\\s*&${n}(?![A-Za-z0-9_])`).test(l) && new RegExp(`&${n}(?![A-Za-z0-9_])`).test(l)));
}

/**
 * What a fragment gives, read off its structure and never off a name (decision 075): a template's heads, its
 * signature's; a collection's, the cells nothing else in it reads (a groove's mix, a kit's drums). Bare names, in the
 * order written. No compile.
 */
export function headsOf(text: string): string[] {
  const sig = signatureOf(text);
  return sig ? sig.names.map((n) => n.replace(/^&/, '')) : roots(text);
}

/**
 * A text in its host (see the module's comment): what `audition` gives and `coreFragment` cores. `heads`: the heads to
 * play, by default the signature's, else the cells nothing reads.
 */
export function hosted(given: string, standIns: StandIns, options: CoreOptions = {}, heads?: readonly string[]): Hosted {
  let text = given;
  const compiled = (t: string) => compileSource(t, undefined, options);
  const holes = holesOf(text, compiled, options.resolve);
  const sig = signatureOf(text);
  const playing = heads ?? headsOf(text);
  const lines: { line: string; fills: string | null }[] = [];
  // (the sounds the kit defines, taken from it by name; the rest stood in)
  const kitText = standIns.kit ? options.resolve?.(standIns.kit) : null;
  const kitNames = kitText ? new Set(parse(kitText).cells.map((d) => `&${d.name}`)) : new Set<string>();
  const fromKit = holes.uses.filter((u) => holes.sounds.includes(u) && kitNames.has(u));
  if (fromKit.length) lines.push({ line: `${fromKit.join(', ')} from ${standIns.kit}`, fills: fromKit.join(', ') });
  const axes = AXES.map((a) => a.name).join('|');
  for (const u of holes.uses.filter((x) => !fromKit.includes(x))) {
    const styled = standIns.style && new RegExp(`${u}\\[(?:${axes})\\]`).test(text) ? standIns.style : null;
    lines.push({ line: standIn(u, holes.sounds.includes(u), styled), fills: u });
  }
  // (an optional parameter the fragment picks a style from takes the point given, as a from line's argument would: its
  // default line written over)
  if (standIns.style && sig)
    for (const p of sig.optional.filter((o) => new RegExp(`${o}\\[(?:${axes})\\]`).test(text))) {
      const line = standIn(p, false, standIns.style);
      const own = new RegExp(`^\\s*${p}(?![A-Za-z0-9_]).*$`, 'm');
      if (own.test(text)) {
        text = text.replace(own, line);
        lines.push({ line, fills: p });
      }
    }
  const declares = (t: string, name: string) => parse(t).cells.some((d) => d.name === name);
  lines.push({ line: `&${HOST.voice} s=sine loop=C4`, fills: null });
  // (a line the host plays through needs a meter to tap: the fragment's own, or the host's)
  const meterless = !holes.uses.includes('&bar') && !declares(text, 'bar');
  if (meterless) lines.push({ line: `&${HOST.meter} meter("4/4") step=2`, fills: null });
  lines.push({ line: `&${HOST.line} step=${meterless ? `&${HOST.meter}:` : ''}pulse*2 0 2 4 5`, fills: null });
  // (the lines after the text: an argument's line is written over its default, in the text)
  const written = () => lines.filter((l) => !(l.fills && text.split('\n').includes(l.line))).map((l) => l.line);
  const first = compiled([text, ...written()].join('\n'));
  const tap = meterless ? `&${HOST.meter}:` : '';
  let reads = 0;
  const entries = playing.flatMap((h) => {
    const e = entryOf(first, h, tap);
    // (a second head read by a line: a reader of its own, the first keeping the host's name)
    if (e?.line && reads++ > 0) {
      const r = `${HOST.read}_${h}`;
      const own = new RegExp(`&${HOST.read}(?![A-Za-z0-9_])`, 'g');
      return [{ entry: e.entry.replace(own, `&${r}`), line: e.line.replace(own, `&${r}`) }];
    }
    if (e) return [e];
    // (an envelope, heard on a voice of its own; only where the host has a kit or a style: coreFragment's has none)
    if ((standIns.kit || standIns.style) && first.cells.get(h)?.map?.kind === 'adsr') {
      const v = `${HOST.voice}_${h}`;
      return [{ entry: `&${HOST.line} * &${v}`, line: `&${v} s=tri loop=C4 env=&${h}` }];
    }
    return [];
  });
  const done = (why?: string): Hosted => ({ source: [text, ...written()].join('\n'), holes, lines, heads: playing, meterless, ...(why ? { why } : {}) });
  if (!entries.length) return done(NO_HEAD);
  for (const e of entries) if (e.line) lines.push({ line: e.line, fills: null });
  lines.push({ line: `&${HOST.card} map=sample [${entries.map((e) => e.entry).join(', ')}]`, fills: null });
  const r = compiled([text, ...written()].join('\n'));
  if (!r.ok) return done(`the host doesn’t compile: ${r.diagnostics.find((d) => d.severity === 'error')?.message ?? ''}`);
  return done();
}

/** What `audition` is told: how to read the library, and where a style the fragment picks from stands. */
export interface AuditionOptions extends CoreOptions {
  /** The point a style the fragment reads stands at (`{ bite: .8 }`); the centre of each axis it leaves out. */
  readonly style?: StylePoint;
  /** The kit whose drums stand in for the sounds it defines; `gm_kit` by default, null for a sine voice for every sound. */
  readonly kit?: string | null;
}

/** A fragment heard alone: the text that plays, the host's lines (each stand-in with the hole it fills), the heads it plays. */
export interface Audition {
  /** The fragment's text (an argument the host gives written over its parameter's default line), then the host's lines: what a frontend plays. */
  readonly text: string;
  readonly host: readonly { readonly line: string; readonly fills: string | null }[];
  readonly heads: readonly string[];
  /** Why it doesn't play (no head the host can play; a host that doesn't compile); absent where it plays. */
  readonly why?: string;
}

/** A fragment's text heard alone (see the module's comment). */
export function audition(text: string, options: AuditionOptions = {}): Audition {
  const { style = {}, kit = 'gm_kit', ...rest } = options;
  const h = hosted(text, { kit, style }, rest);
  return { text: h.source, host: h.lines, heads: h.heads, ...(h.why ? { why: h.why } : {}) };
}
