// The instruments (#225, decision 054): the General MIDI kit, a voice for each of General MIDI's 47 percussion notes,
// each sounding on its own note over MIDI out, fitting any workbench; 13 of its voices taken by name (the retired core
// kit), with which every rhythm plays each hit on the note it plays alone.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { codeShifts } from '../engine/program';
import { pieceAudio } from '../engine/audioexport';
import { channelTable, GM_KIT, gmDrumNote, midiNote, router, routesOf } from '../engine/midi';
import { expand } from '../engine/use';
import { windowAt } from '../engine/schedule';
import { fitOf } from './fit';
import { createRepository, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { INSTRUMENT_FRAGMENTS } from './instruments';
import { LIBRARY, resolveSeed, RETIRED } from './library';
import { METER_FRAGMENTS } from './meters';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, LO_FI, SPOOKY, SWING_JAZZ, SYNTH_POP, TECHNO } from './presets';
import { RHYTHM_FRAGMENTS } from './rhythms';

const byId = (id: string) => INSTRUMENT_FRAGMENTS.find((f) => f.id === id)!;
const gmKit = byId('gm_kit');
const CENTRE = { sync: 0.5, harm: 0.5, artic: 0.5, energy: 0.5 };
/** The default instruments, the performers' (#278). */
const DEFAULTS = ['bass', 'keys', 'pad', 'lead'];
/** The instruments with a sound, for the two presets (#350), each at its preset's point, and the default whose voice it defines. */
const AT_PRESET: Record<string, StylePoint> = {
  'upright bass': ELECTRO_SWING,
  'brass stab': ELECTRO_SWING,
  clarinet: ELECTRO_SWING,
  'muted trumpet': ELECTRO_SWING,
  'round bass': SPOOKY,
  organ: SPOOKY,
  theremin: SPOOKY,
  celesta: SPOOKY,
  // (0.05 below Spooky in energy: at its point it would tie with the organ, and take &padV from it by id)
  'haunted pad': { ...SPOOKY, energy: 0.3 },
};
/** The 13 voices a groove needs, taken from the General MIDI kit by name, as the drummer takes them. */
const CORE_USE = 'use &bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit';
const coreKit = { text: expand(CORE_USE, resolveSeed).trim() };
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
  it("are the General MIDI kit and the four default instruments, each once at the centre of style space, the kit weighted first; then the nine for Electro swing and Spooky, each once at or near its preset, at half a default's weight (#350)", () => {
    expect(INSTRUMENT_FRAGMENTS.map((f) => f.id)).toEqual(['gm_kit', ...DEFAULTS, ...Object.keys(AT_PRESET)]);
    for (const f of INSTRUMENT_FRAGMENTS)
      expect(
        f.association.map((wp) => [wp.point, wp.facet]),
        f.id,
      ).toEqual([[AT_PRESET[f.id] ?? CENTRE, 'instrument']]);
    expect(INSTRUMENT_FRAGMENTS.map((f) => f.association[0]!.weight)).toEqual([1, 0.25, 0.25, 0.25, 0.25, ...Array<number>(9).fill(0.125)]);
  });

  it('a query finds the kit and the defaults first at the eight presets, and at Electro swing and Spooky their own (#350)', () => {
    const found = (point: StylePoint, k: number) =>
      createRepository(LIBRARY)
        .query(point, k, {}, { facet: 'instrument' })
        .map((f) => f.fragment.id);
    for (const preset of [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ]) expect(found(preset, 3)).toEqual(['gm_kit', 'bass', 'keys']);
    expect(found(ELECTRO_SWING, 4)).toEqual(['brass stab', 'clarinet', 'muted trumpet', 'upright bass']);
    expect(found(SPOOKY, 4)).toEqual(['celesta', 'organ', 'round bass', 'theremin']);
    expect(found({ ...SPOOKY, energy: 0.3 }, 1)).toEqual(['haunted pad']);
  });

  it('the General MIDI kit defines a voice under each kit name, in General MIDI’s order; 13 of them taken by name are its lines word for word, as the retired core kit forwards them (#196)', () => {
    const gm = linesOf(gmKit.text);
    expect([...gm.keys()]).toEqual(GM_KIT.map((d) => d.name));
    expect(RETIRED.get('core kit')).toBe(CORE_USE);
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

describe('the instruments for Electro swing and Spooky (#350)', () => {
  const voiceOf = (text: string) => /^&(\w+)/.exec(text)![1]!;
  const defaultFor = (voice: string) => INSTRUMENT_FRAGMENTS.find((f) => DEFAULTS.includes(f.id) && voiceOf(f.text) === voice)!;
  /** A line of the key's degrees played by a gate on the voice, on a MIDI card and a sound card: each note it sends over two bars, and the piece. */
  const piece = (instrument: string) =>
    hosted('&key scale(minor, D)', '&line over=&key step=4n 0 2 4 7 -3 ~ 1 6', `&g play=&line &${voiceOf(instrument)}`, '&m map=midi(1) &g', '&out map=sample &g', instrument);
  /** What a note is over MIDI but its bends: a vibrato (`pitch=`) is the instrument's, and goes out as bends. */
  const note = ({ channel, note, velocity, at, end }: { channel: number; note: number; velocity: number; at: number; end: number }) => ({ channel, note, velocity, at, end });
  const sent = (text: string) => {
    const plan = planOf(text);
    const route = router(plan.result, channelTable(plan.result));
    return windowAt(plan, 0, 4 - 1e-9).events.flatMap((e) => routesOf(route(e)).flatMap((r) => midiNote(e, r) ?? []));
  };

  it.each(Object.keys(AT_PRESET))('%s defines one voice a default instrument defines, with a sound of its own (s=)', (id) => {
    const lines = byId(id).text.split('\n');
    expect(lines).toHaveLength(1);
    expect(defaultFor(voiceOf(lines[0]!)), voiceOf(lines[0]!)).toBeTruthy();
    expect(lines[0]).toMatch(/ s=(sine|tri|saw|square)\b/);
  });

  it.each(Object.keys(AT_PRESET))('%s sends over MIDI the notes the default it stands in for sends: channel, note, velocity, onset and end (a vibrato adds bends)', (id) => {
    const instrument = byId(id).text;
    const played = sent(piece(instrument));
    expect(played).toHaveLength(7);
    expect(played.map(note)).toEqual(sent(piece(defaultFor(voiceOf(instrument)).text)).map(note));
  });

  it('is shown firing: an instrument an octave off sends other notes', () => {
    const clarinet = byId('clarinet').text;
    expect(sent(piece(clarinet.replace('loop=C4', 'loop=C5'))).map(note)).not.toEqual(sent(piece(clarinet)).map(note));
  });

  it.each(Object.keys(AT_PRESET))('%s is heard in the renderer’s first stage, with no parameter left dry (decision 062, R1)', (id) => {
    const r = compileSource(piece(byId(id).text));
    expect(r.diagnostics).toEqual([]);
    const audio = pieceAudio(r, codeShifts(r));
    expect(audio.diagnostics).toEqual([]);
    expect(audio.loudness.rms).toBeGreaterThan(-60);
    expect(audio.loudness.clipped).toBe(0);
  });
});

describe('every rhythm with 13 of the General MIDI kit’s voices plays each hit on its General MIDI note (13 of 13)', () => {
  const { hits: synthPop } = played(hosted(RHYTHM_FRAGMENTS.find((f) => f.id === 'Synth-pop drums')!.text, coreKit.text), 32);
  it('is shown firing: a hit on another note is caught', () => expect(synthPop.map((h) => ({ ...h, note: h.note + 1 }))).not.toEqual(synthPop));

  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s: the kit after the groove, and the groove after the kit', (_, text) => {
    // (a rhythm has no voice of its own: it plays through a kit, the kit's lines written out after it)
    const alone = played(hosted(text, coreKit.text), 32);
    expect(alone.hits.length).toBeGreaterThan(0);
    const kitAfter = fitOf(coreKit.text, hosted(text));
    expect(kitAfter.fits).toBe(true);
    // (and no sound hole is left on it, as the kit's voices fill every one)
    expect(fitOf(text, hosted(coreKit.text)).sounds).toEqual([]);
    const grooveAfter = fitOf(text, hosted(coreKit.text));
    expect(grooveAfter.fits).toBe(true);
    for (const union of [kitAfter.union.text, grooveAfter.union.text]) {
      const { hits, diagnostics } = played(union, 32);
      expect(diagnostics).toEqual([]);
      expect(hits).toEqual(alone.hits);
    }
  });
});

