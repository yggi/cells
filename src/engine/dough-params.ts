import { PARAMS } from './attributes';

/**
 * The parameters voices and physical cells understand, with what each means (from the table in
 * attributes.ts). Written as attributes: `&lead s=saw lpf=1800 room=.3` (its envelope is a cell:
 * map=adsr). The sound parameters keep dough's names (https://dough.strudel.cc, as in dough.c /
 * Strudel), and Strudel's and dough's other names for them read as ours (PARAM_ALIASES in attributes.ts); the
 * physical cells' are ours.
 */
export const DOUGH_PARAMS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(PARAMS).map(([k, a]) => [k, a.help]));

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
  penv: PITCH_DROP('penv'),
  pdec: PITCH_DROP('pdec'),
};
