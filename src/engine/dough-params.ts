/**
 * The subset of dough's parameters (https://dough.strudel.cc, names as in
 * dough.c / Strudel) that voices understand. Written as attributes on a voice
 * cell: `&lead s=saw lpf=1800 room=.3` (its envelope is a cell: map=adsr). Rendering is done with Tone.js; dough
 * names keep the voice language compatible with dough/superdough.
 */
export const DOUGH_PARAMS: Readonly<Record<string, string>> = {
  s: 'sound source: sine tri saw square pulse white pink brown',
  lpf: 'low-pass cutoff, Hz',
  lpq: 'low-pass resonance',
  hpf: 'high-pass cutoff, Hz',
  hpq: 'high-pass resonance',
  penv: 'pitch envelope depth, semitones',
  pdec: 'pitch envelope decay, seconds',
  room: 'reverb send 0–1',
  delay: 'delay send 0–1',
  delaytime: 'echo time, seconds — or a clock: &bar/2 (an eighth at the tempo)',
  level: 'on the sound card: the overall level in dB (0 as it is, −6 about half)',
  motor: 'on a meter: it turns physically — a motor this strong pulls it to its tempo (from rest)',
  mass: 'physics: how heavy it turns (inertia); on a cell a meter drives, load',
  friction: 'physics: drag — the meter sags below its tempo, more with more load',
  wind: 'on a meter with a motor: its spring runs down over this many seconds, and it coasts to a stop',
  belt: 'on a driven cell (step=&x): it follows through a belt this stiff (200 taut, 20 slack) — it lags, swings, catches up',
  damping: 'a belt’s damping: how soon its swinging dies (0 rings on, high creeps)',
  slip: 'a belt’s grip: past this pull it slips, and the cell falls behind for good',
  varispeed: 'on a clock: its notes’ pitch follows its speed, as tape does (1 fully, 0 not)',
  beat: 'on a meter: how many of its steps make a beat — its bpm counts beats (beat=4: steps in sixteenths)',
  swing: 'on a meter: of each pair of steps, the second comes this far through (.5 straight, .67 triplet swing)',
  body: 'a resonator: what its exciters are — fork, bell, bar, plate, box, tine, pipe, wire, spring; its braid lists them (semitones; the twelve by default), a note plucks the nearest',
  ring: 'a resonator: how long it rings, in seconds',
  sun: 'the sun of a day (sun=&cycle): a 24-hour dial — noon at the top, midnight at the bottom; stopped, turn it to choose the moment',
  law: 'a law that computes the notes (law=fiveto12: the 5 to 12 cycle, a day of music)',
  anchor: 'a law: the time of day it starts (hours.minutes — 11.55); play begins where the clock stands',
  scope: 'a scope: stack, split, xy (in time) — spectrum, waterfall (in frequency, or value); its braid lists its channels',
  fold: 'a spectrum or waterfall: pitches folded by this stride into as many bins (12: by pitch class, the default)',
  bins: 'a spectrum or waterfall without a fold: this many bands, low to high (1 a meter, 3 low-mid-high, 20 an equaliser)',
  channels: 'a spectrum or waterfall: sum (one, the default) or split (each channel its own)',
  board: 'a resonator: the body its exciters share (box by default, an octave below; none: no board)',
  hard: 'a resonator: the mallet — 0 felt (dark), 1 steel (bright)',
  couple: 'a resonator: another it shares a table with (couple=&other) — each sets the other ringing',
  coupling: 'a resonator: how strongly it is coupled (.01 faint, .05 strong)',
  excite: 'a resonator: sound that drives it (excite=&mix) — it answers where the sound meets its modes',
  write: 'a tape: what its write head records (write=&melody); it moves with its step=',
  length: 'a tape: how long its loop is, in seconds of tape (or a clock: length=&bar*4); none, an open reel',
  erase: 'a tape: how much of what was there each pass under the write head wipes (1 all, .3 leaves ghosts)',
  tone: 'a sound tape: its loss — each pass through the loop darker (Hz: 7000 bright, 1500 worn)',
  drive: 'a sound tape: how hard it saturates each pass (0 clean, .5 warm, 1 crushed)',
  hiss: 'a sound tape: its noise floor (0 none, .02 a cassette)',
  print: 'a sound tape: print-through — a faint pre-echo before each head (.03 a whisper)',
  printgap: 'a sound tape: how far before each head the print-through sits (tape-seconds, .6)',
  dropout: 'a sound tape: brief gaps in the playback, about this many a second',
  wander: 'a read head: how far it wanders either way (tape-seconds) — a flying head',
  wanderhz: 'a read head: how fast it wanders (times a second)',
  play: 'a read head: the tape it reads (play=&tape), at= tape-seconds after the write head',
  at: 'a read head: how far after the write head it sits, in seconds of tape (or a clock: at=&bar)',
  wow: 'on a meter with a motor: its speed swings slowly by this fraction (.01: a tape machine’s wow)',
  distort: 'distortion: 0 clean, .3 gritty, 1 and more harsh',
  fm: 'frequency modulation: the voice that modulates this one (fm=&op); it may have its own fm=',
  ratio: 'as a modulator: its frequency against its carrier’s (1 the same, 3.5 a bell)',
  index: 'FM depth: how far the modulator swings the frequency (0 none … 10 bright); it can move',
  crush: 'bit depth: 16 clean, 8 grainy, 3 and fewer: rubble',
  delayfeedback: 'echo feedback 0–1',
};

/** Parameters that are times: they take a clock as well as seconds (delaytime=&bar/2). */
export const TIME_PARAMS: ReadonlySet<string> = new Set(['delaytime', 'length', 'at']);

/** Parameters that can move (given by cells): lpf=&sweep, lpf=200..3000 * &fenv. */
export const MOVING_PARAMS: ReadonlySet<string> = new Set(['lpf', 'lpq', 'hpf', 'hpq', 'room', 'delay', 'index']);

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

export const isDoughParam = (key: string) => key in DOUGH_PARAMS || key in DOUGH_ALIASES;
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
