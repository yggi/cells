import { PARAMS } from './attributes';

export { MOVING_PARAMS, TIME_PARAMS } from './attributes';

/**
 * The parameters voices and physical cells understand, with what each means (from the table in
 * attributes.ts). Written as attributes: `&lead s=saw lpf=1800 room=.3` (its envelope is a cell:
 * map=adsr). The sound parameters keep dough's names (https://dough.strudel.cc, as in dough.c /
 * Strudel); the physical cells' are ours.
 */
export const DOUGH_PARAMS: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(PARAMS).map(([k, a]) => [k, a.help]));

/** Aliases dough accepts for the same parameters. */
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

export const isDoughParam = (key: string) => key in PARAMS || key in DOUGH_ALIASES;
export const canonical = (key: string) => DOUGH_ALIASES[key] ?? key;

/** Parameters that are gone, and what says the same thing now. */
const ENVELOPE = (k: string) =>
  `${k}= is gone: an envelope is a cell — in the mix, &theme * &(map=adsr .01 .3 .5 .4) * &lead, or an instrument, &lead [&(map=adsr .01 .3 .5 .4) * &saw]`;
export const RETIRED_PARAMS: Readonly<Record<string, string>> = {
  attack: ENVELOPE('attack'),
  decay: ENVELOPE('decay'),
  sustain: ENVELOPE('sustain'),
  release: ENVELOPE('release'),
  gain: 'gain= is gone: set the level in the mix, &theme * &lead * 0.8',
  pan: 'pan= is gone: balance with two mixes, &out … map=sample &left &right',
};
