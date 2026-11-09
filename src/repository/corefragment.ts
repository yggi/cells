/**
 * A fragment cored up to its signature (#590, decision 077 §2). A fragment alone doesn't play: its main parameter is a
 * hole, and it has no card, so S1 hears none of its rewrites. So it is cored in a host:
 *  - each hole a stand-in: a sound a voice, a line a stepped line, a meter, a tempo or a key as a piece writes one;
 *  - each head played on a card, by its sort: a gate as itself, a line through a voice, a voice playing a line, a meter
 *    tapped, a table read;
 *  - the whole cored with the signature's names and the host's as its interface.
 * The host's lines are then taken off again: what is left is the fragment's core, its signature line as written, its
 * heads and parameters by name. Where no head plays in the host, or the host doesn't compile, the fragment is its own
 * core, and the reason says so. Pure.
 */
import { compileSource } from '../engine/compile';
import { toCore, type CoreOptions } from '../engine/core';
import { declLine, deleteCell, splitComment } from '../engine/edit';
import { parse } from '../engine/parser';
import type { CompileResult } from '../engine/program';
import { readFrom } from '../engine/parser/use';
import { signatureOf } from '../engine/use';
import { holesOf } from './holes';

/** A fragment's core, and why it is the text as written where it is. */
export interface FragmentCore {
  readonly source: string;
  /** Why nothing was cored (no signature, no host that plays): absent where it was. */
  readonly why?: string;
}

/** The host's own cells, named so no fragment's are. */
const H = { voice: '_hv', line: '_hl', meter: '_hbar', card: '_hout', read: '_hr' } as const;

/** A stand-in for a hole, by how the fragment reads it. */
function standIn(name: string, sound: boolean): string {
  const bare = name.replace(/^&/, '');
  if (sound) return `&${bare} s=sine loop=C4`;
  if (bare === 'tempo') return `&${bare} step=2`;
  if (bare === 'bar') return `&${bare} meter("4/4") step=2`;
  if (bare === 'key') return `&${bare} scale(major)`;
  // (a line, or a part a gate plays: notes that step; a table read with over= reads them as well)
  return `&${bare} step=pulse*2 0 2 4 5`;
}

/** How a head plays on the host's card, by what it compiled to; null where it plays no way the host knows. */
function entryOf(result: CompileResult, head: string): { entry: string; line?: string } | null {
  const c = result.cells.get(head);
  if (!c) return null;
  if (c.map?.kind === 'role' || c.map?.kind === 'adsr' || c.map?.kind === 'style') return null;
  if (c.gate) return { entry: `&${head}` };
  if (c.voice) return { entry: `&${H.line} * &${head}` };
  // (a mix, a sound of sounds: played as it is)
  if (c.map?.kind === 'sample' || c.sort === 'signal') return { entry: `&${head}` };
  // (a meter that keeps time, tapped; a table, a key or a mode, read by a line over it)
  if (c.meter && result.clocks.get(head)?.cell === head) return { entry: `&${H.read} * &${H.voice}`, line: `&${H.read} step=&${head}:pulse 0 2 4 5` };
  if (c.meter || c.scan || !c.clock) return { entry: `&${H.read} * &${H.voice}`, line: `&${H.read} over=&${head} step=&${H.line}:pulse 0 1 2 3` };
  if (c.steps > 0) return { entry: `&${head} * &${H.voice}` };
  return null;
}

/** A text with the cells nothing reads taken off, again until none is left; `keep`'s stay. */
function unreadGone(text: string, keep: ReadonlySet<string>): string {
  let now = text;
  for (let gone = true; gone;) {
    gone = false;
    for (const d of parse(now).cells) {
      if (keep.has(d.name)) continue;
      const ref = new RegExp(`&${d.name}(?![A-Za-z0-9_])`);
      const own = declLine(now, d.name);
      if (!now.split('\n').some((l, i) => i !== own && ref.test(l))) {
        now = deleteCell(now, d.name);
        gone = true;
      }
    }
  }
  return now;
}

