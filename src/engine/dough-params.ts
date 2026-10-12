import { PARAMS } from './attributes';

/**
 * The parameters voices and physical cells understand, with what each means (from the table in
 * attributes.ts). Written as attributes: `&lead s=saw lpf=1800 room=.3` (its envelope is a cell:
 * map=adsr). The sound parameters keep dough's names (https://dough.strudel.cc, as in dough.c /
 * Strudel); the physical cells' are ours.
 */
export const DOUGH_PARAMS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(PARAMS).map(([k, a]) => [k, a.help]));

/** Strudel's and dough's other names for the same parameters (`cutoff` is Strudel's, `verb` dough's own): not read here (#143); writing one is an error that names ours. */
export const DOUGH_ALIASES: Readonly<Record<string, string>> = {
  sound: 's',
  cutoff: 'lpf',
  resonance: 'lpq',
  hcutoff: 'hpf',
  hresonance: 'hpq',
  verb: 'room',
  reverb: 'room',
  delayt: 'delaytime',
  delayfb: 'delayfeedback',
};

export const DOUGH_SOURCES: Readonly<Record<string, 'sine' | 'triangle' | 'sawtooth' | 'square' | 'white' | 'pink' | 'brown'>> = {
  sine: 'sine',
  tri: 'triangle',
  triangle: 'triangle',
  saw: 'sawtooth',
  sawtooth: 'sawtooth',
  square: 'square',
  pulse: 'square',
  white: 'white',
  pink: 'pink',
  brown: 'brown',
};

/** Parameters that are gone, and what says the same thing now. */
const ENVELOPE = (k: string) =>
  `${k}= is gone: an envelope is a cell — in the mix, &theme * &(map=adsr .01 .3 .5 .4) * &lead, or an instrument, &lead [&(map=adsr .01 .3 .5 .4) * &saw]`;
const PITCH_DROP = (k: string) => `${k}= is gone: a pitch drop is a pitch shape, an envelope in semitones — penv=30 pdec=.04 is pitch=0..30 * &(map=adsr 0 .04 0 0)`;
export const RETIRED_PARAMS: Readonly<Record<string, string>> = {
  attack: ENVELOPE('attack'),
  decay: ENVELOPE('decay'),
  sustain: ENVELOPE('sustain'),
  release: ENVELOPE('release'),
  gain: 'gain= is gone: set the level in the mix, &theme * &lead * 0.8, or on a gate (play=&theme level=.8 &lead)',
  penv: PITCH_DROP('penv'),
  pdec: PITCH_DROP('pdec'),
  ...Object.fromEntries(Object.entries(DOUGH_ALIASES).map(([k, ours]) => [k, `${k}= is Strudel's or dough's name for ${ours}=, and isn't read here: write ${ours}=`])),
};
