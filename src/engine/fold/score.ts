/**
 * The ratchet's measures (#307, docs/notes/ratchet.md): what a piece plays, the size of its score, and its phrases, so a
 * piece written by hand and the same notes folded by a tool can be compared. Shared by the gate
 * (`fold/ratchet.test.ts`) and the probe (`tools/probe/ratchet.test.ts`). Pure.
 */
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { noteOf } from '../midi';
import { flatten } from '../flatten';
import { candidates } from '../shorten/harness';

/** A phrase: at least this many notes. */
const PHRASE = 5;

/**
 * The score's size: the characters of the cells that hold notes and time (braids, tables, meters, kits), without
 * labels, comments, tags, spaces in runs or blank lines; voices, mixes, effects and notes about the piece left out
 * (a flat piece has stock voices, so they don't compare).
 */
export function bare(source: string): number {
  const r = compileSource(source);
  const sound = new Set([...r.cells.values()].filter((c) => c.voice || c.mix || c.sink || c.map || c.note || c.name === 'piece').map((c) => c.name));
  return source
    .split('\n')
    .map((l) =>
      l
        .replace(/(^|\s)#.*$/, '')
        .replace(/\s(label|tags|title|show|tier|level)=("[^"]*"|\S+)/g, '')
        .replace(/\sabout=(\([^)]*\)|&\w+)/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter((l) => l && !sound.has(/^&(\w+)/.exec(l)?.[1] ?? ''))
    .join('\n').length;
}

/** What a piece plays over [0, seconds): key and start, in order. */
export function heard(source: string, seconds: number) {
  const r = compileSource(source);
  const p = plan(r, codeShifts(r), r.off);
  return eventsBetween(p, 0, seconds)
    .filter((e) => e.freq > 0)
    .map((e) => ({ key: noteOf(e.freq).note, at: e.at }))
    .sort((a, b) => a.at - b.at || a.key - b.key);
}
/** Do two pieces play the same notes (the same keys, each start within 10 ms)? If not, how they differ. */
export function same(a: { key: number; at: number }[], b: { key: number; at: number }[]): boolean {
  return differ(a, b) === '';
}
export function differ(a: { key: number; at: number }[], b: { key: number; at: number }[]): string {
  if (a.length !== b.length) return `${b.length} notes for ${a.length}`;
  const keys = a.filter((n, i) => n.key !== b[i]!.key).length;
  const late = a.reduce((m, n, i) => Math.max(m, Math.abs(n.at - b[i]!.at)), 0);
  return keys ? `${keys} keys` : late >= 0.01 ? `off by ${Math.round(late * 1000)} ms` : '';
}

/** Each phrase cell's signature: its onsets and lengths (steps from its first), and its top line's contour. */
export function phrases(source: string): Map<string, string> {
  const { result, cells } = candidates(source);
  const shifts = codeShifts(result);
  const out = new Map<string, string>();
  for (const c of cells) {
    let events;
    try {
      events = flatten(result, c.name, shifts);
    } catch {
      continue;
    }
    // (the top line: the highest number at each onset)
    const top = new Map<number, { step: number; duration: number; value: number }>();
    for (const e of events) {
      const v = e.value + e.alter;
      const t = top.get(e.step);
      if (!t || v > t.value) top.set(e.step, { step: e.step, duration: e.duration, value: v });
    }
    const line = [...top.values()].sort((a, b) => a.step - b.step);
    if (line.length < PHRASE) continue;
    const s0 = line[0]!.step;
    const rhythm = line.map((n) => `${+(n.step - s0).toFixed(4)}:${+n.duration.toFixed(4)}`).join(' ');
    const contour = line
      .slice(1)
      .map((n, i) => Math.sign(n.value - line[i]!.value))
      .join('');
    out.set(c.name, `${rhythm}|${contour}`);
  }
  return out;
}
