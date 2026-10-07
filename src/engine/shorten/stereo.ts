/**
 * Stereo twins: a sound card with two chords, [left] [right], that hold the same entries with
 * different gains is one chord and a pan= on each voice (decision 007). Offered when every entry's
 * sound is a voice heard nowhere else, and each pan is exact (three decimals at most).
 */
import { declLine, declWords, setAttr, splitComment } from '../edit';
import { measured, samePiece, type Result, type Suggestion } from './harness';

/** Split at a separator outside brackets and parentheses. */
function splitTop(text: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '[' || ch === '(') depth++;
    if (ch === ']' || ch === ')') depth--;
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/** The chords written on a line after map=sample: `[a, b] [c, d]` → [['a','b'], ['c','d']], or null. */
function chordsOf(text: string): string[][] | null {
  const chords: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '[') {
      if (depth === 0) cur = '';
      else cur += ch;
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) chords.push(cur);
      else cur += ch;
    } else if (depth > 0) cur += ch;
    else if (!/\s/.test(ch)) return null;
  }
  return depth === 0 ? chords.map((c) => splitTop(c, ',')) : null;
}

const NUMBER = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
/** An entry as its factors without numbers (its sound), and the product of its numbers (its gain). */
const entryOf = (e: string) => {
  const fs = splitTop(e, '*');
  return { sound: fs.filter((f) => !NUMBER.test(f)).join(' * '), gain: fs.filter((f) => NUMBER.test(f)).reduce((a, f) => a * parseFloat(f), 1), factors: fs };
};
/** How a pan is written: .35, 0, 1. */
const written = (p: number) => String(+p.toFixed(3)).replace(/^0\./, '.');

export function stereo(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  const lines = source.split('\n');
  for (const card of result.cells.values()) {
    if (!card.sink) continue;
    // the whole declaration, its continued lines joined
    const first = declLine(source, card.name);
    if (first < 0) continue;
    let last = first;
    while (last + 1 < lines.length && /[+*,[]\s*$/.test(splitComment(lines[last])[0])) last++;
    const [head, comment] = splitComment(lines[first]);
    const whole = [head, ...lines.slice(first + 1, last + 1).map((l) => splitComment(l)[0])].join(' ');
    const at = whole.search(/\[/);
    const words = declWords(source, card.name);
    if (at < 0 || !words) continue;
    const chords = chordsOf(whole.slice(at));
    if (!chords || chords.length !== 2 || chords[0].length !== chords[1].length) continue;
    const [L, R] = chords.map((c) => c.map(entryOf));
    if (L.some((e, i) => e.sound !== R[i].sound)) continue;
    // each entry's sound a voice of its own, heard in no other mix (pan= places it everywhere)
    const voiceOf = (sound: string) => {
      const names = [...sound.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[(^])/g)].map((m) => m[1]);
      const vs = names.filter((n) => {
        const c = result.cells.get(n);
        return !!c && c.voice && !c.kit && Object.keys(c.params).length > 0;
      });
      return vs.length === 1 ? vs[0] : null;
    };
    const voices = L.map((e) => voiceOf(e.sound));
    if (voices.some((v) => v === null) || new Set(voices).size !== voices.length) continue;
    const elsewhere = (v: string) =>
      [...result.cells.values()].some((c) => c.name !== card.name && (c.mix ?? []).some((b) => b.voice.name === v || b.pitches.some((t) => t.ref.name === v)));
    if (voices.some((v) => elsewhere(v!) || result.cells.get(v!)!.params.pan !== undefined)) continue;
    // one gain and one pan for each: the louder side as written, the other side by the pan
    const pans = L.map((l, i) => {
      const r = R[i];
      return l.gain === r.gain ? 0.5 : r.gain < l.gain ? r.gain / (2 * l.gain) : 1 - l.gain / (2 * r.gain);
    });
    if (pans.some((p) => Math.abs(p * 1000 - Math.round(p * 1000)) > 1e-9)) continue;
    const entries = L.map((l, i) => (R[i].gain > l.gain ? chords[1][i] : chords[0][i]));
    const apply = (src: string) => {
      const ls = src.split('\n');
      const prefix = whole.slice(0, at).trimEnd();
      ls.splice(first, last - first + 1, `${prefix} [${entries.join(', ')}]${comment ? ' ' + comment : ''}`);
      let next = ls.join('\n');
      voices.forEach((v, i) => {
        if (pans[i] !== 0.5) next = setAttr(next, v!, 'pan', written(pans[i]));
      });
      return next;
    };
    const s = measured(source, {
      id: `pan:${card.name}`,
      kind: 'pan',
      title: `&${card.name}'s two chords hold the same sounds at different gains: one chord, and each voice placed with pan=`,
      before: '[…] […]',
      after: voices.map((v, i) => `&${v} pan=${written(pans[i])}`).join(' · '),
      apply,
    });
    if (s && samePiece(source, s.apply(source))) out.push(s);
  }
  return out;
}
