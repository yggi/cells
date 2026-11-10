// The instruments (#225, decision 054): the General MIDI kit, a voice for each of General MIDI's 47 percussion notes,
// each sounding on its own note over MIDI out, fitting any workbench; 13 of its voices taken by name (the retired core
// kit), with which every rhythm plays each hit on the note it plays alone.
import { newPoint } from '../engine/migrate/axes';
import { wordOf } from '../engine/renamed';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setTiming } from '../engine/edit';
import { planOf } from '../engine/host';
import { codeShifts } from '../engine/program';
import { pieceAudio } from '../engine/audioexport';
import { channelTable, GM_KIT, gmDrumNote, midiNote, router, routesOf } from '../engine/midi';
import { bodyOf, expand, signatureOf } from '../engine/use';
import { readFrom } from '../engine/parser/use';
import { windowAt } from '../engine/schedule';
import { fitsAs } from './fit';
import type { Resolve } from '../engine/program';
import { createRepository, type StylePoint } from './fragments';
import { holesOf } from './holes';
import { LIBRARY, resolveSeed, RETIRED } from './library';
import { AMBIENT, BOSSA_NOVA, DEEP_HOUSE, ELECTRO_SWING, FUNK, KINDERLIED, LO_FI, SPOOKY, stylePoint, SWING_JAZZ, SYNTH_POP, TECHNO } from './styles';
import { seedFragments } from './seed';

const METER_FRAGMENTS = seedFragments('meters');
const RHYTHM_FRAGMENTS = seedFragments('rhythms');
const INSTRUMENT_FRAGMENTS = seedFragments('instruments');

/** A fragment's text taken onto a workbench by its signature (`fitsAs`, decisions 065 and 075), as the fragment `x`, and written out (#588). */
const takenOn = (text: string, bench: string, main?: string) => {
  const resolve: Resolve = (id) => (id === 'x' ? text : resolveSeed(id));
  const fit = fitsAs('x', bench, { resolve, ...(main ? { main } : {}) });
  return { ...fit, union: { text: expand(fit.text, resolve) } };
};

const byId = (id: string) => INSTRUMENT_FRAGMENTS.find((f) => f.id === id)!;
const gmKit = byId('gm_kit');
// (the centre on the old axes, moved by decision 076's rule: bite the mean, mood the mode found there, #572)
const CENTRE = newPoint({ sync: 0.5, harm: 0.5, artic: 0.5, energy: 0.5 });
/** The default instruments, the performers' (#278). */
const DEFAULTS = ['bass', 'keys', 'pad', 'lead'];
/** The instruments with a sound, for the two presets (#350), each at its preset's point, and the default whose voice it defines. */
const AT_PRESET: Record<string, StylePoint> = {
  upright_bass: ELECTRO_SWING,
  brass_stab: ELECTRO_SWING,
  clarinet: ELECTRO_SWING,
  muted_trumpet: ELECTRO_SWING,
  round_bass: SPOOKY,
  organ: SPOOKY,
  theremin: SPOOKY,
  celesta: SPOOKY,
  // (0.05 below Spooky in energy on the old axes, 0.05 below it in bite now, its energy offset (#572): at its point it
  // would tie with the organ, and take &padV from it by id)
  haunted_pad: { ...SPOOKY, bite: SPOOKY.bite! - 0.05 },
  // (Kinderlied's, and the three read from the examples for their styles, #572)
  sine_bass: KINDERLIED,
  recorder: KINDERLIED,
  tb303: stylePoint('acid'),
  rave_lead: stylePoint('happyHardcore'),
  square_bass: stylePoint('elektro'),
  prepared_piano: stylePoint('darkAmbient'),
  drone_pad: stylePoint('darkAmbient'),
};
/** The 13 voices a groove needs, taken from the General MIDI kit by name, as the drummer takes them. */
const CORE_USE = '&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit';
const coreKit = { text: expand(CORE_USE, resolveSeed).trim() };
const meterText = (id: string) => METER_FRAGMENTS.find((f) => f.id === id || f.id === wordOf(id))!.text;
const BPM = 120;
/** A fragment's lines, its `from` lines aside: a rhythm's signature and the kit it takes (decision 075, #637), which the host's kit fills. */
const linesAlone = (text: string) =>
  text
    .split('\n')
    .filter((l) => readFrom(l.trim()) === undefined)
    .join('\n');

