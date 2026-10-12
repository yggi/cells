/**
 * A MIDI file as a piece (#307, step 2): its notes written out flat, every one kept, ready to play and for Shorten to
 * fold. Pure: a `Smf` (`midifile.ts`) in, `.cells` source out.
 *
 * - **The grid**: the coarsest step (a quarter note, an eighth, a triplet … down to a 64th) that every start falls on,
 *   within a 96th of a quarter (and an eighth of the step); a file played in, whose starts fall on none, is laid on sixteenths and says how many
 *   notes moved.
 * - **The time**: one meter for the whole piece, `&tempo scan(…) step=free(…bpm) beat=… laps=1`, a step each grid step,
 *   each as long as the file's tempo map makes it (a scan's steps are its weights against their mean), so a tempo
 *   change is a change of weight, as BWV 847 writes its own; laps=1, so the piece ends.
 * - **The lines**: a line a track and channel (a format 0 file's channels apart), named after the track. Notes that start
 *   and end together are a chord; one that overlaps another goes in a line of its own beside it (`&lead2`), so every
 *   note is written. A melodic note is its key in semitones from C4, on a voice at C4; channel 10 is drums, each note
 *   a drum voice by its General MIDI name (`&bd`, `&sd`, `&hh` …). Each line is as long as the piece (a rest at its
 *   end), so nothing comes round again.
 * - **What is not kept**: velocities (each line at one level), bends, programs (every melodic line one voice, a
 *   triangle), controllers.
 */
import { secondsAt, type Smf, type SmfNote } from './midifile';
import { fold, printFolded, type Chord, type Line } from './fold';
import { compileSource } from './compile';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';

/** A file as a piece, and what was made of it. */
export interface Imported {
  readonly source: string;
  readonly notes: number;
  /** The braids written (a track's overlapping notes in more than one). */
  readonly lines: number;
  /** Grid steps a quarter note. */
  readonly perQuarter: number;
  /** Notes moved onto the grid (a file played in); drum notes no drum voice is for. */
  readonly moved: number;
  readonly dropped: number;
  /** Folded (engine/fold): what comes back written as cells of its own; else every note written out. */
  readonly folded: boolean;
}

/** Steps a quarter the grid may have, coarsest first. */
const DIVISIONS = [1, 2, 3, 4, 6, 8, 12, 16];
/** The share of starts that must fall on a grid for it to be the file's. */
const ON_GRID = 0.995;

/** General MIDI's drums as the voices a piece writes for them, by note; each voice's sound below. */
const DRUM_OF: Record<number, string> = {
  35: 'bd',
  36: 'bd',
  37: 'rim',
  38: 'sd',
  39: 'cp',
  40: 'sd',
  41: 'lo',
  42: 'hh',
  43: 'lo',
  44: 'hh',
  45: 'mid',
  46: 'oh',
  47: 'mid',
  48: 'hi',
  49: 'crash',
  50: 'hi',
  51: 'ride',
  52: 'crash',
  53: 'ride',
  55: 'crash',
  57: 'crash',
  59: 'ride',
};
const DRUMS: Record<string, string> = {
  bd: 's=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&(map=adsr 0 .3 0 .05)',
  sd: 's=white hpf=1500 env=&(map=adsr 0 .12 0 .05)',
  hh: 's=white hpf=8000 env=&(map=adsr 0 .04 0 .02)',
  oh: 's=white hpf=7000 env=&(map=adsr 0 .25 0 .1)',
  rim: 's=sine loop=E5 env=&(map=adsr 0 .03 0 .02)',
  cp: 's=white hpf=1000 env=&(map=adsr 0 .08 0 .05)',
  lo: 's=sine loop=G2 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .25 0 .05)',
  mid: 's=sine loop=C3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .2 0 .05)',
  hi: 's=sine loop=F3 pitch=0..12 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .15 0 .05)',
  crash: 's=white hpf=5000 env=&(map=adsr 0 .8 0 .3)',
  ride: 's=white hpf=9000 env=&(map=adsr 0 .4 0 .2)',
};
/** Names a line can't take: the piece's own cells, and the drums'. */
const TAKEN = new Set(['out', 'piece', 'tempo', ...Object.keys(DRUMS)]);

/** A number written short: at most `digits` significant, no trailing zeros. */
const short = (x: number, digits = 5) => String(Number(x.toPrecision(digits)));

