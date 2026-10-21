// The instruments (#225, decision 054): the General MIDI kit, a voice for each of General MIDI's 47 percussion notes,
// each sounding on its own note over MIDI out; the core kit, 13 of its voices, the same lines; both fit any workbench, and
// every rhythm with the core kit plays each hit on the note it plays alone.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { channelTable, GM_KIT, gmDrumNote, midiNote, router, routesOf } from '../engine/midi';
import { windowAt } from '../engine/schedule';
import { fitOf } from './fit';
import { createRepository } from './fragments';
import { holesOf } from './holes';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { LIBRARY } from './library';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, FUNK } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

const byId = (id: string) => INSTRUMENT_FRAGMENTS.find((f) => f.id === id)!;
const gmKit = byId('gm kit');
const coreKit = byId('core kit');
const meterText = (id: string) => METER_FRAGMENTS.find((f) => f.id === id)!.text;
const BPM = 120;
const hosted = (...fragments: string[]) => [setTiming(meterText('4/4'), 'bar', 'step', `${BPM}bpm`), ...fragments].join('\n');

/** A text's lines as name → line, in the order written. */
const linesOf = (text: string) => new Map(text.split('\n').map((l) => [/^&(\w+)/.exec(l)![1]!, l]));

/** What a text sends on channel 10 in its first `steps` sixteenths: each hit's note, step and velocity, in time order. */
function played(text: string, steps: number): { hits: { note: number; step: number; velocity: number }[]; diagnostics: string[] } {
  const plan = planOf(text);
  const sixteenth = 60 / BPM / 4;
  const route = router(plan.result, channelTable(plan.result));
  const hits = windowAt(plan, 0, steps * sixteenth - 1e-9).events.flatMap((e) =>
    routesOf(route(e)).flatMap((r) => {
      const note = midiNote(e, r);
      return note && note.channel === 10 ? [{ note: note.note, step: Math.round((note.at / sixteenth) * 1e6) / 1e6, velocity: note.velocity }] : [];
    }),
  );
  return { hits: hits.sort((a, b) => a.step - b.step || a.note - b.note), diagnostics: plan.result.diagnostics.map((d) => d.message) };
}

/** A line striking each name in turn, a sixteenth apart, on channel 10: as many bars as it takes. */
const strikes = (names: readonly string[]) => {
  const bars = Math.ceil(names.length / 16);
  const steps = [...names.map((n) => `&${n}`), ...Array<string>(bars * 16 - names.length).fill('~')];
  return [`&all step=16n cycle=${bars} ${steps.join(' ')}`, '&drums map=midi(10) [&all]'].join('\n');
};

describe('General MIDI’s drum names (GM_KIT)', () => {
  const names = GM_KIT.flatMap((d) => [d.name, ...d.aliases]);

  it('name all 47 notes, 35–81, in order, each name and alias once and none ending in a digit', () => {
    expect(GM_KIT.map((d) => d.note)).toEqual(Array.from({ length: 47 }, (_, i) => 35 + i));
    expect(new Set(names).size).toBe(names.length);
    expect(names.filter((n) => !/^[a-z]+$/.test(n))).toEqual([]);
    for (const { note, name, aliases } of GM_KIT) for (const n of [name, ...aliases]) expect(gmDrumNote(n), n).toBe(note);
  });

  it('move no name’s note: the 26 names before the table keep theirs', () => {
    const before = {
      bd: 36,
      kick: 36,
      kd: 36,
      rim: 37,
      rs: 37,
      sd: 38,
      snare: 38,
      cp: 39,
      clap: 39,
      hh: 42,
      ch: 42,
      ph: 44,
      oh: 46,
      crash: 49,
      cr: 49,
      ride: 51,
      rd: 51,
      lt: 41,
      lo: 41,
      tom: 45,
      mt: 45,
      mid: 45,
      ht: 48,
      hi: 48,
      clave: 75,
      claves: 75,
    };
    expect(Object.entries(before).filter(([n, note]) => gmDrumNote(n) !== note)).toEqual([]);
  });

  it('each name and alias sounds on its own note over MIDI out, 75 of 75', () => {
    const voices = names.map((n) => `&${n} s=white`).join('\n');
    const { hits, diagnostics } = played(hosted(strikes(names), voices), 80);
    expect(diagnostics).toEqual([]);
    expect(hits.map((h) => h.step)).toEqual(names.map((_, i) => i));
    expect(hits.map((h) => h.note)).toEqual(names.map((n) => GM_KIT.find((d) => d.name === n || d.aliases.includes(n))!.note));
  });
});

