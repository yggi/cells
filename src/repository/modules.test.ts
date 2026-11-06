// The modules (decision 067 §3, #457): a modular's, each a fragment whose optional parameters are its jacks, each one's
// line its default (the knob), its main parameter the audio it takes in, its head what it gives out.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { eventsBetween, plan } from '../engine/realize';
import { PRESETS } from '../engine/presets';
import { MODULE_FRAGMENTS } from './modules';
import { resolveSeed } from './library';

const lines = (...xs: string[]) => xs.join('\n');
const compiled = (text: string) => compileSource(text, undefined, { resolve: resolveSeed });
const messages = (text: string) => compiled(text).diagnostics.map((d) => `${d.severity}: ${d.message}`);
/** What plays in the first seconds, as it sounds: onset, length, pitch, gains, levels, the voice's and its instruments' moving parameters. */
const sounded = (text: string, seconds = 8) => {
  const r = compiled(text);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds).map((e) =>
    JSON.stringify([
      e.at,
      e.dur,
      e.voice,
      e.freq,
      e.gains,
      e.levels,
      e.env ?? null,
      e.bends,
      { ...e.params, ...Object.assign({}, ...(e.through ?? []).map((x) => x.params ?? {})) },
    ]),
  );
};
const BASE = lines('&bar from meter &tempo', '&tempo step=120bpm', '&tune step=8n 0 3 7 10 12 10 7 3');

describe('the modules', () => {
  it('are eight, of the facet module, each a signature', () => {
    expect(MODULE_FRAGMENTS.map((f) => f.id)).toEqual(['osc', 'lowpass', 'highpass', 'amp', 'lfo', 'sh', 'bandpass', 'lowpass24']);
    for (const f of MODULE_FRAGMENTS) {
      expect(f.association.map((wp) => wp.facet)).toEqual(['module']);
      expect(f.text, f.id).toMatch(new RegExp(`^&${f.id} from\\b`, 'm'));
    }
  });

  it('each plays in a patch with no diagnostic, its jacks at their knobs', () => {
    const patch = lines(
      BASE,
      '&wob from lfo',
      '&rnd from sh',
      '&o from osc',
      '&lp from lowpass &o',
      '&hp from highpass &lp',
      '&a from amp &hp',
      '&o2 s=square loop=C2 from osc(pitch=&wob)',
      '&lp2 from lowpass(cutoff=&wob, res=&rnd, eg=&(map=adsr .002 .2 .1 .1)) [&o2]',
      '&out map=sample [&tune * &a * .3, &tune * &lp2 * .3]',
    );
    expect(messages(patch)).toEqual([]);
    const notes = eventsBetween(plan(compiled(patch), codeShifts(compiled(patch))), 0, 1);
    // (the first patch through its two filters, the innermost first: an amp writes no sound parameter, so it is no stage,
    // its envelope a note's own; the second through its filter alone)
    expect(notes.find((n) => n.voice === 'o')!.through?.map((x) => x.instrument)).toEqual(['lp', 'hp']);
    expect(notes.find((n) => n.voice === 'o')!.env).toEqual({ attack: 0.005, decay: 0.2, sustain: 0.7, release: 0.1 });
    expect(notes.find((n) => n.voice === 'o2')!.through?.map((x) => x.instrument)).toEqual(['lp2']);
  });

  it('an LFO stays between 0 and 1, and a sample and hold draws a value each eighth', () => {
    const text = lines(BASE, '&wob loop=&bar/3 from lfo', '&rnd from sh', '&v s=saw loop=C2 lpq=0..100 * &wob hpq=0..100 * &rnd', '&out map=sample [&tune * &v]');
    const notes = eventsBetween(plan(compiled(text), codeShifts(compiled(text))), 0, 4);
    const values = (k: 'lpq' | 'hpq') => notes.flatMap((n) => (n.params?.[k]?.kind === 'points' ? n.params[k].points.map((p) => p.value) : []));
    for (const v of [...values('lpq'), ...values('hpq')]) expect(v >= 0 && v <= 100).toBe(true);
    expect(new Set(values('lpq')).size).toBeGreaterThan(4);
    expect(new Set(values('hpq').map((v) => Math.round(v))).size).toBeGreaterThan(2);
  });
});

describe('Patchbay, the reference piece', () => {
  // the patch written flat, each module's lines written out: the note's first cells block
  const note = readFileSync(resolve(import.meta.dirname, '../../docs/notes/modular.md'), 'utf8');
  const flat = /```cells\n([\s\S]*?)```/.exec(note)![1]!;

  it('compiles with no diagnostic, and plays what the flat text plays', () => {
    const piece = PRESETS.patchbay.source;
    expect(messages(piece)).toEqual([]);
    expect(messages(flat)).toEqual([]);
    expect(sounded(piece)).toEqual(sounded(flat));
  });
});