/** A track's name as a cell's: camelCase letters and digits, a letter first. */
function nameOf(raw: string | undefined, fallback: string): string {
  const words = (raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  let name = words.map((w, i) => (i ? w[0]!.toUpperCase() + w.slice(1) : w[0]!.toLowerCase() + w.slice(1))).join('');
  if (!name || !/^[A-Za-z]/.test(name)) name = fallback;
  return name.slice(0, 24);
}

/** The coarsest grid (ticks a step) every start falls on, and how many starts it moves. */
function gridOf(ppq: number, starts: readonly number[]): { step: number; perQuarter: number; moved: number } {
  // (within a 96th of a quarter, and an eighth of the step: a fine grid doesn't catch what was played in)
  const off = (step: number) => {
    const tol = Math.min(Math.max(1, ppq / 96), step / 8);
    return starts.filter((t) => Math.abs(t - Math.round(t / step) * step) > tol).length;
  };
  for (const d of DIVISIONS) {
    const step = ppq / d;
    const moved = off(step);
    if (starts.length - moved >= ON_GRID * starts.length) return { step, perQuarter: d, moved };
  }
  return { step: ppq / 4, perQuarter: 4, moved: off(ppq / 4) };
}

/** A line's notes (steps), as a braid's tokens, `length` steps long. */
function braidOf(chords: readonly Chord[], length: number): string {
  const out: string[] = [];
  let now = 0;
  const rest = (n: number) => n > 0 && out.push(n === 1 ? '~' : `~@${n}`);
  for (const c of chords) {
    rest(c.at - now);
    const v = c.values.length === 1 ? c.values[0]! : `[${c.values.join(',')}]`;
    out.push(c.dur === 1 ? v : `${v}@${c.dur}`);
    now = c.at + c.dur;
  }
  rest(length - now);
  return out.join(' ');
}

/**
 * A MIDI file as a piece's source: every note it plays, flat; `shorten`, folded (engine/fold) where that plays the same
 * and is shorter. `free`: its tempo a slider (else fixed).
 */
export function cellsFromMidi(smf: Smf, title: string, { free = true, shorten = false }: { free?: boolean; shorten?: boolean } = {}): Imported {
  // the parts: a track's notes by channel
  const parts: { name: string; drums: boolean; notes: SmfNote[] }[] = [];
  smf.tracks.forEach((t, i) => {
    const channels = [...new Set(t.notes.map((n) => n.channel))].sort((a, b) => a - b);
    for (const c of channels) {
      const base = nameOf(t.name, `track${i + 1}`);
      parts.push({ name: channels.length > 1 ? `${base}Ch${c}` : base, drums: c === 10, notes: t.notes.filter((n) => n.channel === c) });
    }
  });
  const all = parts.flatMap((p) => p.notes);
  const { step, perQuarter, moved } = gridOf(smf.ppq, [...all.map((n) => n.tick)]);
  const at = (tick: number) => Math.round(tick / step);
  const length = Math.max(1, ...all.map((n) => Math.max(at(n.tick) + 1, at(n.end))));

  // the tempo: each step's length from the file's tempo map, as weights against the commonest, in runs
  const lengths = Array.from({ length }, (_, k) => secondsAt(smf, (k + 1) * step) - secondsAt(smf, k * step));
  const counts = new Map<string, number>();
  for (const l of lengths) counts.set(short(l, 6), (counts.get(short(l, 6)) ?? 0) + 1);
  const common = Number([...counts].sort((a, b) => b[1] - a[1])[0]![0]);
  const weights = lengths.map((l) => short(l / common));
  const runs: string[] = [];
  for (let k = 0; k < length;) {
    let n = 1;
    while (k + n < length && weights[k + n] === weights[k]) n++;
    runs.push(n === 1 ? weights[k]! : `${weights[k]}!${n}`);
    k += n;
  }
  // (the scan's steps are its weights against their mean: the bpm makes the whole as long as the file)
  const total = lengths.reduce((a, b) => a + b, 0);
  const bpm = (60 * length) / (total * perQuarter);
  // (free: a slider; not, for a MIDI file played as it is, where nothing is kept)
  const rate = free ? `free(${short(bpm, 6)}bpm, ${Math.floor(bpm * 0.6)}..${Math.ceil(bpm * 1.5)})` : `${short(bpm, 6)}bpm`;
  const tempo = `&tempo scan(${runs.join(' ')}) step=${rate} beat=${perQuarter} laps=1`;

  // the lines: chords where notes start and end together, a line beside for a note that overlaps
  const taken = new Set(TAKEN);
  const unique = (name: string) => {
    let n = name;
    for (let i = 2; taken.has(n); i++) n = `${name}${i}`;
    taken.add(n);
    return n;
  };
  const lines: Line[] = [];
  const mix: string[] = [];
  const voices: string[] = [];
  const drumsUsed = new Set<string>();
  let dropped = 0;
  let count = 0;
  for (const p of parts) {
    const layers: Chord[][] = [];
    for (const n of [...p.notes].sort((a, b) => a.tick - b.tick || a.key - b.key)) {
      const value = p.drums ? DRUM_OF[n.key] : String(n.key - 60);
      if (value === undefined) {
        dropped++;
        continue;
      }
      if (p.drums) drumsUsed.add(value);
      const s = at(n.tick);
      const dur = Math.max(1, at(n.end) - s);
      const token = p.drums ? `&${value}` : value;
      const layer = layers.find((l) => {
        // (a layer is never empty: made with its first chord)
        const last = l[l.length - 1]!;
        return (last.at === s && last.dur === dur && !last.values.includes(token)) || last.at + last.dur <= s;
      });
      const last = layer?.[layer.length - 1];
      if (layer && last!.at === s && last!.dur === dur) layer[layer.length - 1] = { ...last!, values: [...last!.values, token] };
      else if (layer) layer.push({ at: s, dur, values: [token] });
      else layers.push([{ at: s, dur, values: [token] }]);
      count++;
    }
    if (!layers.length) continue;
    const voice = p.drums ? null : unique(`${p.name}Voice`);
    const names = layers.map(() => unique(p.name));
    layers.forEach((chords, i) => lines.push({ name: names[i]!, chords, length }));
    if (voice) voices.push(`&${voice} s=tri loop=C4 env=&(map=adsr .005 .2 .6 .15)`);
    for (const n of names) mix.push(voice ? `&${n} * &${voice} * .25` : `&${n} * .4`);
  }
  const write = (body: string[], how: string) => {
    const label = `Opened from a MIDI file: ${count} notes in ${lines.length} line${lines.length === 1 ? '' : 's'}, ${perQuarter} steps a quarter note, ${how}.`;
    return [
      `&piece title="${title.replace(/"/g, "'")}" tags="midi" label="${label}" about=&out`,
      '',
      `# the file's tempo map: a step each ${perQuarter === 4 ? 'sixteenth' : `1/${perQuarter} of a quarter note`}; laps=1, so the piece ends`,
      tempo,
      '',
      ...body,
      '',
      ...voices,
      ...[...drumsUsed].sort().map((d) => `&${d} ${DRUMS[d]}`),
      `&out map=sample [${mix.join(', ')}]`,
      '',
    ].join('\n');
  };
  const flat = write(
    [
      '# every note, a line a track (and one beside for notes that overlap); melodies as semitones from C4',
      ...lines.map((l) => `&${l.name} step=&tempo ${braidOf(l.chords, l.length)}`),
    ],
    'written out in full: Shorten folds it',
  );
  let source = flat;
  let folded = false;
  if (shorten && lines.length) {
    // (the folder, engine/fold: its symbols as cells above the lines; taken only if it plays the same notes, and is shorter)
    const { defs, lines: braids, scales } = printFolded(fold(lines));
    const candidate = write(
      [
        '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^$n: n semitones up',
        ...defs,
        '',
        '# every note, a line a track; melodies as semitones from C4',
        ...lines.map((l) => `&${l.name} step=&tempo${scales.get(l.name) === 1 ? '' : `*${scales.get(l.name)}`} ${braids.get(l.name)}`),
      ],
      'folded (engine/fold)',
    );
    if (candidate.length < flat.length && sameNotes(flat, candidate)) [source, folded] = [candidate, true];
  }
  return { source, notes: count, lines: lines.length, perQuarter, moved, dropped, folded };
}

/** Do two sources play the same notes (keys, starts and lengths within a millisecond)? */
function sameNotes(a: string, b: string): boolean {
  const notes = (s: string) => {
    const r = compileSource(s);
    if (!r.ok) return null;
    const p = plan(r, codeShifts(r), r.off);
    return eventsBetween(p, 0, p.end)
      .map((e) => `${e.at.toFixed(3)} ${e.dur.toFixed(3)} ${e.voice} ${e.freq.toFixed(2)}`)
      .sort();
  };
  const [x, y] = [notes(a), notes(b)];
  return !!x && !!y && x.length === y.length && x.every((n, i) => n === y[i]);
}
