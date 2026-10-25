import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { routing } from '../routing';
import { channelTable, router, routesOf } from '../midi';

const BASE = `&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&bd s=sine loop=C2
&sd s=white
&hh s=white hpf=6000
&kit &bd &sd &hh
&lead s=tri loop=C5
&bell s=sine loop=C6
&tune over=&major step=&bar*2 0 2 4 2
&accent map=amp step=&bar*2 1 .5 .8 .5
`;

// what plays in the first two seconds: voice, onset, pitch and gain
const played = (src: string) => {
  const r = compileSource(BASE + src);
  expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r)), 0, 2).map(
    (e) => `${e.voice} ${e.at.toFixed(3)} ${e.freq.toFixed(2)} ${e.gains.map((g) => g.toFixed(3)).join('/')} ${JSON.stringify(e.levels)}`,
  );
};
const errors = (src: string) =>
  compileSource(BASE + src)
    .diagnostics.filter((d) => d.severity === 'error')
    .map((d) => d.message);

describe('a gate (trigger=): a product with a name', () => {
  it('plays each receiver with each note of its trigger, as the product it stands for', () => {
    expect(played('&leadOut trigger=&tune velocity=&accent gain=.4 &lead &bell\n&out map=sample &leadOut')).toEqual(
      played('&leadOut [&tune * &accent * &lead * .4, &tune * &accent * &bell * .4]\n&out map=sample &leadOut'),
    );
  });

  it('a gate= cell is one more level, over time', () => {
    const duck = '&duck map=amp step=&bar 1 .25\n';
    expect(played(duck + '&leadOut trigger=&tune gate=&duck &lead\n&out map=sample &leadOut')).toEqual(played(duck + '&leadOut [&tune * &duck * &lead]\n&out map=sample &leadOut'));
  });

  it('a kit among its receivers is played as a pattern read through it: the trigger’s numbers pick the member', () => {
    const through = played('&beat over=&kit step=&bar*2 0 2 1 2\n&out map=sample [&beat * .6]');
    expect(through.map((e) => e.split(' ')[0])).toEqual(['bd', 'hh', 'sd', 'hh', 'bd', 'hh', 'sd', 'hh']);
    expect(played('&beat step=&bar*2 0 2 1 2\n&drums trigger=&beat gain=.6 &kit\n&out map=sample &drums')).toEqual(through);
    // (inside the sound card's own mix, as beside other sounds)
    expect(played('&beat step=&bar*2 0 2 1 2\n&drums trigger=&beat gain=.6 &kit\n&out map=sample [&drums, &tune * &lead * 0]').filter((e) => !e.startsWith('lead'))).toEqual(
      through,
    );
    // (a trigger read through the kit already: the kit adds nothing)
    expect(played('&beat over=&kit step=&bar*2 0 2 1 2\n&drums trigger=&beat gain=.6 &kit\n&out map=sample &drums')).toEqual(through);
  });

  it('routes what a kit gate plays: its trigger, the kit and its members', () => {
    const r = compileSource(BASE + '&beat step=&bar*2 0 2 1 2\n&drums trigger=&beat &kit\n&out map=sample [&drums]');
    const on = routing(r, new Set()).nodes;
    for (const n of ['beat', 'kit', 'bd', 'sd', 'hh', 'drums']) expect(on.has(`cell:${n}`), n).toBe(true);
  });

  it('a MIDI card takes a gate as an entry, as any mix: its receivers on that channel, a kit gate by drum note', () => {
    const r = compileSource(
      BASE + '&beat step=&bar*2 0 2 1 2\n&drums trigger=&beat &kit\n&leadOut trigger=&tune &lead &bell\n&out map=sample [&leadOut, &drums]\n&synth map=midi &leadOut ~!8 &drums',
    );
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    const route = router(r, channelTable(r));
    const events = eventsBetween(plan(r, codeShifts(r)), 0, 2, true);
    const at = (v: string) => routesOf(route(events.find((e) => e.voice === v)!)).map((x) => [x.channel, x.drum]);
    expect(at('lead')).toEqual([[1, null]]);
    expect(at('bell')).toEqual([[1, null]]);
    expect(at('bd')).toEqual([[10, 36]]);
  });

  it('a kit is still no voice in a product of its own', () => {
    expect(errors('&beat step=&bar*2 0 2 1 2\n&out map=sample [&beat * &kit]').join()).toMatch(/&kit is a kit, a table of voices/);
  });

  it('its braid lists receivers only', () => {
    expect(errors('&leadOut trigger=&tune &lead 3\n&out map=sample &leadOut').join()).toMatch(/is a gate \(trigger=\): its braid is what it plays/);
  });
});

