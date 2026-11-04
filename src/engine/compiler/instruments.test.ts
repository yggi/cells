// An instrument's sound parameters (decision 067, #423): a mix used like a voice is a module after its voices, and its
// linear parameters are each voice's, so a filter after a mix plays what the filter written on each voice plays.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';
import { writtenGraph } from '../graph';
import { pieceAudio } from '../audioexport';

const lines = (...xs: string[]) => xs.join('\n');
const BASE = lines('&bar meter("4/4") step=120bpm', '&tune step=8n 0 3 7 10 12 10 7 3', '&eg map=adsr .002 .2 .1 .1', '&lfo loop=&bar/2 sin(12)');
const FILTER = 'lpf=70..4800 * &eg * &lfo lpq=8 delay=.3 delaytime=&bar*3/16';
/** The patch written flat: the filter and the echo on each oscillator. */
const FLAT = lines(BASE, `&saw s=saw loop=C2 ${FILTER}`, `&sub s=square loop=C1 ${FILTER}`, '&out map=sample [&tune * &saw * .4, &tune * &sub * .2]');
/** The same, a filter after the mix. */
const PATCH = lines(BASE, '&saw s=saw loop=C2', '&sub s=square loop=C1', `&vcf ${FILTER} [&saw, &sub * .5]`, '&out map=sample [&tune * &vcf * .4]');

const compiled = (text: string) => compileSource(text);
const messages = (text: string) => compiled(text).diagnostics.map((d) => `${d.severity}: ${d.message}`);
/** What plays in the first four seconds, as it sounds: onset, length, voice, pitch, gains, levels, moving parameters. */
const sounded = (text: string) => {
  const r = compiled(text);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, 4).map((e) => JSON.stringify([e.at, e.dur, e.voice, e.freq, e.gains, e.levels, e.params ?? null]));
};
/** What each voice sounds with: its fixed parameters and the clocks of its timed ones. */
const voice = (text: string, name: string) => {
  const c = compiled(text).cells.get(name)!;
  return { params: c.params, clocks: c.paramClocks, moving: Object.keys(c.paramCells) };
};

describe("an instrument's sound parameters are its voices' (decision 067)", () => {
  it('a filter after a mix plays what the filter on each voice plays', () => {
    expect(messages(PATCH)).toEqual([]);
    expect(sounded(PATCH)).toEqual(sounded(FLAT));
    for (const v of ['saw', 'sub']) expect(voice(PATCH, v)).toEqual(voice(FLAT, v));
  });

  it('renders sample for sample as the flat text', () => {
    const audio = (text: string) => {
      const r = compiled(text);
      return pieceAudio(r, codeShifts(r), { seconds: 1 });
    };
    const [flat, patch] = [audio(FLAT), audio(PATCH)];
    expect(patch.diagnostics.filter((d) => d.param.startsWith('l'))).toEqual([]);
    for (const c of [0, 1]) expect(patch.mix[c]).toEqual(flat.mix[c]);
  });

  it('nests: a VCA after a VCF after a mix', () => {
    const nested = lines(PATCH.replace('&out map=sample [&tune * &vcf * .4]', ''), '&amp [&(map=adsr .01 .1 .6 .1) * &vcf]', '&out map=sample [&tune * &amp * .4]');
    expect(messages(nested)).toEqual([]);
    expect(eventsBetween(plan(compiled(nested), codeShifts(compiled(nested))), 0, 4).map((e) => JSON.stringify(e.params))).toEqual(
      eventsBetween(plan(compiled(FLAT), codeShifts(compiled(FLAT))), 0, 4).map((e) => JSON.stringify(e.params)),
    );
  });

  it('a filter on an instrument whose line carries fixed sound parameters too is played, not dropped (#424)', () => {
    const text = lines(BASE, '&saw s=saw loop=C2', '&vcf delay=.3 lpf=70..4800 * &eg lpq=8 [&saw]', '&out map=sample [&tune * &vcf * .4]');
    expect(messages(text)).toEqual([]);
    const notes = eventsBetween(plan(compiled(text), codeShifts(compiled(text))), 0, 1);
    expect(notes.length).toBeGreaterThan(0);
    for (const n of notes) expect(Object.keys(n.params ?? {})).toContain('lpf');
    expect(voice(text, 'saw').params).toEqual({ s: 'saw', delay: 0.3, lpq: 8 });
  });

  it('reaches a kit read through it, a gate playing it and the built-in card', () => {
    const kit = lines(
      BASE,
      '&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .1)',
      '&hh s=white env=&(map=adsr 0 .04 0 .02)',
      '&kit &bd &hh',
      '&beat over=&kit step=8n 0 1',
      '&bus hpf=300 [&beat * .5]',
      '&out map=sample [&bus]',
    );
    expect(messages(kit).filter((m) => !m.includes('&tune') && !m.includes('&eg') && !m.includes('&lfo'))).toEqual([]);
    expect([voice(kit, 'bd').params.hpf, voice(kit, 'hh').params.hpf]).toEqual([300, 300]);
    const gate = lines(BASE, '&saw s=saw loop=C2', '&vcf lpf=900 [&saw]', '&p play=&tune level=.4 &vcf');
    expect(voice(gate, 'saw').params.lpf).toBe(900);
    const builtin = lines('&saw s=saw loop=C2', '&vcf lpf=900 [&saw]');
    expect(messages(builtin)).toEqual([]);
    expect(voice(builtin, 'saw').params.lpf).toBe(900);
  });

  it('the graph draws an instrument’s parameter wires into the instrument, where they are written', () => {
    const g = writtenGraph(compiled(PATCH));
    const into = (port: string) => g.edges.filter((e) => e.port === port).map((e) => e.to);
    expect(into('lpf').every((t) => t === 'cell:vcf')).toBe(true);
    expect(into('lpf').length).toBeGreaterThan(0);
  });
});

