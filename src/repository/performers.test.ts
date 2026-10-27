// The performers (#282, #287, decisions 058 and 061): Jambot's drums, bass, pad, stab and lead as gates, each in its role, each
// playing a part the score fills on the instrument it uses. Each reads its role, its part and its move; its holes are its
// part and its levels; over a workbench that fills them it compiles clean and sends what Jambot's section text sends for
// that part (its own voice line at Jambot's register); and a query for a performer at any preset finds the five. The drummer
// plays a stack of lines, one per drum role, and each hit still names its line: the role the feel reads.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
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
const HOST = [`&bar meter("4/4") step=${BPM}bpm`, '&key scale(aeolian, A)', '&harm over=&key step=1m [0,2,4] [3,5,7]'].join('\n');

/** What a text sends over MIDI in its first bars (two unless said): each note's channel, note, velocity, onset and length (in 16ths), in order. */
function sent(text: string, bars = 2): { notes: string[]; diagnostics: string[] } {
  const plan = planOf(text, undefined, { resolve: resolveSeed });
  const sixteenth = 60 / BPM / 4;
  const route = router(plan.result, channelTable(plan.result));
  const round = (x: number) => Math.round(x * 1e6) / 1e6;
  const notes = windowAt(plan, 0, 16 * bars * sixteenth - 1e-9).events.flatMap((e) =>
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
      'use * from "bass performer"',
      '&out map=midi ~ &bassOut',
    ],
  },
  pad: {
    jambot: ['&pad over=&harm step=16n legato=.9 [0,1,2]@16 [0,1,2]@16', '&padOut play=&pad level=.3 &compV', '&compV loop=C3', '&out map=midi ~ ~ &padOut'],
    performer: ['&padline over=&harm step=16n legato=.9 [0,1,2]@16 [0,1,2]@16', '&padLevel map=amp .3', 'use * from "pad performer"', '&out map=midi ~ ~ &padOut'],
  },
  stab: {
    jambot: ['&stab over=&harm step=16n ~@2 [0,2] ~@5 [0,2] ~@7 [1,2]@2 ~@14', '&stabOut play=&stab level=.5 &compV', '&compV loop=C3', '&out map=midi ~ ~ &stabOut'],
    performer: ['&stabline over=&harm step=16n ~@2 [0,2] ~@5 [0,2] ~@7 [1,2]@2 ~@14', '&stabLevel map=amp .5', 'use * from "stab performer"', '&out map=midi ~ ~ &stabOut'],
  },
  lead: {
    jambot: [
      '&lead over=&key step=16n 4@2 3 2@5 ~@8 4 6@3 7@4 ~@8',
      '&leadLevel map=amp step=16n .7@2 .5 .6@5 ~@8 .5 .6@3 .7@4 ~@8',
      '&leadOut play=&lead level=&leadLevel &leadV',
      '&leadV loop=C4',
      '&out map=midi &leadOut',
    ],
    performer: [
      '&leadline over=&key step=16n 4@2 3 2@5 ~@8 4 6@3 7@4 ~@8',
      '&leadLevel map=amp step=16n .7@2 .5 .6@5 ~@8 .5 .6@3 .7@4 ~@8',
      'use * from "lead performer"',
      '&out map=midi &leadOut',
    ],
  },
} as const;