/** A fragment's core up to its signature, heard through a host (see the module's comment). */
export function coreFragment(text: string, options: CoreOptions = {}): FragmentCore {
  const sig = signatureOf(text);
  if (!sig) return { source: text, why: 'no signature: a collection is cored as a piece' };
  const compiled = (t: string) => compileSource(t, undefined, options);
  const holes = holesOf(text, compiled, options.resolve);
  const stands = holes.uses.map((u) => standIn(u, holes.sounds.includes(u)));
  const declares = (t: string, name: string) => parse(t).cells.some((d) => d.name === name);
  const base = [text, ...stands, `&${H.voice} s=sine loop=C4`];
  // (a line the host plays through needs a meter to tap: the piece's own, or the host's)
  const meterless = !holes.uses.includes('&bar') && !declares(text, 'bar');
  if (meterless) base.push(`&${H.meter} meter("4/4") step=2`);
  base.push(`&${H.line} step=${meterless ? `&${H.meter}:` : ''}pulse*2 0 2 4 5`);
  const first = compiled(base.join('\n'));
  const heads = sig.names.map((n) => n.replace(/^&/, ''));
  const entries = heads.flatMap((h) => {
    const e = entryOf(first, h);
    return e ? [e] : [];
  });
  if (!entries.length) return { source: text, why: 'no head plays in a host: nothing to hear its rewrites by' };
  const host = [...base, ...entries.flatMap((e) => (e.line ? [e.line.replace(`step=&`, `step=&`)] : [])), `&${H.card} map=sample [${entries.map((e) => e.entry).join(', ')}]`].join(
    '\n',
  );
  const hosted = compiled(host);
  if (!hosted.ok) return { source: text, why: `the host doesn’t compile: ${hosted.diagnostics.find((d) => d.severity === 'error')?.message ?? ''}` };
  const hostNames = [...holes.uses.map((u) => u.replace(/^&/, '')), ...Object.values(H)];
  // (what it takes from another fragment, its instrument or a kit's drums, a piece may give in its place: `&bassV`
  // written in a score is the bass's voice, decision 065; kept by name, as the signature's)
  const taken = text.split('\n').flatMap((l) => {
    const f = readFrom(splitComment(l)[0].trim());
    return f && f.kind !== 'signature' ? (f.names ?? []) : [];
  });
  const kept = [...sig.names, ...sig.optional, ...(sig.main ? [sig.main] : []), ...taken, ...hostNames.map((n) => `&${n}`)];
  // (a meter the fragment doesn't define is its piece's: a tap read against the host's would be the host's, so it stays)
  let core = toCore(host, { ...options, interface: kept, ...(meterless || holes.uses.includes('&bar') ? { skip: ['taps'] } : {}) }).source;
  // (the host's lines off again: its stand-ins and its own cells, and what the fold made of them that nothing reads now)
  for (const n of hostNames) if (declLine(core, n) >= 0) core = deleteCell(core, n);
  const interfaceNames = new Set(kept.map((n) => n.replace(/^&/, '')));
  core = unreadGone(core, interfaceNames);
  // (what it takes from another fragment back as its `from` line: the cells the core wrote in off, with what only they
  // read, and the line as written, so a piece that gives its own `&bassV` still gives it)
  const fromLines = text.split('\n').filter((l) => {
    const f = readFrom(splitComment(l)[0].trim());
    return !!f && f.kind !== 'signature';
  });
  for (const n of taken.map((t) => t.replace(/^&/, ''))) if (declLine(core, n) >= 0) core = deleteCell(core, n);
  core = unreadGone(core, new Set([...interfaceNames].filter((n) => !taken.includes(`&${n}`))));
  // (the signature line as written, where Normalise moved or rewrote it, and the from lines after it)
  const sigLine = text.split('\n').find((l) => readFrom(splitComment(l)[0].trim())?.kind === 'signature')!;
  const lines = core.split('\n').filter((l) => readFrom(splitComment(l)[0].trim()) === undefined);
  return { source: [sigLine.trim(), ...fromLines.map((l) => l.trim()), ...lines].join('\n').replace(/\n+$/, '') };
}
