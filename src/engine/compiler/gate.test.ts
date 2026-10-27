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

  // (lifted from yggi/cell-studio src/layout/gate.drawn.test.ts @ 23a5972, #326: a gate's reading is the compiler's)
  it('a gate’s play= is what it plays, its level= the levels and a gain, its cells the receivers, as written', () => {
    const r = compileSource(BASE + '&duck map=amp step=4n 1 .25\n&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]\n&out map=sample &leadOut');
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    expect(r.cells.get('leadOut')!.gate).toEqual({
      notes: 'tune',
      plays: 'tune',
      port: 'play',
      levels: [
        { name: 'accent', port: 'level' },
        { name: 'duck', port: 'level' },
      ],
      gain: 0.4,
      receivers: ['lead', 'bell'],
    });
    expect(r.tapes).toEqual([]);
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

describe("a gate is a performer (decision 058), its role a role cell's (decision 061), and it transposes what it plays", () => {
  const performers = (src: string) => compileSource(BASE + src).performers;
  // (semitones from C4, as the voice at C5 plays them: 12 is the tune's 0)
  const semis = (src: string) => {
    const r = compileSource(BASE + src);
    // (BASE's own step=&bar*2 warns; nothing else may)
    expect(r.diagnostics.map((d) => d.message).filter((m) => !m.startsWith('step=&bar*2'))).toEqual([]);
    return eventsBetween(plan(r, codeShifts(r)), 0, 2).map((e) => Math.round(12 * Math.log2(e.freq / 261.6256)) + 0);
  };

  it('takes its role from the role cell that names it, and none from its name (decision 061)', () => {
    const roles = performers(
      '&first play=&tune &lead\n&second play=&tune &bell\n&bass play=&tune &bell\n&lead2 play=&tune &lead\n&melody map=role &first\n&comp map=role &second &lead2\n&out map=sample [&first, &second, &bass, &lead2]',
    );
    expect(roles.map((p) => [p.name, p.role])).toEqual([
      ['first', 'melody'],
      ['second', 'comp'],
      ['bass', undefined],
      ['lead2', 'comp'],
    ]);
  });

  it('says who plays which part, on what, moved how', () => {
    expect(performers('&bassOut play=&tune^$-12 level=&accent*.8 [&lead, &bell]\n&bass map=role &bassOut\n&out map=sample &bassOut')).toEqual([
      { name: 'bassOut', role: 'bass', part: 'tune', move: { transpose: -12 }, voices: ['lead', 'bell'] },
    ]);
    expect(performers('&g play=&tune^2 &lead\n&out map=sample &g')).toEqual([{ name: 'g', part: 'tune', move: { degree: 2 }, voices: ['lead'] }]);
    expect(performers('&out map=sample [&tune * &lead]')).toEqual([]);
  });

  it('refuses a role that names no gate, a gate in two roles, and a role played as a sound', () => {
    const errors = (src: string) =>
      compileSource(BASE + '&g play=&tune &lead\n&h play=&tune &bell\n' + src)
        .diagnostics.filter((d) => d.severity === 'error')
        .map((d) => d.message);
    const noSound = '&r is a role: it names the gates that play it, and is no sound to mix, send or play (name its gates here)';
    expect(errors('&r map=role &g\n&s map=role &g &h\n&out map=sample [&g, &h]')).toEqual(['&g plays two roles, &r and &s: a gate plays one']);
    expect(errors('&r map=role &g &h &g\n&out map=sample [&g, &h]')).toEqual([]);
    expect(errors('&r map=role\n&out map=sample [&g, &h]')).toEqual(['&r is a role: name the gates that play it (&r map=role &player)']);
    expect(errors('&r map=role &g &tune\n&out map=sample [&g, &h]')).toEqual(["&tune: a role's entries are gates, as written (&player play=&part &voice), and &tune is not one"]);
    expect(errors('&r map=role &g ~ &h^$2\n&out map=sample [&g, &h]')).toEqual([
      "a role's entries are the gates that play it, as written (&r map=role &player &player2)",
      "&h: a role's entries are gates, as written (&player play=&part &voice), and &h is not one",
    ]);
    expect(errors('&r map=role &g\n&out map=sample [&r]')).toEqual([noSound]);
    expect(errors('&r map=role &g\n&out map=sample &r')).toEqual([noSound]);
    expect(errors('&r map=role &g\n&out map=midi &r')).toEqual([noSound]);
    expect(errors('&r map=role &g\n&p play=&r &lead\n&out map=sample [&p]')).toEqual([noSound]);
    expect(errors('&r map=role &nobody\n&out map=sample [&g, &h]')).toEqual(['Unknown cell &nobody']);
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

// #287: a gate plays a stack of lines, each as if it were its one line, so each keeps its own name in what sounds
describe('a gate plays a stack of lines', () => {
  const two = '&lo over=&major step=&bar*2 0 2\n&hi over=&major step=&bar 4 7\n';
  const lines = two + '&both [&lo, &hi]\n';
  const ids = (src: string) => compileSource(BASE + src).outputs.map((o) => o.id.split(':').slice(0, 2).join(':'));

  it('plays each line as it plays one, at its level, on each of its voices', () => {
    expect(played(lines + '&pad play=&both level=&accent*.5 [&lead, &bell]\n&out map=sample &pad')).toEqual(
      played(two + '&pad [&lo * &accent * &lead * .5, &lo * &accent * &bell * .5, &hi * &accent * &lead * .5, &hi * &accent * &bell * .5]\n&out map=sample &pad'),
    );
    expect(ids(lines + '&pad play=&both &lead\n&out map=sample &pad')).toEqual(['lead:lo', 'lead:hi']);
    expect(compileSource(BASE + lines + '&pad play=&both &lead\n&out map=sample &pad').performers).toEqual([{ name: 'pad', part: 'both', voices: ['lead'] }]);
  });

  it('moves each line, and a pick on a line is kept', () => {
    expect(played(lines + '&pad play=&both^$-12 &lead\n&out map=sample &pad')).toEqual(
      played(two + '&p1 play=&lo^$-12 &lead\n&p2 play=&hi^$-12 &lead\n&out map=sample [&p1, &p2]'),
    );
    expect(ids(lines + '&pad play=&both^$-12 &lead\n&out map=sample &pad')).toEqual(['lead:lo^$-12', 'lead:hi^$-12']);
    expect(played(two + '&both [&lo, &hi[<<1]]\n&pad play=&both &lead\n&out map=sample &pad')).toEqual(played(two + '&pad [&lo * &lead, &hi[<<1] * &lead]\n&out map=sample &pad'));
  });

  it('a kit plays lines of numbers and lines of its voices alike, each by its own name', () => {
    const numbers = '&kick step=&bar*2 0 ~ 0 ~\n&hat step=&bar*4 2\n&beat [&kick, &hat]\n&drums play=&beat &kit\n&out map=sample &drums';
    expect(played(numbers)).toEqual(played('&kick over=&kit step=&bar*2 0 ~ 0 ~\n&hat over=&kit step=&bar*4 2\n&out map=sample [&kick, &hat]'));
    const voices = '&kick step=&bar*2 &bd ~ &bd ~\n&hat step=&bar*4 &hh:0:.4\n&beat [&kick, &hat]\n&drums play=&beat &kit\n&out map=sample &drums';
    expect(played(voices)).toEqual(played('&kick step=&bar*2 &bd ~ &bd ~\n&hat step=&bar*4 &hh:0:.4\n&out map=sample [&kick, &hat]'));
    expect(compileSource(BASE + voices).outputs.map((o) => o.id.split(':').slice(0, 3).join(':'))).toEqual(['kit:voices:kick', 'kit:voices:hat']);
  });

  it('a member is a line times its levels, which scale its notes as in a mix; a sound beside a line is refused', () => {
    expect(played(lines.replace('[&lo, &hi]', '[&lo * &accent, &hi * .5]') + '&pad play=&both &lead\n&out map=sample &pad')).toEqual(
      played(two + '&pad [&lo * &accent * &lead, &hi * &lead * .5]\n&out map=sample &pad'),
    );
    expect(ids(lines.replace('[&lo, &hi]', '[&lo * &accent, &hi * .5]') + '&pad play=&both &lead\n&out map=sample &pad')).toEqual(['lead:lo', 'lead:hi']);
    expect(errors(lines.replace('[&lo, &hi]', '[&lo * &bell, &hi]') + '&pad play=&both &lead\n&out map=sample &pad')).toEqual([
      '&both is a stack of lines, each times its levels: &bell is a sound, not a level (a cell with map=amp, map=db or map=lin, or a number)',
    ]);
  });
});

// (#282's probe: a part with legato= read as a kit's member, so a braid splicing it, or a gate playing it moved, was a kit)
describe('a line’s own parameters make no voice of it', () => {
  const diagnostics = (src: string) =>
    compileSource(BASE + src)
      .diagnostics.map((d) => d.message)
      .filter((m) => !m.startsWith('step=&bar*2'));
  it('a gate plays a part with legato= moved, beside a kit', () => {
    expect(diagnostics('&t over=&major step=&bar*2 legato=.5 0 2\n&g play=&t^$-12 &lead\n&drums play=&tune &kit\n&out map=sample [&g, &drums]')).toEqual([]);
    expect(played('&t over=&major step=&bar*2 legato=.5 0 2\n&g play=&t^$-12 &lead\n&out map=sample &g')).toHaveLength(8);
  });
  it('a braid splicing a line with legato= is that line', () => {
    expect(diagnostics('&t step=&bar*2 legato=.5 0 2\n&up step=&bar*2 &t\n&g play=&up &lead\n&out map=sample &g')).toEqual([]);
  });
  it('and is said to be a melody, not a kit, where it lacks a voice (the bindings read members as the sorts do)', () => {
    expect(diagnostics('&t step=&bar*2 legato=.5 0 2\n&up step=&bar*2 &t\n&out map=midi &up')).toEqual([
      '&up is a melody without a voice: a MIDI channel plays notes on a voice, [&up * &voice]',
    ]);
  });
});
