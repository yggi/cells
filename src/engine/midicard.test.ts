// A MIDI card (#208, decision 019): map=midi, its entries channels — parsed, compiled, planned, routed, drawn.
import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, outputPlays, outputSounds, plan } from './realize';
import { channelTable, midiNote, router, routesOf } from './midi';
import { flows } from './flows';
import { routing } from './routing';
import { buildGraph } from './graph';
import { cellId, edgeId } from './ids';
import { PRESETS } from './presets';

const BAND = `&bar scan(1 1 1 1) step=2
&theme step=&bar 0 2 4 5
&reed s=square loop=220
&bass step=&bar*2 0 5
&sub loop=55
&groove step=&bar/2 &bd ~ &hh ~
&bd s=sine loop=A1
&hh s=white hpf=8000`;
const OUT = `&out map=sample [&theme * &reed, &groove]`;

const compiled = (src: string) => {
  const r = compileSource(src);
  return {
    r,
    errors: r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message),
    warnings: r.diagnostics.filter((d) => d.severity === 'warning').map((d) => d.message),
  };
};
const eventsOf = (src: string, seconds = 4, muted = new Set<string>()) => {
  const r = compileSource(src);
  return eventsBetween(plan(r, codeShifts(r), muted), 0, seconds, true);
};

describe('parse: map=midi', () => {
  const mapOf = (src: string) => {
    const p = parse(src);
    return { map: p.cells[0]?.map, errors: p.diagnostics.map((d) => d.message) };
  };
  it('map=midi: entries on channels in order; midi(10): one channel; midi(10, 2): on output slot 2', () => {
    expect(mapOf('&s map=midi [&a * &b] ~!7 &g').map).toMatchObject({ kind: 'midi', channel: null, port: 1 });
    expect(mapOf('&s map=midi(10) &g').map).toMatchObject({ kind: 'midi', channel: 10, port: 1 });
    expect(mapOf('&s map=midi(10, 2) &g').map).toMatchObject({ kind: 'midi', channel: 10, port: 2 });
    expect(mapOf('&s map=midi(16,16) &g').map).toMatchObject({ channel: 16, port: 16 });
  });
  it('a channel or a slot out of 1–16, or not whole, is an error that says so', () => {
    for (const bad of ['&s map=midi(0) &g', '&s map=midi(17) &g', '&s map=midi(1.5) &g', '&s map=midi() &g'])
      expect(mapOf(bad).errors[0], bad).toMatch(/A MIDI channel is a whole number from 1 to 16/);
    for (const bad of ['&s map=midi(10, 0) &g', '&s map=midi(10, 17) &g']) expect(mapOf(bad).errors[0], bad).toMatch(/A MIDI output slot is a whole number from 1 to 16/);
    expect(mapOf('&s map=midi(10, 2 &g').errors[0]).toMatch(/'\)' to close midi/);
  });
});