describe('a gate (play=, level=): decision 023', () => {
  it('play= is what it plays, level= a product of levels and a gain: the old spelling’s product', () => {
    const duck = '&duck map=amp step=&bar 1 .25\n';
    expect(played(duck + '&leadOut play=&tune level=&accent*&duck*.4 &lead\n&out map=sample &leadOut')).toEqual(
      played(duck + '&leadOut trigger=&tune velocity=&accent gate=&duck gain=.4 &lead\n&out map=sample &leadOut'),
    );
    expect(played('&leadOut play=&tune level=.4 &lead\n&out map=sample &leadOut')).toEqual(played('&leadOut [&tune * &lead * .4]\n&out map=sample &leadOut'));
    expect(played('&leadOut play=&tune level=.5*&accent &lead\n&out map=sample &leadOut')).toEqual(played('&leadOut [&tune * &accent * &lead * .5]\n&out map=sample &leadOut'));
  });

  it('a chord of voices plays all of them', () => {
    expect(played('&leadOut play=&tune [&lead, &bell]\n&out map=sample &leadOut')).toEqual(played('&leadOut [&tune * &lead, &tune * &bell]\n&out map=sample &leadOut'));
  });

  it('several bare voices are a kit: its notes pick one', () => {
    const picks = played('&steps step=&bar*2 0 1 1 0\n&g play=&steps &lead &bell\n&out map=sample &g').map((e) => e.split(' ')[0]);
    expect(picks).toEqual(['lead', 'bell', 'bell', 'lead', 'lead', 'bell', 'bell', 'lead']);
    // (as a kit written out: &k &lead &bell, played by the same steps)
    expect(played('&steps step=&bar*2 0 1 1 0\n&g play=&steps &lead &bell\n&out map=sample &g')).toEqual(
      played('&k &lead &bell\n&steps step=&bar*2 0 1 1 0\n&g play=&steps &k\n&out map=sample &g'),
    );
  });
});

