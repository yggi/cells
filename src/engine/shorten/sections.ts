/**
 * A migration (decision 044): a table of sections named `&parts` (decision 016) renamed `&sections`, where no cell has that
 * name. "Part" is Jambot's word for a voice of the band, so the examples' table says what it holds. The name is the
 * author's: only `&parts` is offered, whatever its length, when it plays the same notes (checked here).
 */
import { declLine, renameCell } from '../edit';
import { samePiece, size, type Result, type Suggestion } from './harness';

/** The name the examples' table of sections had, and the one it has. */
const FROM = 'parts';
const TO = 'sections';

/** A table of sections named &parts: its rename to &sections, if it plays the same notes. */
export function sections(source: string, result: Result): Suggestion[] {
  if (![...(result.sections?.values() ?? [])].includes(FROM) || declLine(source, TO) >= 0) return [];
  const apply = (s: string) => renameCell(s, FROM, TO);
  const next = apply(source);
  if (next === source || !samePiece(source, next)) return [];
  const at = declLine(source, FROM);
  return [
    {
      id: `section:${FROM}`,
      kind: 'section',
      title: `&${FROM} is a table of sections: call it &${TO}, as "part" is a voice of the band (decision 044)`,
      before: source.split('\n')[at].trim(),
      after: next.split('\n')[at].trim(),
      saving: size(source) - size(next),
      apply,
    },
  ];
}
