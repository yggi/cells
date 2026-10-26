// The performers (#282, decision 058): Jambot's bass, pad, stab and lead as gates named by their roles, each
// playing a part the score fills on the instrument it uses. Each reads its role, its part and its move; its holes are its
// part and its levels; over a workbench that fills them it compiles clean and sends what Jambot's section text sends for
// that part (its own voice line at Jambot's register); and a query for a performer at any preset finds the four. (The drums wait on #287: a gate's part keeps no line's name.)
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { createRepository } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed } from './library';
import { PERFORMER_FRAGMENTS } from './performers';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, FUNK, LO_FI, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';

const BPM = 120;
// (a host as Jambot's section text writes one: the meter, the key, the harmony)
const HOST = [`&bar meter("4/4") step=${BPM}bpm`, '&key scale(aeolian, A)', '&harm over=key step=1m [0,2,4] [3,5,7]'].join('\n');

/** What a text sends over MIDI in its first two bars: each note's channel, note, velocity, onset and length (in 16ths), in order. */
function sent(text: string): { notes: string[]; diagnostics: string[] } {
  const plan = planOf(text, undefined, { resolve: resolveSeed });
  const sixteenth = 60 / BPM / 4;
  const route = router(plan.result, channelTable(plan.result));
  const round = (x: number) => Math.round(x * 1e6) / 1e6;
  const notes = windowAt(plan, 0, 32 * sixteenth - 1e-9).events.flatMap((e) =>
    routesOf(route(e)).flatMap((r) => {
      const n = midiNote(e, r);
      return n ? [{ ...n, at: round(n.at / sixteenth), dur: round((n.end - n.at) / sixteenth) }] : [];
    }),
  );
  return {
    notes: notes.sort((a, b) => a.at - b.at || a.channel - b.channel || a.note - b.note).map((n) => `${n.channel} ${n.note} ${n.velocity} ${n.at} ${n.dur}`),
    diagnostics: plan.result.diagnostics.map((d) => d.message),
  };
}

// Each part as Jambot's section text writes it (yggi/jambot packages/score/src/section-text.ts @ 24a528b), and the same
// part played by its performer: the part renamed to the performer's hole, its levels to its level hole, and its voice
// line dropped for the instrument.
const PARTS = {
  bass: {
    jambot: [
      '&bass over=&harm step=16n 0@4 ~@4 2@2 ~@2 0@4 0@8 ~@8',
      '&bassLevel map=amp step=16n .6@4 ~@4 .4@2 ~@2 .5@4 .6@8 ~@8',
      '&bassOut play=&bass level=&bassLevel &bassV',
      '&bassV loop=C1',
      '&out map=midi ~ &bassOut',
    ],
    performer: [
      '&bassline over=&harm step=16n 0@4 ~@4 2@2 ~@2 0@4 0@8 ~@8',
      '&bassLevel map=amp step=16n .6@4 ~@4 .4@2 ~@2 .5@4 .6@8 ~@8',
      'use "bass performer"',
      '&out map=midi ~ &bass',
    ],
  },
  pad: {
    jambot: ['&pad over=&harm step=16n legato=.9 [0,1,2]@16 [0,1,2]@16', '&padOut play=&pad level=.3 &compV', '&compV loop=C3', '&out map=midi ~ ~ &padOut'],
    performer: ['&padline over=&harm step=16n legato=.9 [0,1,2]@16 [0,1,2]@16', '&padLevel map=amp .3', 'use "pad performer"', '&out map=midi ~ ~ &pad'],
  },
  stab: {
    jambot: ['&stab over=&harm step=16n ~@2 [0,2] ~@5 [0,2] ~@7 [1,2]@2 ~@14', '&stabOut play=&stab level=.5 &compV', '&compV loop=C3', '&out map=midi ~ ~ &stabOut'],
    performer: ['&stabline over=&harm step=16n ~@2 [0,2] ~@5 [0,2] ~@7 [1,2]@2 ~@14', '&stabLevel map=amp .5', 'use "stab performer"', '&out map=midi ~ ~ &stab'],
  },
  lead: {
    jambot: [
      '&lead over=key step=16n 4@2 3 2@5 ~@8 4 6@3 7@4 ~@8',
      '&leadLevel map=amp step=16n .7@2 .5 .6@5 ~@8 .5 .6@3 .7@4 ~@8',
      '&leadOut play=&lead level=&leadLevel &leadV',
      '&leadV loop=C4',
      '&out map=midi &leadOut',
    ],
    performer: [
      '&leadline over=key step=16n 4@2 3 2@5 ~@8 4 6@3 7@4 ~@8',
      '&leadLevel map=amp step=16n .7@2 .5 .6@5 ~@8 .5 .6@3 .7@4 ~@8',
      'use "lead performer"',
      '&out map=midi &lead',
    ],
  },
} as const;

describe('the performers', () => {
  it('are the bass, the pad, the stab and the lead, each one gate named by its role, playing its part on the instrument it uses', () => {
    expect(PERFORMER_FRAGMENTS.map((f) => f.id)).toEqual(['bass performer', 'pad performer', 'stab performer', 'lead performer']);
    const read = PERFORMER_FRAGMENTS.map((f) => compileSource(f.text, undefined, { resolve: resolveSeed }).performers);
    expect(read).toEqual([
      [{ name: 'bass', role: 'bass', part: 'bassline', move: { transpose: -12 }, voices: ['bassV'] }],
      [{ name: 'pad', role: 'pad', part: 'padline', voices: ['padV'] }],
      [{ name: 'stab', role: 'stab', part: 'stabline', voices: ['keysV'] }],
      [{ name: 'lead', role: 'lead', part: 'leadline', voices: ['leadV'] }],
    ]);
  });

  it('leave the part and its levels to the score: those are their holes', () => {
    const holes = PERFORMER_FRAGMENTS.map((f) => holesOf(f.text, (t) => compileSource(t, undefined, { resolve: resolveSeed }), resolveSeed).uses);
    expect(holes).toEqual([
      ['&bassLevel', '&bassline'],
      ['&padLevel', '&padline'],
      ['&stabLevel', '&stabline'],
      ['&leadLevel', '&leadline'],
    ]);
  });

  for (const [part, { jambot, performer }] of Object.entries(PARTS))
    it(`send what Jambot's section text sends for its part: the ${part}`, () => {
      const was = sent([HOST, ...jambot].join('\n'));
      const now = sent([HOST, ...performer].join('\n'));
      expect(was.diagnostics).toEqual([]);
      expect(now.diagnostics).toEqual([]);
      expect(now.notes.length).toBeGreaterThan(0);
      expect(now.notes).toEqual(was.notes);
    });

  it('are found, all four, by a query for a performer at each of Jambot’s presets', () => {
    const library = createRepository(LIBRARY);
    for (const preset of [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ])
      expect(
        library
          .query(preset, 10, {}, { facet: 'performer' })
          .map((f) => f.fragment.id)
          .sort(),
      ).toEqual(PERFORMER_FRAGMENTS.map((f) => f.id).sort());
  });
});
