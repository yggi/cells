import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { buildGraph } from '../graph';
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
&tune over=&major step=&bar/2 0 2 4 2
&accent map=amp step=&bar/2 1 .5 .8 .5
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
    const through = played('&beat over=&kit step=&bar/2 0 2 1 2\n&out map=sample [&beat * .6]');
    expect(through.map((e) => e.split(' ')[0])).toEqual(['bd', 'hh', 'sd', 'hh', 'bd', 'hh', 'sd', 'hh']);
    expect(played('&beat step=&bar/2 0 2 1 2\n&drums trigger=&beat gain=.6 &kit\n&out map=sample &drums')).toEqual(through);
    // (inside the sound card's own mix, as beside other sounds)
    expect(played('&beat step=&bar/2 0 2 1 2\n&drums trigger=&beat gain=.6 &kit\n&out map=sample [&drums, &tune * &lead * 0]').filter((e) => !e.startsWith('lead'))).toEqual(
      through,
    );
    // (a trigger read through the kit already: the kit adds nothing)
    expect(played('&beat over=&kit step=&bar/2 0 2 1 2\n&drums trigger=&beat gain=.6 &kit\n&out map=sample &drums')).toEqual(through);
  });

  it('routes what a kit gate plays: its trigger, the kit and its members', () => {
    const r = compileSource(BASE + '&beat step=&bar/2 0 2 1 2\n&drums trigger=&beat &kit\n&out map=sample [&drums]');
    const on = routing(r, new Set()).nodes;
    for (const n of ['beat', 'kit', 'bd', 'sd', 'hh', 'drums']) expect(on.has(`cell:${n}`), n).toBe(true);
  });

  it('a MIDI card takes a gate as an entry, as any mix: its receivers on that channel, a kit gate by drum note', () => {
    const r = compileSource(
      BASE + '&beat step=&bar/2 0 2 1 2\n&drums trigger=&beat &kit\n&leadOut trigger=&tune &lead &bell\n&out map=sample [&leadOut, &drums]\n&synth map=midi &leadOut ~!8 &drums',
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
    expect(errors('&beat step=&bar/2 0 2 1 2\n&out map=sample [&beat * &kit]').join()).toMatch(/&kit is a kit, a table of voices/);
  });

  it('its braid lists receivers only', () => {
    expect(errors('&leadOut trigger=&tune &lead 3\n&out map=sample &leadOut').join()).toMatch(/is a gate \(trigger=\): its braid is what it plays/);
  });

  it('is a node of its own in the graph, its trigger, levels and receivers wired in', () => {
    const r = compileSource(BASE + '&beat step=&bar/2 0 2 1 2\n&drums trigger=&beat velocity=&accent &kit\n&out map=sample &drums');
    const g = buildGraph(r);
    const into = g.edges.filter((e) => e.to === 'cell:drums').map((e) => `${e.from} ${e.port}`);
    expect(into).toEqual(expect.arrayContaining(['cell:beat trigger', 'cell:accent velocity']));
    // (its notes out to what it plays, whose sound goes on into the card)
    expect(g.edges.filter((e) => e.from === 'cell:drums').map((e) => `${e.to} ${e.port}`)).toEqual(['cell:kit voice']);
    expect(g.edges.some((e) => e.from === 'cell:kit' && e.to === 'cell:out' && e.band === 'audio')).toBe(true);
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
    const picks = played('&steps step=&bar/2 0 1 1 0\n&g play=&steps &lead &bell\n&out map=sample &g').map((e) => e.split(' ')[0]);
    expect(picks).toEqual(['lead', 'bell', 'bell', 'lead', 'lead', 'bell', 'bell', 'lead']);
    // (as a kit written out: &k &lead &bell, played by the same steps)
    expect(played('&steps step=&bar/2 0 1 1 0\n&g play=&steps &lead &bell\n&out map=sample &g')).toEqual(
      played('&k &lead &bell\n&steps step=&bar/2 0 1 1 0\n&g play=&steps &k\n&out map=sample &g'),
    );
  });

  it('a gate’s play= is no read head, and its cells are wired into it as written', () => {
    const r = compileSource(BASE + '&duck map=amp step=&bar 1 .25\n&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]\n&out map=sample &leadOut');
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    expect(r.cells.get('leadOut')!.gate).toEqual({
      notes: 'tune',
      port: 'play',
      levels: [
        { name: 'accent', port: 'level' },
        { name: 'duck', port: 'level' },
      ],
      gain: 0.4,
      receivers: ['lead', 'bell'],
    });
    expect(r.tapes).toEqual([]);
    const g = buildGraph(r);
    expect(g.edges.filter((e) => e.to === 'cell:leadOut').map((e) => `${e.from} ${e.port}`)).toEqual(['cell:tune play', 'cell:accent level', 'cell:duck level']);
    expect(g.edges.filter((e) => e.from === 'cell:leadOut').map((e) => `${e.to} ${e.port}`)).toEqual(['cell:lead voice', 'cell:bell voice']);
  });

  it('a kit it made of bare voices: the bus to each voice, their sound into the mix', () => {
    const g = buildGraph(compileSource(BASE + '&steps step=&bar/2 0 1\n&g play=&steps &lead &bell\n&out map=sample [&g]'));
    expect(g.edges.filter((e) => e.from === 'cell:g').map((e) => e.to)).toEqual(['cell:lead', 'cell:bell']);
    expect(g.edges.filter((e) => e.to === 'cell:out').map((e) => e.from)).toEqual(['cell:lead', 'cell:bell']);
    expect(g.nodes.some((n) => n.id === 'cell:g:kit')).toBe(false);
  });
});
