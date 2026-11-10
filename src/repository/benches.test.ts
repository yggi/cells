// A pattern fragment carries no card (#291): heard through the tests' cards (`benches.ts`, #640), its heads on Jambot's channels, each of the
// 19 that carried one sends what it sent with its own (a hash of each note's channel, MIDI note, onset, end and
// velocity over 16 s, recorded with the cards still in, at cells bbb9eb2); no seed holds a card; and a bass line fills
// the bass performer's hole (#285).
import { describe, expect, it } from 'vitest';
import { compileSource as compiledWithOldUse } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { fitsAs } from './fit';
import { bassCards, drumCard } from './benches';
import { LIBRARY, resolveSeed } from './library';
import { seedFragments } from './seed';

// (these texts take fragments the old way, `use`, which still reads for a release and warns that it is the old way,
// decision 065: what is tested here is what it reads, so that warning is set aside; `from.test.ts` tests the new way)

const METER_FRAGMENTS = seedFragments('meters');
const RHYTHM_FRAGMENTS = seedFragments('rhythms');
const BASS_FRAGMENTS = seedFragments('bass');
const MODE_FRAGMENTS = seedFragments('modes');
const OLD_USE = /^use is the old way/;
const compileSource = (...args: Parameters<typeof compiledWithOldUse>): ReturnType<typeof compiledWithOldUse> => {
  const r = compiledWithOldUse(...args);
  const diagnostics = r.diagnostics.filter((d) => !OLD_USE.test(d.message));
  return { ...r, diagnostics, ok: !diagnostics.some((d) => d.severity === 'error') };
};

/** What each sent with its own card, on its bench: the hash of its notes, and how many. */
const SENT: Record<string, [string, number]> = {
  synth_pop_drums: ['397a56b4', 96],
  techno_drums: ['9519e0ef', 224],
  deep_house_drums: ['b61199ca', 120],
  ambient_drums: ['6a2f2372', 144],
  lo_fi_hip_hop_drums: ['4f755bb6', 136],
  funk_drums: ['737e888c', 192],
  bossa_nova_drums: ['b559941c', 128],
  swing_jazz_drums: ['0204bcbe', 112],
  son_clave_3_2: ['e26ed209', 20],
  son_clave_2_3: ['59aedae1', 20],
  rumba_clave_3_2: ['9c8b2f29', 20],
  bossa_nova_clave: ['58b2f541', 20],
  bossa_nova_clave_one_bar: ['6fe7442d', 40],
  root_bass: ['73332dc6', 16],
  pumping_bass: ['70f9f848', 32],
  eighths_bass: ['cc5be690', 64],
  funk_bass: ['181a19df', 64],
  walking_bass: ['d438922a', 32],
  bell_and_scale: ['cc8d357e', 56],
};

const hash = (s: string) => {
  let a = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) a = Math.imul(a ^ s.charCodeAt(i), 0x01000193);
  return (a >>> 0).toString(16).padStart(8, '0');
};

/** A fragment's bench: a meter it fits at 120 bpm and the kits (a rhythm), 4/4 with the General MIDI kit (the bell), a key, a harmony and the bass instrument (a bass line). */
const benchOf = (id: string, text: string) => {
  if (BASS_FRAGMENTS.some((f) => f.id === id)) return '* from bass\n&bar meter("4/4") step=120bpm\n&key scale(dorian, D)\n&harm over=&key step=1m [0,2,4] [3,5,7] [4,6,8] [0,2,4]';
  if (id === 'bell_and_scale') return '* from gm_kit\n&bar meter("4/4") step=120bpm\n&tonic C';
  return `* from gm_kit\n${METER_FRAGMENTS.map((m) => setTiming(m.text, 'bar', 'step', '120bpm')).find((m) => fitsAs('x', m, { resolve: (id) => (id === 'x' ? text : resolveSeed(id)) }).fits)!}`;
};

