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

const SONG = 0.55;
/** A score of one bar of each part at the centre of style space, its song `SONG`, these lines, its intensity and its band's selector a section a step: each bar's voices and their loudest velocity. */
function playedPlan(lines: readonly string[], intensity: string, plays: string, bars: number) {
  const score = [
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
    `&song ${SONG}`,
    ...lines,
    `&intensity step=1m/8 ${intensity}`,
    `&form over=&band step=1m/8 ${plays}`,
  ].join('\n');
  const plan = planOf(`${score}\n${bandLine(score)}`, undefined, { resolve: resolveSeed });
  const route = router(plan.result, channelTable(plan.result));
  const heardIn = (b: number) => {
    const heard = new Map<string, number>();
    for (const e of windowAt(plan, b * 2, 2 - 1e-9).events)
      for (const x of routesOf(route(e))) {
        const n = midiNote(e, x);
        if (n) heard.set(e.voice, Math.max(heard.get(e.voice) ?? 0, n.velocity));
      }
    return Object.fromEntries([...heard].sort(([a], [b]) => a.localeCompare(b)));
  };
  return { diagnostics: plan.result.diagnostics, bars: Array.from({ length: bars }, (_, b) => heardIn(b)) };
}

/** A bar as heard against what it should send: the same players, the drums exact, the bass and the stab within a velocity step (a level's square root, rounded). */
function expectBar(heard: Record<string, number>, want: Record<string, number>, at: string) {
  expect(Object.keys(heard), at).toEqual(Object.keys(want));
  expect(heard['bd'], at).toBe(want['bd']);
  for (const v of Object.keys(want)) expect(Math.abs(heard[v]! - want[v]!), `${at}: ${v}`).toBeLessThanOrEqual(1);
}

/** What a bar of a kind sends: its players, the drums' written 127 driven by its intensity (Jambot's 0.65 + 0.35 e, decision 096), the others as written. */
function wanted(kind: Kind, bar: number): Record<string, number> {
  const e = Math.max(0, Math.min(1, SONG + offset(kind, bar)));
  const at: Record<string, number> = {
    bd: Math.round(127 * (0.65 + 0.35 * e)),
    bassV: Math.round(114 * (0.75 + 0.25 * e)),
    padV: 114,
    keysV: Math.round(114 * (0.7778 + 0.2222 * e)),
    leadV: 114,
  };
  return Object.fromEntries(
    PLAYS[kind]
      .map((i) => VOICES[i]!)
      .sort()
      .map((v) => [v, at[v]!]),
  );
}

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
    const played = playedPlan(
      KINDS.map((k) => `&${k}, &${k}Plays from ${k} &song`),
      KINDS.map((k) => `&${k}`).join(' '),
      KINDS.map((k) => `&${k}Plays`).join(' '),
      KINDS.length * 8,
    );
    expect(played.diagnostics).toEqual([]);
    played.bars.forEach((heard, b) => expectBar(heard, wanted(KINDS[Math.floor(b / 8)]!, b % 8), `bar ${b}`));
  });
});

const SONGS = seedFragments('songs');
/** A song form's sections, as its head's line names them. */
const sectionsOf = (text: string, head: string): Kind[] =>
  text
    .split('\n')
    .find((l) => l.startsWith(`&${head} &`))!
    .split(/\s+/)
    .slice(1)
    .map((r) => r.slice(1) as Kind);

describe('the song forms (#810 rung 3)', () => {
  const FORMS = ['verse_chorus', 'build_drop', 'groove_breakdown', 'head_solos_head', 'strophic', 'vamp', 'binary'];
  const headOf = (f: { text: string }) => /^&(\w+), &\w+Plays from &song/.exec(f.text)![1]!;

  it('are seven fragments of the facet song, each two heads, its sections section kinds taken by name', () => {
    expect(SONGS.map((f) => f.id)).toEqual(FORMS);
    for (const f of SONGS) {
      expect(new Set(f.association.map((a) => a.facet))).toEqual(new Set(['song']));
      const head = headOf(f);
      expect(f.text.split('\n')[0]).toMatch(new RegExp(`^&${head}, &${head}Plays from &song style=`));
      for (const k of sectionsOf(f.text, head)) expect(KINDS, `${f.id}: ${k}`).toContain(k);
    }
  });

  it('place every style of styles in one song form, by idiom: each finds its form first, at its own point, none tied (#810’s bound)', () => {
    const repository = createRepository(LIBRARY);
    for (const { name, point } of STYLES) {
      const [first, second] = repository.query(point, 2, {}, { facet: 'song' });
      expect(first!.distance, name).toBeLessThanOrEqual(0.3);
      expect(second!.distance, name).toBeGreaterThan(first!.distance);
    }
    // (each style's form, as the fragments place them)
    const at = Object.fromEntries(STYLES.map((s) => [s.id, repository.query(s.point, 1, {}, { facet: 'song' })[0]!.fragment.id]));
    expect(at).toMatchObject({
      synthPop: 'verse_chorus',
      techno: 'build_drop',
      deepHouse: 'groove_breakdown',
      swingJazz: 'head_solos_head',
      kinderlied: 'strophic',
      funk: 'vamp',
      baroque: 'binary',
    });
  });

  it.each(FORMS)('%s plays its sections through the default band, each its kind’s players and intensity, and comes round at its end', (id) => {
    const f = SONGS.find((s) => s.id === id)!;
    const head = headOf(f);
    const sections = sectionsOf(f.text, head);
    const bars = sections.length * 8;
    const played = playedPlan([`&${head}, &${head}Plays from ${id} &song`], `&${head}`, `&${head}Plays`, bars + 8);
    expect(played.diagnostics).toEqual([]);
    played.bars.forEach((heard, b) => expectBar(heard, wanted(sections[Math.floor(b / 8) % sections.length]!, b % 8), `bar ${b}`));
  });
});