// The melodic instruments (#278, decision 058): one voice each, holding the register Jambot's section text sounds that
// part at (yggi/jambot packages/score/src/section-text.ts @ 24a528b: PIN_VOICES, the comp at C3, the lead at C4).
describe('the keys, the pad and the lead', () => {
  it('each define one voice at its register, use nothing and compile clean', () => {
    expect(['keys', 'pad', 'lead'].map((id) => byId(id).text)).toEqual(['&keysV loop=C3', '&padV loop=C3', '&leadV loop=C4']);
    for (const id of ['keys', 'pad', 'lead']) expect(compileSource(byId(id).text).diagnostics).toEqual([]);
  });

  it('each sounds a part played on it, at its register', () => {
    for (const [id, voice, note] of [
      ['keys', 'keysV', 48],
      ['pad', 'padV', 48],
      ['lead', 'leadV', 60],
    ] as const) {
      const plan = planOf(hosted('&part step=4n 0 ~ ~ ~', byId(id).text, `&out map=midi(1) [&part * &${voice}]`));
      const route = router(plan.result, channelTable(plan.result));
      const notes = windowAt(plan, 0, 2 - 1e-9).events.flatMap((e) => routesOf(route(e)).flatMap((r) => [midiNote(e, r)?.note]));
      expect(
        plan.result.diagnostics.map((d) => d.message),
        id,
      ).toEqual([]);
      expect(notes, id).toEqual([note]);
    }
  });
});
