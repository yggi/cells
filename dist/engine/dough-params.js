import { PARAMS } from "./attributes.js";
export const DOUGH_PARAMS = Object.fromEntries(Object.entries(PARAMS).map(([k, a]) => [k, a.help]));
export const DOUGH_SOURCES = {
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
const ENVELOPE = (k) => `${k}= is gone: an envelope is a cell — in the mix, &theme * &(map=adsr .01 .3 .5 .4) * &lead, or an instrument, &lead [&(map=adsr .01 .3 .5 .4) * &saw]`;
const PITCH_DROP = (k) => `${k}= is gone: a pitch drop is a pitch shape, an envelope in semitones — penv=30 pdec=.04 is pitch=0..30 * &(map=adsr 0 .04 0 0)`;
export const RETIRED_PARAMS = {
    attack: ENVELOPE('attack'),
    decay: ENVELOPE('decay'),
    sustain: ENVELOPE('sustain'),
    release: ENVELOPE('release'),
    penv: PITCH_DROP('penv'),
    pdec: PITCH_DROP('pdec'),
};
