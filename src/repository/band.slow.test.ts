// The default band's bound (#391): Jambot's twenty sections (its ten presets, seeds 1 and 2, the second section,
// entropy 0.3, lifted from yggi/jambot at its pin: fixtures/jambot-sections.json), each played on today's single MIDI
// card and each rewritten as a score plus `* from band`, send the same MIDI: channel, note, velocity, onset and end,
// 0 mismatched. Each score compiles with no diagnostic, and its sound card renders with none and no clipping.
import { describe, expect, it } from 'vitest';
import sections from '../../fixtures/jambot-sections.json';
import { pieceAudio } from '../engine/audioexport';
import { compileSource } from '../engine/compile';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { codeShifts, type Resolve } from '../engine/program';
import { windowAt } from '../engine/schedule';
import { resolveBand } from './band';
import { resolveSeed } from './library';

/** The parts a band's performers play, by their interface names. */
const PARTS = ['drumlines', 'bassline', 'padline', 'stabline', 'leadline'];

/**
 * A section text as a score (decision 063 §1): its performers' uses, the voices it gives them and its cards go, as
 * Jambot's section text drops them at rung 5; a part it doesn't write is written as a tacet (§4); its style, the
 * preset's point, is the note `&style`; and it ends in `* from band`.
 */
function scoreOf({ preset, seed, text, point }: (typeof sections.sections)[number]): string {
  const lines = text.split('\n').filter((l) => !/^use \* from ".* performer"$/.test(l) && !/^&(bassV|keysV|padV|leadV) /.test(l) && !/^&(out|heard) map=/.test(l));
  const tacets = PARTS.filter((p) => !lines.some((l) => l.startsWith(`&${p} `))).map((p) => `&${p} step=1m ~`);
  const style = `&(map=style ${[point.sync, point.harm, point.artic, point.energy].join(' ')})`;
  return [...lines, ...tacets, `&style label="${preset}, seed ${seed}, its second section" style=${style}`, '* from band'].join('\n');
}

/** What a text sends over MIDI in its first 40 s (the longest section, 8 bars at 72 bpm, is 26.7 s): `channel note velocity onset end`, sorted. */
function sent(text: string, resolve: Resolve): string[] {
  const plan = planOf(text, undefined, { resolve });
  const route = router(plan.result, channelTable(plan.result));
  const r = (x: number) => Math.round(x * 1e6) / 1e6;
  return windowAt(plan, 0, 40)
    .events.flatMap((e) =>
      routesOf(route(e)).flatMap((x) => {
        const n = midiNote(e, x);
        return n ? [`${n.channel} ${n.note} ${n.velocity} ${r(n.at)} ${r(n.end)}`] : [];
      }),
    )
    .sort();
}

const mismatched = (a: readonly string[], b: readonly string[]) => Math.abs(a.length - b.length) + a.slice(0, b.length).filter((n, i) => n !== b[i]).length;

describe("Jambot's twenty sections, played on the default band (#391)", () => {
  it('are the ten presets, seeds 1 and 2', () => {
    expect(sections.sections).toHaveLength(20);
    expect(new Set(sections.sections.map((s) => s.preset)).size).toBe(10);
  });

  it.each(sections.sections.map((s) => [`${s.preset}, seed ${s.seed}`, s] as const))('%s: the same MIDI, 0 mismatched', (_, section) => {
    const score = scoreOf(section);
    const resolve = resolveBand(score);
    const compiled = compileSource(score, undefined, { resolve });
    expect(compiled.diagnostics).toEqual([]);
    const was = sent(section.text, resolveSeed);
    const now = sent(score, resolve);
    expect(was.length).toBeGreaterThan(90);
    expect(mismatched(was, now)).toBe(0);
  });

  it('is shown firing: a band whose bass sits an octave up sends other notes', () => {
    const section = sections.sections[0]!;
    const score = scoreOf(section);
    const band = resolveBand(score)('band')!.replace('&bassV s=saw loop=C2', '&bassV s=saw loop=C3');
    const resolve: Resolve = (id) => (id === 'band' ? band : resolveSeed(id));
    expect(mismatched(sent(section.text, resolveSeed), sent(score, resolve))).toBeGreaterThan(0);
  });

  it.each(sections.sections.map((s) => [`${s.preset}, seed ${s.seed}`, s] as const))('%s: its sound card renders with no diagnostic and no clipping', (_, section) => {
    const score = scoreOf(section);
    const r = compileSource(score, undefined, { resolve: resolveBand(score) });
    const audio = pieceAudio(r, codeShifts(r), { seconds: 12 });
    expect(audio.diagnostics).toEqual([]);
    expect(audio.loudness.rms).toBeGreaterThan(-50);
    expect(audio.loudness.clipped).toBe(0);
  });
});
