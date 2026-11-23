// notesOf (#715): the six-call chain a frontend ran (`windowAt` → `router(channelTable)` → `routesOf` → `midiNote`), in one, each note
// with its output, voice and reading.
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from './examples';
import { planOf } from './host';
import { channelTable, midiNote, router, routesOf } from './midi';
import { readerOf } from './perform/feel';
import { windowAt } from './schedule';
import { notesOf } from './notesof';
import { resolveSeed } from '../repository/library';

const chain = (text: string, to: number) => {
  const p = planOf(text, undefined, { resolve: resolveSeed });
  const route = router(p.result, channelTable(p.result));
  return windowAt(p, 0, to).events.flatMap((e) => routesOf(route(e)).flatMap((r) => (midiNote(e, r) ? [midiNote(e, r)!] : [])));
};

describe('notesOf', () => {
  it('gives, for every example, the notes the chain gives, 100 %: channel, key, velocity, start and end', () => {
    let notes = 0;
    let examples = 0;
    for (const e of Object.values(EXAMPLES)) {
      const p = planOf(e.source, undefined, { resolve: resolveSeed });
      if (!p.result.ok) continue;
      const got = notesOf(p, { to: 8 }).map(({ channel, note, velocity, at, end, bend, bends }) => ({ channel, note, velocity, at, end, bend, bends }));
      expect(got).toEqual(chain(e.source, 8));
      notes += got.length;
      examples++;
    }
    expect(examples).toBeGreaterThan(50);
    expect(notes).toBeGreaterThan(1000);
  });

  it('carries the output and voice of each note and the part and role its text declares, and a span that starts later starts there', () => {
    const text = [
      '&bar meter("4/4") step=120bpm',
      '&bd note=36 s=sine loop=A1',
      '&k role=kick step=4n &bd!4',
      '&low part=bass step=4n 0 2',
      '&v loop=C2',
      '&out map=midi(10) [&k]',
      '&bass map=midi(2) [&low * &v]',
    ].join('\n');
    const p = planOf(text);
    const all = notesOf(p, { to: 2 });
    const drums = all.filter((n) => n.channel === 10);
    expect(drums.length).toBeGreaterThan(0);
    expect(drums.every((n) => n.reading?.part === 'drums' && n.reading.role === 'kick' && n.output?.startsWith('kit:voices:k'))).toBe(true);
    const bass = all.filter((n) => n.channel === 2);
    expect(bass.every((n) => n.reading?.part === 'bass' && n.voice === 'v')).toBe(true);
    expect(notesOf(p, { from: 1, to: 2 }).every((n) => n.at >= 1 - 1e-9)).toBe(true);
    expect(readerOf(p.result)(drums[0]!.output)).toEqual(drums[0]!.reading);
  });
});