describe('the instrument fragments', () => {
  it('are the General MIDI kit and the core kit, each once at the centre of style space as the facet instrument, the core kit weighted first', () => {
    expect(INSTRUMENT_FRAGMENTS.map((f) => f.id)).toEqual(['gm kit', 'core kit']);
    for (const f of INSTRUMENT_FRAGMENTS) expect(f.association.map((wp) => [wp.point, wp.facet])).toEqual([[{ sync: 0.5, harm: 0.5, artic: 0.5, energy: 0.5 }, 'instrument']]);
    expect(
      createRepository(LIBRARY)
        .query(AMBIENT, 2, {}, { facet: 'instrument' })
        .map((f) => f.fragment.id),
    ).toEqual(['core kit', 'gm kit']);
    expect(
      createRepository(LIBRARY)
        .query(FUNK, 2, {}, { facet: 'instrument' })
        .map((f) => f.fragment.id),
    ).toEqual(['core kit', 'gm kit']);
  });

  it('the General MIDI kit defines a voice under each kit name, in General MIDI’s order, and the core kit 13 of its lines word for word', () => {
    const gm = linesOf(gmKit.text);
    expect([...gm.keys()]).toEqual(GM_KIT.map((d) => d.name));
    const core = linesOf(coreKit.text);
    expect([...core.keys()]).toEqual(['bd', 'rim', 'sd', 'cp', 'lt', 'hh', 'ph', 'mt', 'oh', 'ht', 'cr', 'rd', 'claves']);
    for (const [name, line] of core) expect(line, name).toBe(gm.get(name));
  });

  it.each(INSTRUMENT_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s compiles with no diagnostic, uses no name, and every line is a voice', (_, text) => {
    const r = compileSource(text);
    expect(r.diagnostics).toEqual([]);
    expect(holesOf(text, compileSource).uses).toEqual([]);
    for (const name of linesOf(text).keys()) expect(r.cells.get(name)?.voice, name).toBeTruthy();
  });

  it.each(INSTRUMENT_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s fits any workbench: an empty one, a meter, a groove', (_, text) => {
    for (const bench of ['', hosted(), hosted(RHYTHM_FRAGMENTS[0]!.text)]) expect(fitOf(text, bench).fits, bench.slice(0, 40)).toBe(true);
  });

  it('the General MIDI kit sounds each of its 47 voices on its own note over MIDI out', () => {
    const { hits, diagnostics } = played(hosted(strikes(GM_KIT.map((d) => d.name)), gmKit.text), 48);
    expect(diagnostics).toEqual([]);
    expect(hits.map((h) => [h.step, h.note])).toEqual(GM_KIT.map((d, i) => [i, d.note]));
  });
});

describe('every rhythm with the core kit plays each hit on its General MIDI note (13 of 13)', () => {
  const { hits: synthPop } = played(hosted(RHYTHM_FRAGMENTS.find((f) => f.id === 'Synth-pop drums')!.text), 32);
  it('is shown firing: a hit on another note is caught', () => expect(synthPop.map((h) => ({ ...h, note: h.note + 1 }))).not.toEqual(synthPop));

  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s: the kit after the groove, and the groove after the kit', (_, text) => {
    const alone = played(hosted(text), 32);
    expect(alone.hits.length).toBeGreaterThan(0);
    const kitAfter = fitOf(coreKit.text, hosted(text));
    expect(kitAfter.fits).toBe(true);
    const grooveAfter = fitOf(text, hosted(coreKit.text));
    expect(grooveAfter.fits).toBe(true);
    for (const union of [kitAfter.union.text, grooveAfter.union.text]) {
      const { hits, diagnostics } = played(union, 32);
      expect(diagnostics).toEqual([]);
      expect(hits).toEqual(alone.hits);
    }
  });
});