describe('the performers', () => {
  it('come by their role: a named use of the role brings its gate, and of the gate alone, no role (decisions 059 and 061)', () => {
    const score = '&bassline over=&harm step=4n 0 0 1 2\n&bassLevel map=amp .8\n&out map=midi ~ &bassOut';
    const performers = (use: string) => {
      const r = compileSource(`${use}\n${HOST}\n${score}`, undefined, { resolve: resolveSeed });
      expect(r.diagnostics.map((d) => d.message)).toEqual([]);
      return r.performers.map((p) => [p.name, p.role]);
    };
    expect(performers('use &bass from "bass performer"')).toEqual([['bassOut', 'bass']]);
    expect(performers('use &bassOut from "bass performer"')).toEqual([['bassOut', undefined]]);
  });

  it('are the drums, the bass, the pad, the stab and the lead, each one gate whose role a role cell gives, playing its part on the instrument it uses', () => {
    expect(PERFORMER_FRAGMENTS.map((f) => f.id)).toEqual(['drums performer', 'bass performer', 'pad performer', 'stab performer', 'lead performer']);
    const read = PERFORMER_FRAGMENTS.map((f) => compileSource(f.text, undefined, { resolve: resolveSeed }).performers);
    expect(read).toEqual([
      [{ name: 'drumsOut', role: 'drums', part: 'drumlines', voices: ['kit'] }],
      [{ name: 'bassOut', role: 'bass', part: 'bassline', move: { transpose: -12 }, voices: ['bassV'] }],
      [{ name: 'padOut', role: 'pad', part: 'padline', voices: ['padV'] }],
      [{ name: 'stabOut', role: 'stab', part: 'stabline', voices: ['keysV'] }],
      [{ name: 'leadOut', role: 'lead', part: 'leadline', voices: ['leadV'] }],
    ]);
  });

  it('leave the part and its levels to the score: those are their holes', () => {
    const holes = PERFORMER_FRAGMENTS.map((f) => holesOf(f.text, (t) => compileSource(t, undefined, { resolve: resolveSeed }), resolveSeed).uses);
    expect(holes).toEqual([['&drumlines'], ['&bassLevel', '&bassline'], ['&padLevel', '&padline'], ['&stabLevel', '&stabline'], ['&leadLevel', '&leadline']]);
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

  it('are found, all five, by a query for a performer at each of Jambot’s presets', () => {
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

// The drums (#287): each preset's drum bar (E31's, the rhythm seeds), its mix as today's section text sends it on
// channel 10 (`&drums [&kick, &backbeat …]` over the core kit), and the same lines as the drummer's part.
const DRUM_BARS = [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ].map((point, i) => {
  const preset = ['Synth-pop', 'Techno', 'Deep house', 'Ambient', 'Lo-fi hip hop', 'Funk', 'Bossa nova', 'Swing jazz'][i]!;
  const text = LIBRARY.find((f) => f.id === `${preset} drums`)!.text;
  return { preset, point, lines: /^&groove \[(.*)\]$/m.exec(text)![1]!, text: text.replace(/^&groove .*$/m, '') };
});
/** Jambot's drum roles, in its order (yggi/jambot packages/engine/src/events.ts @ 24a528b, `DRUM_ROLES`). */
const DRUM_ROLES = ['kick', 'backbeat', 'fill', 'ghost', 'hat', 'pedal', 'euclid', 'clave'];

describe('the drums performer', () => {
  const library = createRepository(LIBRARY);
  // (each under the meter the repository finds at its preset's point: Lo-fi hip hop's and Funk's swing)
  const section = ({ point, text }: (typeof DRUM_BARS)[number]) =>
    [setTiming(library.query(point, 1, {}, { facet: 'meter' })[0]!.fragment.text, 'bar', 'step', `${BPM}bpm`), text].join('\n');
  const today = (w: (typeof DRUM_BARS)[number]) => `${section(w)}\nuse * from "core kit"\n&drums [${w.lines}]\n&out map=midi ~!9 &drums`;
  const played = (w: (typeof DRUM_BARS)[number]) => `${section(w)}\n&drumlines [${w.lines}]\nuse * from "drums performer"\n&out map=midi ~!9 &drumsOut`;

  it.each(DRUM_BARS.map((w) => [w.preset, w] as const))('%s: sends what its section text sends, over 64 bars', (_, w) => {
    const was = sent(today(w), 64);
    const now = sent(played(w), 64);
    expect(was.diagnostics).toEqual([]);
    expect(now.diagnostics).toEqual([]);
    expect(now.notes.length).toBeGreaterThan(0);
    expect(now.notes).toEqual(was.notes);
  });

  it('keeps each hit’s line, its drum role, in what it plays: the eight presets’ roles', () => {
    const roles = DRUM_BARS.map((w) => {
      const r = compileSource(played(w), undefined, { resolve: resolveSeed });
      // (the feel's reading, contracts/feel v1.1: kit:voices:<role>:…)
      return [w.preset, [...new Set(r.outputs.map((o) => /^kit:voices:(\w+):/.exec(o.id)?.[1] ?? o.id))]];
    });
    expect(roles).toEqual([
      ['Synth-pop', ['kick', 'backbeat', 'fill', 'ghost', 'hat']],
      ['Techno', ['kick', 'backbeat', 'fill', 'hat']],
      ['Deep house', ['kick', 'backbeat', 'fill', 'ghost', 'hat']],
      ['Ambient', ['kick', 'backbeat', 'fill', 'hat']],
      ['Lo-fi hip hop', ['kick', 'backbeat', 'fill', 'ghost', 'hat', 'euclid']],
      ['Funk', ['kick', 'backbeat', 'fill', 'ghost', 'hat', 'euclid']],
      ['Bossa nova', ['kick', 'backbeat', 'fill', 'ghost', 'hat', 'euclid']],
      ['Swing jazz', ['kick', 'backbeat', 'fill', 'ghost', 'hat', 'pedal']],
    ]);
    for (const [, rs] of roles) expect(rs).toEqual(DRUM_ROLES.filter((r) => (rs as string[]).includes(r)));
  });

  it('plays a clave the composer chose beside the bar as a line of its own, its role clave', () => {
    const clave = LIBRARY.find((f) => f.id === 'bossa nova clave')!.text.replace(/^&percussion .*$/m, '');
    const w = DRUM_BARS.find((b) => b.preset === 'Bossa nova')!;
    const both = { ...w, text: `${w.text}\n${clave}`, lines: `${w.lines}, &clave` };
    expect(sent(played(both), 64).notes).toEqual(sent(today(both), 64).notes);
    const r = compileSource(played(both), undefined, { resolve: resolveSeed });
    expect(r.outputs.map((o) => o.id.split(':')[2])).toContain('clave');
  });

  it('refuses a line the kit doesn’t hold, and a stack mixed as a sound beside it', () => {
    const messages = (t: string) => compileSource(`&bar meter("4/4") step=${BPM}bpm\n${t}`, undefined, { resolve: resolveSeed }).diagnostics.map((d) => d.message);
    expect(messages('&cb s=sine\n&cowbell step=4n &cb\n&drumlines [&cowbell]\nuse * from "drums performer"\n&out map=midi ~!9 &drumsOut')).toEqual([
      "&cowbell plays &cb, which &kit doesn't hold: a kit's lines play its own voices",
    ]);
    expect(messages('&kick step=4n &bd\n&drumlines [&kick]\nuse * from "drums performer"\n&out map=midi ~!9 [&drumsOut, &drumlines]')).toEqual([
      '&drumlines is the part &drumsOut plays, a stack of lines and no sound: mix or send &drumsOut',
    ]);
  });
});
