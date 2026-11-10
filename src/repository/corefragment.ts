/**
 * A fragment cored up to its signature (#590, decision 077 §2). A fragment alone doesn't play: its main parameter is a
 * hole, and it has no card, so S1 hears none of its rewrites. So it is cored in a host, `audition.ts`'s, with plain
 * stand-ins (a voice for every sound, no style):
 *  - each hole a stand-in: a sound a voice, a line a stepped line, a meter, a tempo or a key as a piece writes one;
 *  - each head played on a card, by its sort: a gate as itself, a line through a voice, a voice playing a line, a meter
 *    tapped, a table read;
 *  - the whole cored with the signature's names and the host's as its interface.
 * The host's lines are then taken off again: what is left is the fragment's core, its signature line as written, its
 * heads and parameters by name. Where no head plays in the host, or the host doesn't compile, the fragment is its own
 * core, and the reason says so. Pure.
 */
import { toCore, type CoreOptions } from '../engine/core';
import { declLine, deleteCell, splitComment } from '../engine/edit';
import { parse } from '../engine/parser';
import { readFrom } from '../engine/parser/use';
import { signatureOf } from '../engine/use';
import { headsOf, hosted, HOST, NO_HEAD } from './audition';

/** A fragment's core, and why it is the text as written where it is. */
export interface FragmentCore {
  readonly source: string;
  /** Why nothing was cored (no signature, no host that plays): absent where it was. */
  readonly why?: string;
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
        // (a line it can't take off alone, one of a line's several heads: left, and the loop ends)
        const next = deleteCell(now, d.name);
        if (next !== now) {
          now = next;
          gone = true;
        }
      }
    }
  }
  return now;
}

/** A fragment's core up to its signature, heard through a host (see the module's comment). */
export function coreFragment(text: string, options: CoreOptions = {}): FragmentCore {
  const sig = signatureOf(text);
  if (!sig) return { source: text, why: 'no signature: a collection is cored as a piece' };
  const h = hosted(text, { kit: null, style: null }, options, headsOf(text));
  if (h.why) return { source: text, why: h.why === NO_HEAD ? `${NO_HEAD}: nothing to hear its rewrites by` : h.why };
  const { holes, meterless, source: host } = h;
  const hostNames = [...holes.uses.map((u) => u.replace(/^&/, '')), ...Object.values(HOST)];
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