/** What a text sends over its first 16 s: each note's channel, MIDI note, onset and end (s) and velocity, in order. */
function sent(text: string): (string | number)[][] {
  const plan = planOf(text, undefined, { resolve: resolveSeed, old: true });
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

/**
 * The cards a seed is heard through: a bass line's on the bass channel, a rhythm's heads on the drums; the bell and scale
 * is a mode by its signature (its head `&key`), so its drum part is named: the bell it strikes (decision 056).
 */
const cardsOf = (id: string, text: string) => (BASS_FRAGMENTS.some((f) => f.id === id) ? bassCards(text) : id === 'bell_and_scale' ? drumCard(['agogo']) : drumCard(text));

describe('a pattern fragment heard through the tests’ cards (#291, #640)', () => {
  // (the seeds made after #291, which never carried a card: an example's beat, the Spooky beat and bass of #349, the ghost-house beat and bass near it, the Kinderlied beat and the cinquillo, #507; the beats and basses read from the examples for Acid, Happy hardcore and Elektro, #572)
  const born = [
    'electro_swing_drums',
    'spooky_drums',
    'creeping_bass',
    'ghost_drums',
    'tiptoe_bass',
    'kinderlied_drums',
    'cinquillo',
    'acid_drums',
    'happy_hardcore_drums',
    'elektro_drums',
    'acid_bass',
    'octave_bass',
    'industrial_drums',
    'drone_bass',
    'ride_shuffle',
    'shanty_drums',
    'chip_drums',
    'quiet_pulse',
    'continuo_bass',
    'blues_walk',
    'quarter_bass',
    // (#542's second four, written by hand: the salsa, waltz, march and trip-hop beats and basses)
    'salsa_drums',
    'waltz_drums',
    'march_drums',
    'trip_hop_drums',
    'tumbao_bass',
    'waltz_bass',
    'oom_pah_bass',
    'dub_bass',
  ];
  const carried = [...RHYTHM_FRAGMENTS, ...BASS_FRAGMENTS, ...MODE_FRAGMENTS.filter((f) => f.id === 'bell_and_scale')].filter((f) => !born.includes(f.id));

  it('is each of the 19 that carried a card', () => expect(carried.map((f) => f.id).sort()).toEqual(Object.keys(SENT).sort()));

  it.each(carried.map((f) => [f.id, f.text] as const))('%s sends what it sent with its own card', (id, text) => {
    const notes = sent(`${benchOf(id, text)}\n${text}\n${cardsOf(id, text)}`);
    expect([hash(JSON.stringify(notes)), notes.length]).toEqual(SENT[id]);
  });

  it('no seed fragment holds a card but the band, whose cards are its routing (decision 063 §1, #391)', () => {
    expect(LIBRARY.filter((f) => /map=(midi|sample)/.test(f.text)).map((f) => f.id)).toEqual(['band']);
  });

  it('no part, no card', () => expect(drumCard()).toBe(''));

  it.each(BASS_FRAGMENTS.map((f) => [f.id, f.text] as const))(
    '%s, heard on its bench, says nothing: the bass’s sound is heard on a sound card as well as sent (#391)',
    (id, text) => {
      const bench = benchOf(id, text);
      const said = (cards: string) =>
        compiledWithOldUse(`${bench}\n${text}\n${cards}`, undefined, { resolve: resolveSeed, old: true })
          .diagnostics.filter((d) => !OLD_USE.test(d.message))
          .map((d) => d.message);
      expect(said(bassCards(text))).toEqual([]);
      // (it fires: the MIDI card alone says the sound isn't sent)
      expect(said(bassCards(text).replace(/\n&bassSound .*$/m, ''))).toEqual([expect.stringMatching(/^&bassV is only on a MIDI card: its sound/)]);
    },
  );
});

describe('a bass line fills the bass performer’s hole (#285)', () => {
  // (sent on the bass's channel and heard on a sound card: the bass has a sound of its own, which MIDI doesn't send, #391)
  it.each(BASS_FRAGMENTS.map((f) => [f.id] as const))('%s, taken over the host with the bass performer, compiles with no diagnostic', (id) => {
    const host =
      '&bar meter("4/4") step=120bpm\n&key scale(dorian, D)\n&harm over=&key step=1m [0,2,4] [3,5,7]\n&bassLevel map=amp .8\n&out map=midi ~ &bassOut\n&hear map=sample [&bassOut]\n&style style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)';
    const r = compileSource(`&bass, &bassOut from bass_performer(bassLevel=&bassLevel) &bassline\n&bassline from ${id} &harm\n${host}`, undefined, { resolve: resolveSeed });
    expect(r.diagnostics).toEqual([]);
    expect(r.performers?.map((p) => [p.name, p.role, p.part])).toEqual([['bassOut', 'bass', 'bassline']]);
  });
});
