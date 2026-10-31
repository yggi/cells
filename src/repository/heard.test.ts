// A pattern fragment carries no card (#291): heard through the one `heard` supplies, on Jambot's channels, each of the
// 19 that carried one sends what it sent with its own (a hash of each note's channel, MIDI note, onset, end and
// velocity over 16 s, recorded with the cards still in, at cells bbb9eb2); no seed holds a card; and a bass line fills
// the bass performer's hole (#285).
import { describe, expect, it } from 'vitest';
import { compileSource as compiledWithOldUse } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { BASS_FRAGMENTS } from './bass';
import { fitOf } from './fit';
import { heard } from './heard';
import { LIBRARY, resolveSeed } from './library';
import { METER_FRAGMENTS } from './meters';
import { MODE_FRAGMENTS } from './modes';
import { RHYTHM_FRAGMENTS } from './rhythms';

// (these texts take fragments the old way, `use`, which still reads for a release and warns that it is the old way,
// decision 065: what is tested here is what it reads, so that warning is set aside; `from.test.ts` tests the new way)
const OLD_USE = /^use is the old way/;
const compileSource = (...args: Parameters<typeof compiledWithOldUse>): ReturnType<typeof compiledWithOldUse> => {
  const r = compiledWithOldUse(...args);
  const diagnostics = r.diagnostics.filter((d) => !OLD_USE.test(d.message));
  return { ...r, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
};

/** What each sent with its own card, on its bench: the hash of its notes, and how many. */
const SENT: Record<string, [string, number]> = {
  'Synth-pop drums': ['397a56b4', 96],
  'Techno drums': ['9519e0ef', 224],
  'Deep house drums': ['b61199ca', 120],
  'Ambient drums': ['6a2f2372', 144],
  'Lo-fi hip hop drums': ['4f755bb6', 136],
  'Funk drums': ['737e888c', 192],
  'Bossa nova drums': ['b559941c', 128],
  'Swing jazz drums': ['0204bcbe', 112],
  'son clave 3-2': ['e26ed209', 20],
  'son clave 2-3': ['59aedae1', 20],
  'rumba clave 3-2': ['9c8b2f29', 20],
  'bossa nova clave': ['58b2f541', 20],
  'bossa nova clave (one bar)': ['6fe7442d', 40],
  'root bass': ['73332dc6', 16],
  'pumping bass': ['70f9f848', 32],
  'eighths bass': ['cc5be690', 64],
  'funk bass': ['181a19df', 64],
  'walking bass': ['d438922a', 32],
  'bell and scale': ['cc8d357e', 56],
};

const hash = (s: string) => {
  let a = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193);
  return (a >>> 0).toString(16).padStart(8, '0');
};

/** A fragment's bench: a meter it fits at 120 bpm and the kits (a rhythm), 4/4 with the General MIDI kit (the bell), a key, a harmony and the bass instrument (a bass line). */
const benchOf = (id: string, text: string) => {
  if (BASS_FRAGMENTS.some((f) => f.id === id))
    return 'use * from bass\n&bar meter("4/4") step=120bpm\n&key scale(dorian, D)\n&harm over=&key step=1m [0,2,4] [3,5,7] [4,6,8] [0,2,4]';
  if (id === 'bell and scale') return 'use * from gm_kit\n&bar meter("4/4") step=120bpm\n&tonic C';
  return `use * from gm_kit\n${METER_FRAGMENTS.map((m) => setTiming(m.text, 'bar', 'step', '120bpm')).find((m) => fitOf(text, m).fits)!}`;
};

/** What a text sends over its first 16 s: each note's channel, MIDI note, onset and end (s) and velocity, in order. */
function sent(text: string): (string | number)[][] {
  const plan = planOf(text, undefined, { resolve: resolveSeed });
  expect(plan.result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const route = router(plan.result, channelTable(plan.result));
  return windowAt(plan, 0, 16)
    .events.flatMap((e) =>
      routesOf(route(e)).flatMap((r) => {
        const n = midiNote(e, r);
        return n ? [[n.channel, n.note, +n.at.toFixed(6), +n.end.toFixed(6), n.velocity]] : [];
      }),
    )
    .sort((a, b) => a[2]! - b[2]! || a[1]! - b[1]!);
}

describe('a pattern fragment heard through the card `heard` supplies (#291)', () => {
  // (the seeds made after #291, which never carried a card: an example's beat, the Spooky beat and bass of #349, and the ghost-house beat and bass near it)
  const born = ['Electro swing drums', 'Spooky drums', 'creeping bass', 'Ghost drums', 'tiptoe bass'];
  const carried = [...RHYTHM_FRAGMENTS, ...BASS_FRAGMENTS, ...MODE_FRAGMENTS.filter((f) => f.id === 'bell and scale')].filter((f) => !born.includes(f.id));

  it('is each of the 19 that carried a card', () => expect(carried.map((f) => f.id).sort()).toEqual(Object.keys(SENT).sort()));

  it.each(carried.map((f) => [f.id, f.text] as const))('%s sends what it sent with its own card', (id, text) => {
    const notes = sent(`${benchOf(id, text)}\n${text}\n${heard(text)}`);
    expect([hash(JSON.stringify(notes)), notes.length]).toEqual(SENT[id]);
  });

  it('no seed fragment holds a card but the band, whose cards are its routing (decision 063 §1, #391)', () => {
    expect(LIBRARY.filter((f) => /map=(midi|sample)/.test(f.text)).map((f) => f.id)).toEqual(['band']);
  });

  it('a text with nothing to hear gets no card', () => expect(heard('&harm over=&key step=1m [0,2,4]')).toBe(''));

  it.each(BASS_FRAGMENTS.map((f) => [f.id, f.text] as const))(
    '%s, heard on its bench, says nothing: the bass’s sound is heard on a sound card as well as sent (#391)',
    (id, text) => {
      const bench = benchOf(id, text);
      const said = (cards: string) =>
        compiledWithOldUse(`${bench}\n${text}\n${cards}`, undefined, { resolve: resolveSeed })
          .diagnostics.filter((d) => !OLD_USE.test(d.message))
          .map((d) => d.message);
      expect(said(heard(text))).toEqual([]);
      // (it fires: the MIDI card alone says the sound isn't sent)
      expect(said(heard(text).replace(/\n&bassSound .*$/m, ''))).toEqual([expect.stringMatching(/^&bassV is only on a MIDI card: its sound/)]);
    },
  );
});

describe('a bass line fills the bass performer’s hole (#285)', () => {
  // (sent on the bass's channel and heard on a sound card: the bass has a sound of its own, which MIDI doesn't send, #391)
  it.each(BASS_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s, with the host and use * from "bass performer", compiles with no diagnostic', (_, text) => {
    const host =
      '&bar meter("4/4") step=120bpm\n&key scale(dorian, D)\n&harm over=&key step=1m [0,2,4] [3,5,7]\n&bassLevel map=amp .8\n&out map=midi ~ &bassOut\n&hear map=sample [&bassOut]\n&style style=&(map=style .5 .5 .5 .5)';
    const r = compileSource(`use * from "bass performer"\n${host}\n${text}`, undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    expect(r.performers?.map((p) => [p.name, p.role, p.part])).toEqual([['bassOut', 'bass', 'bassline']]);
  });
});