describe('compile: a MIDI card', () => {
  it('is a card of its own kind: not the sound card, not a mix', () => {
    const { r, errors } = compiled(`${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`);
    expect(errors).toEqual([]);
    const card = r.cells.get('synth')!;
    expect([card.sink, card.mix, card.map]).toEqual([false, null, { kind: 'midi', channel: null, port: 1 }]);
  });

  it('entries are channels: ~ skips one, x!n takes n; a voice on both cards is one output, heard and sent', () => {
    const { r } = compiled(`${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`);
    const by = (voice: string) => r.outputs.find((o) => o.voice === voice)!;
    expect(r.outputs.filter((o) => o.voice === 'reed')).toHaveLength(1);
    expect(by('reed').midi).toEqual([{ card: 'synth', mix: null, channel: 1, port: 1, gain: 1 }]);
    expect(by('reed').parts.length).toBe(1);
    expect(by('sub').midi).toEqual([{ card: 'synth', mix: null, channel: 2, port: 1, gain: 1 }]);
    expect(by('sub').parts).toEqual([]);
    expect(by('kit:voices').midi!.map((m) => m.channel)).toEqual([10]);
  });

  it('a voice only on a MIDI card is planned and sent, not heard; on both, the same notes on both', () => {
    const src = `${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub]`;
    const { r } = compiled(src);
    const sub = r.outputs.find((o) => o.voice === 'sub')!;
    expect([outputSounds(r, sub, new Set()), outputPlays(r, sub, new Set())]).toEqual([false, true]);
    const events = eventsOf(src);
    const subs = events.filter((e) => e.voice === 'sub');
    expect(subs.length).toBeGreaterThan(0);
    for (const e of subs) expect([e.unheard, e.gains, e.midi?.[0].channel]).toEqual([true, [0, 0], 2]);
    // the reed: heard (its gains), and sent on 1 — the very notes, not a copy
    const reeds = events.filter((e) => e.voice === 'reed');
    for (const e of reeds) expect([e.unheard, e.gains[0] > 0, e.midi?.[0].channel]).toEqual([undefined, true, 1]);
    const alone = eventsOf(`${BAND}\n${OUT}`).filter((e) => e.voice === 'reed');
    expect(reeds.map((e) => [e.at, e.dur, e.freq])).toEqual(alone.map((e) => [e.at, e.dur, e.freq]));
  });

  it('switched off: a MIDI card takes away what only it sends; the sound card, what it hears', () => {
    const src = `${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub]`;
    expect(eventsOf(src, 4, new Set([cellId('synth')])).filter((e) => e.voice === 'sub')).toEqual([]);
    const reeds = eventsOf(src, 4, new Set([cellId('synth')])).filter((e) => e.voice === 'reed');
    expect(reeds.every((e) => !e.midi && !e.unheard)).toBe(true);
    const sent = eventsOf(src, 4, new Set([cellId('out')])).filter((e) => e.voice === 'reed');
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.every((e) => e.unheard && e.midi?.[0].channel === 1)).toBe(true);
  });

  it('a melody without a voice is an error that names it; so are numbers as an entry, and loop=', () => {
    expect(compiled(`${BAND}\n${OUT}\n&synth map=midi &theme`).errors).toEqual(['&theme is a melody without a voice: a MIDI channel plays notes on a voice, [&theme * &voice]']);
    expect(compiled(`${BAND}\n${OUT}\n&synth map=midi 0 1`).errors[0]).toMatch(/A MIDI card's entries are channels/);
    expect(compiled(`${BAND}\n${OUT}\n&synth loop=1 map=midi [&theme * &reed]`).errors[0]).toMatch(/A MIDI card doesn't turn: leave out loop=/);
    expect(compiled(`${BAND}\n${OUT}\n&synth map=midi [&theme * &reed]*2`).errors[0]).toMatch(/\* and @ mean nothing here/);
  });

  it('16 channels at most, unless all go on one', () => {
    expect(compiled(`${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] ~!16`).errors[0]).toMatch(/A MIDI card has 16 channels, and &synth names 17/);
    expect(compiled(`${BAND}\n${OUT}\n&synth map=midi(3) [&theme * &reed] ~!16`).errors).toEqual([]);
  });

  it("warns: a voice only on MIDI says once that its sound isn't sent; pan= and level= on a card do nothing", () => {
    const sounds = `${BAND}\n&lead s=saw lpf=900 loop=110\n&keys s=sine loop=220\n${OUT}\n&synth map=midi [&bass * &lead] [&theme * &keys]`;
    expect(compiled(sounds).warnings).toEqual([
      "&lead is only on a MIDI card: its sound (s= lpf=) isn't sent — MIDI carries its notes, velocity and bends; the device makes the sound",
    ]);
    expect(compiled(`${BAND}\n${OUT}\n&synth map=midi [&bass * &sub]`).warnings).toEqual([]);
    // (a voice heard through another melody is not "only on a MIDI card")
    const heard = `${BAND}\n&lead s=saw lpf=900 loop=110\n&synth map=midi [&theme * &lead]\n&out loop=SAMPLE_RATE map=sample [&theme * &reed, &bass * &lead]`;
    expect(compiled(heard).warnings.filter((w) => /only on a MIDI card/.test(w))).toEqual([]);
    expect(compiled(`${BAND}\n${OUT}\n&synth pan=.3 map=midi [&bass * &sub]`).warnings[0]).toMatch(/pan= places a voice: on a MIDI card it does nothing/);
    expect(compiled(`${BAND}\n${OUT}\n&synth level=-3 map=midi [&bass * &sub]`).warnings[0]).toMatch(/level= acts on .*: on &synth it does nothing/);
  });

  it('a piece with only a MIDI card is not told that nothing plays', () => {
    const { warnings, errors } = compiled(`${BAND}\n&synth map=midi [&bass * &sub]`);
    expect([...errors, ...warnings]).toEqual([]);
    expect(eventsOf(`${BAND}\n&synth map=midi [&bass * &sub]`).every((e) => e.unheard)).toBe(true);
  });

  it('an entry may be a mix cell; switching the mix off takes its notes away', () => {
    const src = `${BAND}\n&lead [&theme * &reed]\n${OUT}\n&synth map=midi(4) &lead`;
    const { r, errors } = compiled(src);
    expect(errors).toEqual([]);
    expect(r.outputs.find((o) => o.voice === 'reed')!.midi).toEqual([{ card: 'synth', mix: 'lead', channel: 4, port: 1, gain: 1 }]);
    expect(eventsOf(src, 4, new Set([cellId('lead')])).filter((e) => e.voice === 'reed' && e.midi)).toEqual([]);
  });
});

describe('MIDI out from a card: the channel table and the router', () => {
  const card = `${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove\n&more map=midi(5, 2) [&theme * &reed * .5]`;
  it("set by the piece: what its cards name, on their channels and slots; a kit's members with their drum notes", () => {
    const r = compileSource(card);
    const t = channelTable(r, { reed: 9 });
    expect(t.byPiece).toBe(true);
    expect(t.ports).toEqual([1, 2]);
    expect(t.voices).toEqual([
      { voice: 'reed', channel: 1, port: 1 },
      { voice: 'reed', channel: 5, port: 2 },
      { voice: 'sub', channel: 2, port: 1 },
    ]);
    expect(t.kit).toEqual([
      { member: 'bd', note: 36 },
      { member: 'hh', note: 42 },
    ]);
  });

  it('routes each note to every entry it is on (~ skipped), a kit as drum notes on its card’s channel, at its gain there', () => {
    const r = compileSource(card);
    const route = router(r, channelTable(r));
    const events = eventsBetween(plan(r, codeShifts(r)), 0, 4, true);
    const reed = events.find((e) => e.voice === 'reed')!;
    expect(routesOf(route(reed))).toEqual([
      { channel: 1, drum: null, port: 1, gain: 1 },
      { channel: 5, drum: null, port: 2, gain: 0.5 },
    ]);
    expect(routesOf(route(events.find((e) => e.voice === 'sub')!))).toEqual([{ channel: 2, drum: null, port: 1, gain: 1 }]);
    expect(routesOf(route(events.find((e) => e.voice === 'bd')!))).toEqual([{ channel: 10, drum: 36, port: 1, gain: 1 }]);
    // (velocity reads the card's gain: half as loud on the second card)
    const [a, b] = routesOf(route(reed)).map((x) => midiNote(reed, x)!.velocity);
    expect(a).toBeGreaterThan(b);
  });

  it('a kit on a one-channel card goes on that channel; what no card names is not sent', () => {
    const r = compileSource(`${BAND}\n${OUT}\n&drums map=midi(3) &groove`);
    const route = router(r, channelTable(r));
    const events = eventsBetween(plan(r, codeShifts(r)), 0, 4, true);
    expect(routesOf(route(events.find((e) => e.voice === 'hh')!))).toEqual([{ channel: 3, drum: 42, port: 1, gain: 1 }]);
    expect(routesOf(route(events.find((e) => e.voice === 'reed')!))).toEqual([]);
    expect(channelTable(r).voices).toEqual([]);
  });

  it('a piece with no card keeps the default output: every voice heard, a channel each', () => {
    const t = channelTable(compileSource(PRESETS.sailor.source));
    expect([t.byPiece, t.ports]).toEqual([undefined, undefined]);
  });
});

describe('a MIDI card in the flows, the routing and the graph', () => {
  const src = `${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`;
  it('its entries are flows of their own kind, with their channels', () => {
    const r = compileSource(src);
    const into = (flows(r).to.get('synth') ?? []).map((f) => [f.kind, f.from, f.channel]);
    expect(into).toEqual([
      ['midi', 'reed', 1],
      ['midi', 'sub', 2],
      ['midi', 'groove', 10],
    ]);
  });

  it('what only a MIDI card reaches is routed, through the card; switched off, not', () => {
    const r = compileSource(src);
    const all = routing(r, new Set());
    for (const n of ['synth', 'sub', 'bass']) expect(all.nodes.has(cellId(n)), n).toBe(true);
    expect(all.edges.has(edgeId(cellId('sub'), cellId('synth')))).toBe(true);
    const off = routing(r, new Set([cellId('synth')]));
    for (const n of ['sub', 'bass']) expect(off.nodes.has(cellId(n)), n).toBe(false);
    expect(off.nodes.has(cellId('reed'))).toBe(true);
  });

  it('the graph draws the card as a node, its products as junctions into it, every wire a note bus', () => {
    const model = buildGraph(compileSource(src));
    expect(model.nodes.find((n) => n.id === cellId('synth'))?.kind).toBe('cell');
    const into = model.edges.filter((e) => e.to === cellId('synth'));
    expect(into.map((e) => [e.port, e.band, e.from]).sort()).toEqual([
      ['midi', 'cv', 'cell:groove'],
      ['midi', 'cv', 'junction:synth:0'],
      ['midi', 'cv', 'junction:synth:1'],
    ]);
    // (the melody into the product, its voice the product's definition, as in a mix)
    expect(model.edges.some((e) => e.from === cellId('bass') && e.to === 'junction:synth:1' && e.port === 'voice')).toBe(true);
  });
});

describe('a law on a MIDI card', () => {
  it('its computed notes go out on the card too', () => {
    const src = `&day scan(1!24) loop=1d anchor=11.55\n&cycle law=fiveto12 over=&day step=84bpm\n&flute s=tri loop=C4\n&out map=sample [&cycle * &flute]\n&synth map=midi(4) [&cycle * &flute]`;
    const events = eventsOf(src, 30);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.midi?.[0].channel === 4 && !e.unheard)).toBe(true);
  });
});
