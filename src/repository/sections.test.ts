// The section kinds (#810 rung 2; decisions 096 and 097): fragments of the facet `section`, each its intensity (the
// song's plus its offset) and who plays (the band's entries), taken by name, for a section plan to splice.
import { describe, expect, it } from 'vitest';
import { planOf } from '../engine/host';
import { channelTable, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { bandLine } from './band';
import { createRepository } from './fragments';
import { LIBRARY, resolveSeed } from './library';
import { STYLES } from './styles';
import { seedFragments } from './seed';

const SECTIONS = seedFragments('sections');
const KINDS = ['intro', 'verse', 'chorus', 'groove', 'bridge', 'build', 'drop', 'breakdown', 'outro'] as const;
type Kind = (typeof KINDS)[number];

// (yggi/jambot packages/engine/src/form.ts @ c472cf7: ENERGY_OFFSET and barEnergy's build; who rests by kind in
// lead.ts (an intro, a breakdown) and comp.ts (a breakdown pads only: no stab); the verse, the chorus and the outro are
// cells' own, #810 rung 2)
const offset = (kind: Kind, bar: number): number =>
  ({
    intro: -0.3,
    verse: -0.1,
    chorus: 0.15,
    groove: 0,
    bridge: -0.1,
    build: -0.15 + (0.45 * bar) / 7,
    drop: 0.3,
    breakdown: -0.45,
    outro: (-0.45 * bar) / 7,
  })[kind];
const PLAYS: Readonly<Record<Kind, readonly number[]>> = {
  intro: [0, 1, 2, 3],
  verse: [0, 1, 2, 4],
  chorus: [0, 1, 2, 3, 4],
  groove: [0, 1, 2, 3, 4],
  bridge: [0, 1, 2, 3, 4],
  build: [0, 1, 2, 3, 4],
  drop: [0, 1, 2, 3, 4],
  breakdown: [0, 1, 2],
  outro: [0, 1, 2, 3],
};
// (the band's entries in its order, `&band &drums &bass &pad &stab &lead`, as the voices they sound on)
const VOICES = ['bd', 'bassV', 'padV', 'keysV', 'leadV'];

describe('the section kinds (#810 rung 2)', () => {
  it('are nine fragments of the facet section, each two heads and the song’s intensity its main parameter', () => {
    expect(SECTIONS.map((f) => f.id)).toEqual([...KINDS]);
    for (const f of SECTIONS) {
      expect(f.association.map((a) => a.facet)).toEqual(['section']);
      expect(f.text.split('\n')[0]).toBe(`&${f.id}, &${f.id}Plays from &song`);
    }
  });

  it('have no style: no query returns one, at any style of styles (decision 090)', () => {
    const repository = createRepository(LIBRARY);
    for (const { point } of STYLES) expect(repository.query(point, 5, {}, { facet: 'section' })).toEqual([]);
  });

  it('play a plan of all nine through the default band: each section its kind’s intensity and players, bar by bar', () => {
    const song = 0.55;
    const lines = [
      '&bar meter("4/4") step=120bpm',
      '&key scale(dorian, D)',
      '&harm over=&key step=1m [0,2,4]',
      '&kick step=4n &bd &bd &bd &bd',
      '&drumlines [&kick]',
      '&bassline over=&harm step=4n 0 ~ 2 ~',
      '&padline over=&harm step=4n [0,2,4]@4',
      '&stabline over=&harm step=4n ~ [0,2] ~ [0,2]',
      '&leadline over=&harm step=4n 4 3 2 0',
      '&style label="a song" style=&(map=style sync=.5 harm=.5 bite=.5 mood=.5)',
      `&song ${song}`,
      ...KINDS.map((k) => `&${k}, &${k}Plays from ${k} &song`),
      `&intensity step=1m/8 ${KINDS.map((k) => `&${k}`).join(' ')}`,
      `&form over=&band step=1m/8 ${KINDS.map((k) => `&${k}Plays`).join(' ')}`,
    ].join('\n');
    const text = `${lines}\n${bandLine(lines)}`;
    const plan = planOf(text, undefined, { resolve: resolveSeed });
    expect(plan.result.diagnostics).toEqual([]);
    const route = router(plan.result, channelTable(plan.result));
    KINDS.forEach((kind, s) => {
      for (let bar = 0; bar < 8; bar++) {
        const b = s * 8 + bar;
        const heard = new Map<string, number>();
        for (const e of windowAt(plan, b * 2, 2 - 1e-9).events)
          for (const x of routesOf(route(e))) {
            const n = midiNote(e, x);
            if (n) heard.set(e.voice, Math.max(heard.get(e.voice) ?? 0, n.velocity));
          }
        const at = `${kind}, bar ${bar}`;
        expect([...heard.keys()].sort(), at).toEqual(PLAYS[kind].map((i) => VOICES[i]!).sort());
        // (the drums' written 127 driven by the bar's intensity, Jambot's 0.65 + 0.35 e, decision 096)
        const e = Math.max(0, Math.min(1, song + offset(kind, bar)));
        expect(heard.get('bd'), at).toBe(Math.round(127 * (0.65 + 0.35 * e)));
      }
    });
  });
});
