/**
 * Defaults: an attribute that says what would be so without it — the sound card's loop=SAMPLE_RATE,
 * a turning table's cycle= equal to its own length (decision 008), pan=.5 (the centre).
 */
import { attrsOf, setAttr } from '../edit';
import { measured, samePiece, type Result, type Suggestion } from './harness';

export function defaults(source: string, result: Result): Suggestion[] {
  const out: Suggestion[] = [];
  const offer = (name: string, key: string, why: string) => {
    const value = attrsOf(source, name).get(key);
    const s = measured(source, {
      id: `default:${name}:${key}`,
      kind: 'default',
      title: `&${name}: ${key}=${value} is ${why} — leave it out`,
      before: `${key}=${value}`,
      after: '',
      apply: (src) => setAttr(src, name, key, null),
    });
    if (s && samePiece(source, s.apply(source))) out.push(s);
  };
  for (const c of result.cells.values()) {
    if (c.implicit || c.lambda) continue;
    const attrs = attrsOf(source, c.name);
    if (c.sink && attrs.get('loop') === 'SAMPLE_RATE') offer(c.name, 'loop', 'what the sound card turns at anyway');
    // (a grid's cycle= is its size, not a turn: only a table that turns)
    if (attrs.has('cycle') && c.step && !c.map && c.wrap !== null && c.wrap === (c.units.length || c.cycle))
      offer(c.name, 'cycle', 'its own length: a turning table comes round there anyway');
    if (attrs.get('pan') !== undefined && Number(attrs.get('pan')) === 0.5) offer(c.name, 'pan', 'the centre');
  }
  return out;
}