describe('a gate is a performer (decision 058): its name its role, and it transposes what it plays', () => {
  const performers = (src: string) => compileSource(BASE + src).performers;
  // (semitones from C4, as the voice at C5 plays them: 12 is the tune's 0)
  const semis = (src: string) => {
    const r = compileSource(BASE + src);
    // (BASE's own step=&bar*2 warns; nothing else may)
    expect(r.diagnostics.map((d) => d.message).filter((m) => !m.startsWith('step=&bar*2'))).toEqual([]);
    return eventsBetween(plan(r, codeShifts(r)), 0, 2).map((e) => Math.round(12 * Math.log2(e.freq / 261.6256)) + 0);
  };

  it('reads a role off its name, a trailing number a copy, any other name none', () => {
    const roles = performers(
      '&bass play=&tune &lead\n&lead2 play=&tune &bell\n&drums play=&tune &kit\n&leadOut play=&tune &lead\n&out map=sample [&bass, &lead2, &drums, &leadOut]',
    );
    expect(roles.map((p) => [p.name, p.role])).toEqual([
      ['bass', 'bass'],
      ['lead2', 'lead'],
      ['drums', 'drums'],
      ['leadOut', null],
    ]);
  });

  it('says who plays which part, on what, moved how', () => {
    expect(performers('&bass play=&tune^$-12 level=&accent*.8 [&lead, &bell]\n&out map=sample &bass')).toEqual([
      { name: 'bass', role: 'bass', part: 'tune', move: { transpose: -12 }, voices: ['lead', 'bell'] },
    ]);
    expect(performers('&lead2 play=&tune^2 &lead\n&out map=sample &lead2')).toEqual([{ name: 'lead2', role: 'lead', part: 'tune', move: { degree: 2 }, voices: ['lead'] }]);
    expect(performers('&out map=sample [&tune * &lead]')).toEqual([]);
  });

  it('play=&tune^$-12 plays every note 12 semitones down', () => {
    const as = semis('&g play=&tune &lead\n&out map=sample &g');
    expect(as).toEqual([12, 16, 19, 16, 12, 16, 19, 16]);
    expect(semis('&g play=&tune^$-12 &lead\n&out map=sample &g')).toEqual(as.map((n) => n - 12));
    // (an output's id reads the part, moved)
    expect(compileSource(BASE + '&g play=&tune^$-12 &lead\n&out map=sample &g').outputs.map((o) => o.id.split(':').slice(0, 2).join(':'))).toEqual(['lead:tune^$-12']);
  });

  it('play=&tune^2 plays two degrees up, over the tune’s table', () => {
    // (C D E F G A B over C major: the tune's 0 2 4 2 is C E G E, two degrees up E G B G)
    expect(semis('&g play=&tune^2 &lead\n&out map=sample &g')).toEqual([16, 19, 23, 19, 16, 19, 23, 19]);
    expect(semis('&g play=&tune^-1 &lead\n&out map=sample &g')).toEqual([11, 14, 17, 14, 11, 14, 17, 14]);
    expect(played('&g play=&tune^2 &lead\n&out map=sample &g')).toEqual(played('&up base=&tune^2\n&g play=&up &lead\n&out map=sample &g'));
  });

  it('moves as a braid playing the part moved does: by the grid’s steps, the part’s turn, laps and off kept', () => {
    const as = (tune: string, gate: string) => {
      const braid = played(`${tune}\n&up over=&major step=&bar*2 &t${gate}\n&g play=&up &lead\n&out map=sample &g`);
      expect(played(`${tune}\n&g play=&t${gate} &lead\n&out map=sample &g`)).toEqual(braid);
      return braid;
    };
    // (19 steps of a 19-tone grid: an octave)
    const edo = '&edo19 cycle=19 map=edo\n&k19 over=&edo19 scan(3 3 2 3 3 3 2)\n&t over=&k19 step=&bar*2 0 1 2 3';
    expect(played(`${edo}\n&g play=&t^$-19 &lead\n&out map=sample &g`).map((e) => Math.round(+e.split(' ')[2] * 2))).toEqual(
      played(`${edo}\n&g play=&t &lead\n&out map=sample &g`).map((e) => Math.round(+e.split(' ')[2])),
    );
    as('&t over=&major step=&bar*2 shift=1 0 [2 4] 1 3', '^$-12');
    // (a part's laps= are its own: the gate plays them, where a braid splicing it would loop it)
    expect(played('&t over=&major step=&bar*2 laps=1 0 2\n&g play=&t^2 &lead\n&out map=sample &g')).toHaveLength(2);
    // (a part written off: the gate is silent with it)
    const off = compileSource(BASE + '&t over=&major step=&bar*2 off 0 2\n&g play=&t^$7 &lead\n&out map=sample &g');
    expect(eventsBetween(plan(off, codeShifts(off), off.off), 0, 2)).toEqual([]);
  });

  it('a read head reads its tape itself: a move there is ignored, and warns', () => {
    const r = compileSource(BASE + '&tape write=&tune length=1\n&h play=&tape^$-12');
    expect(r.diagnostics.map((d) => d.message).filter((m) => !m.startsWith('step=&bar*2'))).toEqual([
      expect.stringMatching(/^&tape\^\$-12 after play=: .*a read head reads the tape itself, so the move is ignored/),
    ]);
  });
});
