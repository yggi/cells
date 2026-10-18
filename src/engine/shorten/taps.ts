/**
 * A migration (decision 040): a line stepped by a meter cell's own steps (`step=&bar*2`) rewritten as the tap of the
 * meter that says the same (`step=8n`, `step=pulse*3/4`, `step=1m/4`, `step=&swing:pulse`): the tap the compiler's
 * warning names. Offered whatever its length when it plays the same notes (checked here).
 */
import { declLine, setAttr } from '../edit';
import { tapFor } from '../compiler/clocks';
import { samePiece } from '../sameness';
import type { Result, ShortenRewrite } from './harness';

/** The tap that says what &name's step= says (slowed `by` times, for the fractions), or null (not stepped by a meter's own steps). */
export function tapOfRaw(result: Result, name: string, by = 1): string | null {
  const c = result.cells.get(name);
  const st = c?.step;
  if (!st || st.tap || st.whole || st.cycle) return null;
  const m = result.cells.get(st.driver)?.meter;
  if (!m || !result.clocks.has(st.driver) || result.clocks.get(st.driver)!.belt) return null;
  const ratio = st.chain.reduce((r, o) => (o.op === '×' ? r * o.n : r / o.n), 1) / by;
  // (a meter stepped by another, scan(2 1) step=&bar: its pulses are its steps, no note value)
  const rooted = !result.cells.get(st.driver)?.step;
  const tap = tapFor(m.levels.length, m.pulses, rooted ? m.unit : 0, ratio);
  return result.mainMeter === st.driver ? tap : `&${st.driver}:${tap}`;
}

/** Each line stepped by a meter's own steps: its tap, if it plays the same notes. */
export function taps(source: string, result: Result): ShortenRewrite[] {
  const out: ShortenRewrite[] = [];
  const seen = new Set<string>();
  for (const c of result.cells.values()) {
    const tap = tapOfRaw(result, c.name);
    // (a section, decision 016, is stepped as its table is: the table's line says it)
    const line = result.sections?.get(c.name) ?? c.name;
    if (tap === null || seen.has(line) || declLine(source, line) < 0) continue;
    seen.add(line);
    const apply = (s: string) => setAttr(s, line, 'step', tap);
    const next = apply(source);
    if (next === source || !samePiece(source, next)) continue;
    const at = declLine(source, line);
    out.push({
      id: `tap:${line}`,
      tool: 'migrate',
      rule: 'tap',
      title: `&${line} steps by the meter cell's own steps: tap the meter instead, step=${tap} (decision 040)`,
      before: source.split('\n')[at].trim(),
      after: next.split('\n')[at].trim(),
      apply,
    });
  }
  return out;
}
