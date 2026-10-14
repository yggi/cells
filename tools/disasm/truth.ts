/**
 * What is known about a file of the MIDI library, for the bench (docs/notes/disassembler.md): its voices as the
 * typesetter wrote them (midi/<set>/voices/), and its key as its index names it.
 */
import type { Smf } from '../../src/engine/midifile';
import { bestKey, keyName, type Key } from '../../src/engine/fold/degrees';
import type { Line } from '../../src/engine/fold/ir';

/** A voice: a track with at least this share of the notes; shorter ones are a typesetter's passing voices. */
const VOICE = 0.02;
/** Clean: the passing voices hold less than this share (a voice a track for the whole piece). */
const CLEAN = 0.01;

/** A file a track a voice: its voices, and whether they are clean (the notes in passing voices few). */
export function truthOf(smf: Smf): { smf: Smf; voices: number; clean: boolean } {
  const counts = smf.tracks.map((t) => t.notes.length);
  const all = counts.reduce((a, b) => a + b, 0);
  const voices = counts.filter((n) => n >= VOICE * all).length;
  const passing = counts.filter((n) => n > 0 && n < VOICE * all).reduce((a, b) => a + b, 0);
  return { smf, voices, clean: passing < CLEAN * all };
}

/** The key the folder reads from a file's notes (one for the piece: `bestKey`), its tracks as lines. */
export function keyOfNotes(smf: Smf): Key | null {
  const lines: Line[] = smf.tracks.map((t, i) => ({
    name: `t${i}`,
    chords: t.notes.map((n) => ({ at: n.tick, dur: n.end - n.tick, values: [String(n.key - 60)] })),
    length: Math.max(0, ...t.notes.map((n) => n.end)),
  }));
  return bestKey(lines);
}

const TONIC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** A tonality as an index names it (`C♯ minor`, `E♭ major`): its tonic and whether it's minor. */
function parse(name: string): { tonic: number; minor: boolean } {
  const m = /^([A-G])([♯#♭b]?)\s+(major|minor)/.exec(name.replace('harmonic minor', 'minor').replace('melodic minor', 'minor'));
  if (!m) throw new Error(`a tonality: ${name}`);
  const alter = m[2] === '♯' || m[2] === '#' ? 1 : m[2] === '♭' || m[2] === 'b' ? -1 : 0;
  return { tonic: (TONIC[m[1]!]! + alter + 12) % 12, minor: m[3] === 'minor' };
}

/** Whether a key the folder found is the tonality named (a harmonic or melodic minor is its minor). */
export function sameKey(k: Key, tonality: string): boolean {
  const [a, b] = [parse(keyName(k)), parse(tonality)];
  return a.tonic === b.tonic && a.minor === b.minor;
}

/**
 * How far voices found agree with the voices written (a file a track a voice each; notes matched by when, in quarter
 * notes, and pitch): of the pairs of notes one after the other in a voice found, the share one after the other in a
 * voice written too (precision), and the other way round (recall).
 */
export function voiceAgreement(found: Smf, written: Smf): { precision: number; recall: number } {
  const id = (smf: Smf, tick: number, key: number) => `${Math.round((tick / smf.ppq) * 48)}:${key}`;
  // (a note's voices: unisons in two voices are two notes at one place)
  const voicesOf = (smf: Smf) => {
    const at = new Map<string, number[]>();
    smf.tracks.forEach((t, v) => t.notes.forEach((n) => at.set(id(smf, n.tick, n.key), [...(at.get(id(smf, n.tick, n.key)) ?? []), v])));
    return at;
  };
  const pairs = (smf: Smf) =>
    smf.tracks.flatMap((t) => {
      const ns = [...t.notes].sort((a, b) => a.tick - b.tick || b.key - a.key);
      return ns.slice(1).map((n, i) => [id(smf, ns[i]!.tick, ns[i]!.key), id(smf, n.tick, n.key)] as const);
    });
  const share = (ps: readonly (readonly [string, string])[], other: Map<string, number[]>) => {
    const known = ps.filter(([a, b]) => other.has(a) && other.has(b));
    return known.length ? known.filter(([a, b]) => other.get(a)!.some((v) => other.get(b)!.includes(v))).length / known.length : 0;
  };
  return { precision: share(pairs(found), voicesOf(written)), recall: share(pairs(written), voicesOf(found)) };
}
