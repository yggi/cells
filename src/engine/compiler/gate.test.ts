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
    expect(errors('&leadOut trigger=&tune &lead 3\n&out map=sample &leadOut').join()).toMatch(/is a gate \(trigger=\): its braid lists what it plays/);
  });

  it('is a node of its own in the graph, its trigger, levels and receivers wired in', () => {
    const r = compileSource(BASE + '&beat step=&bar/2 0 2 1 2\n&drums trigger=&beat velocity=&accent &kit\n&out map=sample &drums');
    const g = buildGraph(r);
    const into = g.edges.filter((e) => e.to === 'cell:drums').map((e) => `${e.from} ${e.port}`);
    expect(into).toEqual(expect.arrayContaining(['cell:beat trigger', 'cell:accent velocity', 'cell:kit braid']));
  });
});
