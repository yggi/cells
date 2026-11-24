/**
 * Noise for noise voices (`s=white`, `s=pink`, `s=brown`): a few seconds of each colour, seeded, never `Math.random`, so a
 * piece sounds the same every time; a note loops it from a place its cell's seed, its voice and its start choose, as chance
 * is thrown (decision 031).
 * Lifted from yggi/cell-studio src/audio/voice/noise.ts @ f18aa7a.
 */
import type { CompileResult } from './program';
import { chanceOf } from './realize';
import { drawKeyOf, hashOf } from './drawkey';

/** A small seeded generator (mulberry32): numbers in [0, 1), the same sequence for the same seed. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The noise voices of a program (`s=white`, `pink` or `brown`) that write no seed, by name, each the place its grains are thrown
 * from, `noise#<identity>` (#945, decision 098): the identity of the cell (`drawKeyOf`: what it plays and is heard as, no name, no
 * spelling, no label, role or part), so a text renamed, respelled or edited elsewhere starts every noise where it did. Voices of
 * one identity would stack: the k-th of them (k from 1, in the compile's order of the cells, the voices being alike whichever it
 * is) takes the identity hashed with k, so they never throw alike, whatever order the lines are in.
 */
export function noisePlaces(result: CompileResult): ReadonlyMap<string, string> {
  const key = drawKeyOf(result);
  const taken = new Map<string, number>();
  const out = new Map<string, string>();
  for (const c of result.cells.values()) {
    if (!['white', 'pink', 'brown'].includes(String(c.params.s)) || c.seeded) continue;
    const h = key(c.name);
    const k = taken.get(h) ?? 0;
    taken.set(h, k + 1);
    out.set(c.name, `noise#${k ? hashOf(`${h}|${k}`) : h}`);
  }
  return out;
}

/**
 * What a voice's grains are thrown from (#932, #945, decision 098): the seed it writes alone, as its place (`noise#<n>`), or,
 * where it writes none, its place (`noisePlaces`) and its seed, 0.
 */
export function grainKeyOf(result: CompileResult): (voice: string) => { readonly seed: number; readonly place: string } {
  const places = noisePlaces(result);
  return (voice) => {
    const c = result.cells.get(voice);
    return c?.seeded ? { seed: 0, place: `noise#${c.seed}` } : { seed: c?.seed ?? 0, place: places.get(voice) ?? voice };
  };
}

/** Where in the noise a note starts (seconds): from its cell's seed, its voice and its start in the code's seconds. */
export function grainOffset(seed: number, voice: string, at: number, duration: number): number {
  // (`voice` is what the voice is keyed on: its place among the noise voices, not its name, #481)
  return chanceOf(`${seed}|${voice}|${at.toFixed(6)}|grain`) * duration;
}

/** How long a colour's noise is before it loops (s). */
export const NOISE_SECONDS = 4;

const made = new Map<string, Float32Array>();

/** `NOISE_SECONDS` of noise of a colour at a sample rate, made once. */
export function noise(colour: 'white' | 'pink' | 'brown', sampleRate: number): Float32Array {
  const key = `${colour}:${sampleRate}`;
  const cached = made.get(key);
  if (cached) return cached;
  const length = Math.floor(sampleRate * NOISE_SECONDS);
  const d = new Float32Array(length);
  const random = seeded(colour === 'white' ? 1 : colour === 'pink' ? 2 : 3);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0,
    last = 0;
  for (let i = 0; i < length; i++) {
    const w = random() * 2 - 1;
    if (colour === 'white') d[i] = w;
    else if (colour === 'pink') {
      // Paul Kellet's filter: -3 dB an octave
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    } else {
      // brown: the walk, leaky (-6 dB an octave)
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  made.set(key, d);
  return d;
}
