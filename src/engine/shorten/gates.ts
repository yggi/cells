/**
 * A gate in the old spelling (decision 023): `&leadOut trigger=&tune velocity=&accent gate=&duck gain=.4 &lead &bell`
 * rewritten as `&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]`: play= for trigger=, one level= for the
 * three levels, and the voices it plays all of as a chord (several bare voices are a kit now, the notes picking one).
 * Not always shorter: a migration, offered whatever its length when it plays the same notes (checked here).
 */
import { attrsOf, declLine, declWords, setAttr, setBraid } from '../edit';
import { samePiece, size, type Result, type Suggestion } from './harness';

/** The rewrite of one gate written the old way, or null (not one, or its line can't be rewritten in place). */
function rewrite(source: string, name: string): string | null {
  const a = attrsOf(source, name);
  const w = declWords(source, name);
  const at = declLine(source, name);
  if (!a.has('trigger') || !w || at < 0) return null;
  const level = [a.get('velocity'), a.get('gate'), a.get('gain')].filter((x): x is string => !!x && x !== '1');
  let next = source;
  for (const k of ['velocity', 'gate', 'gain']) next = setAttr(next, name, k, null);
  const lines = next.split('\n');
  lines[at] = lines[at].replace(/(\s)trigger=(\S+)/, (_, sp: string, notes: string) => `${sp}play=${notes}${level.length ? ` level=${level.join('*')}` : ''}`);
  next = lines.join('\n');
  // (several voices, all played: a chord of them)
  if (w.braid.length > 1) next = setBraid(next, name, [`[${w.braid.join(', ')}]`]);
  return next;
}

/** Each gate written the old way: its rewrite, if it plays the same notes. */
export function gates(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of result.cells.values()) {
    if (c.gate?.port !== 'trigger') continue;
    const next = rewrite(source, c.name);
    if (next === null || !samePiece(source, next)) continue;
    const at = declLine(source, c.name);
    out.push({
      id: `gate:${c.name}`,
      kind: 'gate',
      title: `&${c.name} is a gate written the old way: play= for trigger=, one level= for velocity=, gate= and gain=, the voices it plays all of as a chord`,
      before: source.split('\n')[at].trim(),
      after: next.split('\n')[at].trim(),
      saving: size(source) - size(next),
      apply: (s) => rewrite(s, c.name) ?? s,
    });
  }
  return out;
}