const hosted = (...fragments: string[]) => [setTiming(meterText('meter'), 'bar', 'step', `${BPM}bpm`), ...fragments.map(linesAlone)].join('\n');

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

  it('each name and alias, written with its note=, sounds on it over MIDI out, 75 of 75; alone, a name gives none (decision 075)', () => {
    const gm = (n: string) => GM_KIT.find((d) => d.name === n || d.aliases.includes(n))!.note;
    // (named so and writing no note=, each is told what to write, and takes the next free note)
    expect(played(hosted(strikes(names), names.map((n) => `&${n} s=white`).join('\n')), 80).diagnostics).toHaveLength(names.length);
    const voices = names.map((n) => `&${n} note=${gm(n)} s=white`).join('\n');
    const { hits, diagnostics } = played(hosted(strikes(names), voices), 80);
    expect(diagnostics).toEqual([]);
    expect(hits.map((h) => h.step)).toEqual(names.map((_, i) => i));
    expect(hits.map((h) => h.note)).toEqual(names.map((n) => GM_KIT.find((d) => d.name === n || d.aliases.includes(n))!.note));
  });
});

describe('the instrument fragments', () => {
  it("are the General MIDI kit and the four default instruments, each once at the centre of style space, the kit weighted first; then the nine for Electro swing and Spooky and the five for Kinderlied, Acid, Happy hardcore and Elektro (#572), each once at or near its style, at half a default's weight (#350)", () => {
    expect(INSTRUMENT_FRAGMENTS.map((f) => f.id)).toEqual(['gm_kit', ...DEFAULTS, ...Object.keys(AT_PRESET)]);
    for (const f of INSTRUMENT_FRAGMENTS)
      expect(
        f.association.map((wp) => [wp.point, wp.facet]),
        f.id,
      ).toEqual([[AT_PRESET[f.id] ?? CENTRE, 'instrument']]);
    expect(INSTRUMENT_FRAGMENTS.map((f) => f.association[0]!.weight)).toEqual([1, 0.25, 0.25, 0.25, 0.25, ...Array<number>(11).fill(0.125), 0.0625, 0.125, 0.125, 0.125, 0.125]);
  });

  it('a query finds the kit and the defaults first at the eight presets, and at Electro swing and Spooky their own (#350)', () => {
    const found = (point: StylePoint, k: number) =>
      createRepository(LIBRARY)
        .query(point, k, {}, { facet: 'instrument' })
        .map((f) => f.fragment.id);
    for (const preset of [SYNTH_POP, TECHNO, DEEP_HOUSE, AMBIENT, LO_FI, FUNK, BOSSA_NOVA, SWING_JAZZ]) expect(found(preset, 3)).toEqual(['gm_kit', 'bass', 'keys']);
    expect(found(ELECTRO_SWING, 4)).toEqual(['brass_stab', 'clarinet', 'muted_trumpet', 'upright_bass']);
    expect(found(SPOOKY, 4)).toEqual(['celesta', 'organ', 'round_bass', 'theremin']);
    expect(found(AT_PRESET.haunted_pad!, 1)).toEqual(['haunted_pad']);
    // (and Kinderlied and the three read from the examples their own, #572)
    expect(found(KINDERLIED, 2)).toEqual(['recorder', 'sine_bass']);
    expect(found(stylePoint('acid'), 1)).toEqual(['tb303']);
    expect(found(stylePoint('happyHardcore'), 1)).toEqual(['rave_lead']);
    expect(found(stylePoint('elektro'), 1)).toEqual(['square_bass']);
  });

  it('the General MIDI kit defines a voice under each kit name, in General MIDI’s order; 13 of them taken by name are its lines word for word, as the retired core kit forwards them (#196)', () => {
    const gm = linesOf(gmKit.text);
    expect([...gm.keys()]).toEqual(GM_KIT.map((d) => d.name));
    expect(RETIRED.get('core kit')).toBe(CORE_USE);
    const core = linesOf(coreKit.text);
    expect([...core.keys()]).toEqual(['bd', 'rim', 'sd', 'cp', 'lt', 'hh', 'ph', 'mt', 'oh', 'ht', 'cr', 'rd', 'claves']);
    for (const [name, line] of core) expect(line, name).toBe(gm.get(name));
  });

  it.each(INSTRUMENT_FRAGMENTS.map((f) => [f.id, f.text] as const))(
    '%s compiles with no diagnostic, uses no name, and every line is a voice, but a parameter’s default',
    (_, text) => {
      const r = compileSource(text);
      expect(r.diagnostics).toEqual([]);
      expect(holesOf(text, compileSource).uses).toEqual([]);
      // (an instrument that reads the section's style declares it, its default the centre: #560 rung 3c–e)
      const declared = new Set(signatureOf(text)?.optional.map((n) => n.slice(1)) ?? []);
      for (const name of linesOf(text).keys()) if (!declared.has(name)) expect(r.cells.get(name)?.voice, name).toBeTruthy();
    },
  );

  it.each(INSTRUMENT_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s fits any workbench: an empty one, a meter, a groove', (_, text) => {
    for (const bench of ['', hosted(), hosted(RHYTHM_FRAGMENTS[0]!.text)]) expect(takenOn(text, bench).fits, bench.slice(0, 40)).toBe(true);
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
  const { hits: synthPop } = played(hosted(RHYTHM_FRAGMENTS.find((f) => f.id === 'synth_pop_drums')!.text, coreKit.text), 32);
  it('is shown firing: a hit on another note is caught', () => expect(synthPop.map((h) => ({ ...h, note: h.note + 1 }))).not.toEqual(synthPop));

  it.each(RHYTHM_FRAGMENTS.map((f) => [f.id, f.text] as const))('%s: the kit after the groove, and the groove after the kit', (_, text) => {
    // (a rhythm has no voice of its own: it plays through a kit, the kit's lines written out after it)
    const alone = played(hosted(text, coreKit.text), 32);
    expect(alone.hits.length).toBeGreaterThan(0);
    const kitAfter = takenOn(coreKit.text, hosted(text));
    expect(kitAfter.fits).toBe(true);
    // (and no sound hole is left on it, as the kit's voices fill every one)
    expect(takenOn(text, hosted(coreKit.text)).sounds).toEqual([]);
    const grooveAfter = takenOn(text, hosted(coreKit.text));
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
  it('each define one voice at its register, with a sound of its own (#391), use nothing and compile clean', () => {
    expect(['bass', 'keys', 'pad', 'lead'].map((id) => /^&\w+ s=(\S+)(?: \* \S+)? loop=(\w+)/.exec(bodyOf(byId(id).text))!.slice(1))).toEqual([
      ['saw', 'C2'],
      ['tri', 'C3'],
      ['tri', 'C3'],
      // (from a soft triangle to a bright square as the articulation rises: #411)
      ['tri..square', 'C4'],
    ]);
    // (its voice, and the style it reads, declared: `&bassV from (&style)`, its default the centre)
    for (const id of ['bass', 'keys', 'pad', 'lead'])
      expect(byId(id).text.split('\n'), id).toEqual([
        expect.stringMatching(/^&\w+V from \(&style\)$/),
        expect.stringMatching(/^&\w+V s=/),
        '&style map=style sync=.5 harm=.5 bite=.5 mood=.5',
      ]);
    for (const id of ['bass', 'keys', 'pad', 'lead']) expect(compileSource(byId(id).text).diagnostics, id).toEqual([]);
  });

  it.each(['bass', 'keys', 'pad', 'lead'])('%s is heard in the renderer’s first stage, with no parameter left dry (decision 062, R1)', (id) => {
    const voice = /^&(\w+)/.exec(byId(id).text)![1]!;
    const r = compileSource(hosted('&part step=4n 0 2 4 7', byId(id).text, `&out map=sample [&part * &${voice}]`));
    expect(r.diagnostics).toEqual([]);
    const audio = pieceAudio(r, codeShifts(r), { seconds: 2 });
    expect(audio.diagnostics).toEqual([]);
    expect(audio.loudness.rms).toBeGreaterThan(-60);
    expect(audio.loudness.clipped).toBe(0);
  });

  it('each sounds a part played on it, at its register', () => {
    for (const [id, voice, note] of [
      ['keys', 'keysV', 48],
      ['pad', 'padV', 48],
      ['lead', 'leadV', 60],
    ] as const) {
      // (sent on a MIDI card and heard on a sound card: a sound of its own isn't sent, decision 064)
      const plan = planOf(hosted('&part step=4n 0 ~ ~ ~', byId(id).text, `&out map=midi(1) [&part * &${voice}]`, `&hear map=sample [&part * &${voice}]`));
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
