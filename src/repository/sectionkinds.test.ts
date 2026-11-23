// The section kinds are the library's (#851): the ids of `fragments/sections/`, and the feel plays any of them as a
// groove is played but a breakdown.
import { describe, expect, it } from 'vitest';
import { feelOf, played, type DrumRole, type FeelEvent, type FeelFrame, type FeelPart } from '../engine/perform/feel';
import { SECTION_KINDS } from './library';

const isSectionKind = (v: unknown): boolean => typeof v === 'string' && SECTION_KINDS.includes(v);

describe('the section kinds', () => {
  it('are the nine fragments of the facet section, and nothing else is one', () => {
    expect([...SECTION_KINDS].sort()).toEqual(['breakdown', 'bridge', 'build', 'chorus', 'drop', 'groove', 'intro', 'outro', 'verse']);
    expect(['verse', 'chorus', 'outro'].every(isSectionKind)).toBe(true);
    expect([isSectionKind('coda'), isSectionKind(''), isSectionKind(3), isSectionKind(undefined)]).toEqual([false, false, false, false]);
  });

  const frame = (section: string, energy: number): FeelFrame => ({
    seed: 7,
    bar: 5,
    groups: [2, 2, 2, 2],
    section,
    style: { entropy: 0.6, artic: 0.2, sync: 0.4 },
    swing: { level: '16n', share: 0.5 },
    energy,
  });
  const ROLES: DrumRole[] = ['kick', 'backbeat', 'ghost', 'hat', 'pedal', 'euclid', 'ostinato', 'clave', 'fill'];
  /** One bar of each part (a drum line of each role), each event of a step. */
  const bar: FeelEvent[] = (['drums', 'bass', 'pad', 'stab', 'lead'] as FeelPart[]).flatMap((part) =>
    (part === 'drums' ? ROLES : [undefined]).flatMap((role) =>
      [0, 2, 5, 8, 13].map((step): FeelEvent => ({ part, ...(role ? { role } : {}), step, note: 48, velocity: 90, length: 2 })),
    ),
  );
  const playedBar = (section: string, energy: number) => {
    const f = frame(section, energy);
    return bar.map((e) => played(f, e, feelOf(f)));
  };

  it.each(['verse', 'chorus', 'outro'])('plays %s as a groove is played, bar for bar, over one bar of each part, at a high and a low energy', (kind) => {
    for (const energy of [0.9, 0.2]) expect(playedBar(kind, energy)).toEqual(playedBar('groove', energy));
  });

  it('plays a breakdown otherwise: the one kind the feel reads by name', () => {
    expect(playedBar('breakdown', 0.9)).not.toEqual(playedBar('groove', 0.9));
  });
});