describe('what an instrument’s own chain would sound is said, not yet rendered (#432)', () => {
  it('a parameter on both the voice and its instrument: in series, the voice’s own plays', () => {
    const text = lines(BASE, '&saw s=saw loop=C2 lpf=3000', '&vcf lpf=800 [&saw]', '&out map=sample [&tune * &vcf * .4]');
    expect(messages(text)).toEqual([
      "warning: &saw sets lpf= and plays through &vcf, which sets it too: the two in series aren't rendered yet (decision 067), so &saw's own plays",
    ]);
    expect(voice(text, 'saw').params.lpf).toBe(3000);
  });

  it('two instruments one after the other setting one parameter: the inner plays', () => {
    const text = lines(BASE, '&saw s=saw loop=C2', '&vcf lpf=800 [&saw]', '&dark lpf=300 [&vcf]', '&out map=sample [&tune * &dark * .4]');
    expect(messages(text)).toEqual(["warning: &dark and &vcf both set lpf=, one after the other: the two in series aren't rendered yet (decision 067), so &vcf's plays"]);
    expect(voice(text, 'saw').params.lpf).toBe(800);
  });

  it('grit on an instrument acts on the sum: said, and played without it', () => {
    const text = lines(BASE, '&saw s=saw loop=C2', '&vcf distort=.5 lpf=900 [&saw]', '&out map=sample [&tune * &vcf * .4]');
    expect(messages(text)).toEqual([
      'warning: distort= on the instrument &vcf acts on what its voices play together, in a chain of its own: not rendered yet (decision 067), so it plays without it',
    ]);
    expect(voice(text, 'saw').params).toEqual({ s: 'saw', lpf: 900 });
  });

  it('a voice played through the instrument and without it: said, and played as written', () => {
    const text = lines(BASE, '&saw s=saw loop=C2', '&vcf lpf=900 [&saw]', '&out map=sample [&tune * &vcf * .4, &tune * &saw * .1]');
    expect(messages(text)).toEqual([
      "warning: &saw plays through &vcf and elsewhere without it: a voice has one chain until an instrument has its own (decision 067), so its sound parameters aren't rendered on &saw",
    ]);
    expect(voice(text, 'saw').params).toEqual({ s: 'saw' });
  });

  it('what isn’t a processor is a voice’s: an error on an instrument', () => {
    const text = lines(BASE, '&saw s=saw loop=C2', '&vcf crush=8 s=tri [&saw]', '&out map=sample [&tune * &vcf * .4]');
    expect(messages(text)).toContain("error: s= is a voice's: an instrument (&vcf) processes what its voices play, with lpf= lpq= hpf= hpq= …; put s= on a voice");
  });
});
