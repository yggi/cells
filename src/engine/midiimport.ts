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
 *   a drum voice by its General MIDI name (`&bd`, `&sd`, `&hh` …), or, on a drum track the app saved, the kit its name
 *   lists (`bd(A1) dundun(C2) shekere`: each member at its pitch, #334). Each line is as long as the piece (a rest at its
 *   end), so nothing comes round again.
 * - **What is not kept**: velocities (each line at one level), bends, programs (every melodic line one voice, a
 *   triangle), controllers.
 */
import { secondsAt, type Smf, type SmfNote } from './midifile';
import { fold, printFolded, type Chord, type Line, type Stage } from './fold';
import { storyOf } from './fold/story';
import { useOrder } from './fold/print';
import type { Folded } from './fold/ir';
import { bestKey, inDegrees, keyName, scaleText } from './fold/degrees';
import { cutLines, keyAreas } from './fold/sections';
import { voicesOf } from './fold/voices';
import { compileSource } from './compile';
import { MAX_REPS } from './parser/scanner';
import { codeShifts } from './program';
import { eventsBetween, plan } from './realize';
import { gmDrumNote, kitNotes } from './midi';

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
  /** Folded in degrees of this key (`C minor`), its lines reading through it (#344); null: in semitones. */
  readonly inKey: string | null;
  /**
   * How the fold comes about (asked for: `story`), as frames to replay (fold/story.ts): the lines written out, then a
   * cell at a time to the piece folded, the last frame `source`. Each plays the same notes. What each frame did, `says`.
   */
  readonly story?: readonly StoryStep[];
}

/** A frame of a fold's story: the piece by then, and a line on what came. */
export interface StoryStep {
  readonly source: string;
  readonly says: string;
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
/** A drum this importer has no sound for: a tuned one (a sine at its pitch), else a noise. */
const TUNED = 's=sine env=&(map=adsr 0 .3 0 .05)';
const NOISE = 's=white hpf=6000 env=&(map=adsr 0 .1 0 .05)';

/**
 * The kit a drum track the app saved names (`midiexport.ts`): its members in order, each with its pitch where it has
 * one (`dundun(C2) shekere`), their notes as MIDI out gave them (`kitNotes`). Null for a name that isn't such a list,
 * or one some note of the track has no member for (another program's file: General MIDI's drums, below).
 */
function kitOf(name: string | undefined, notes: readonly SmfNote[]): Map<number, { member: string; sound: string }> | null {
  const words = (name ?? '').trim().split(/\s+/);
  const members: { member: string; pitch: string | null }[] = [];
  for (const w of words) {
    const m = /^([A-Za-z][A-Za-z0-9]*)(?:\(([A-G][#b]?-?\d|\d+(?:\.\d+)?)\))?$/.exec(w);
    if (!m) return null;
    members.push({ member: m[1]!, pitch: m[2] ?? null });
  }
  const keys = kitNotes(members.map((m) => m.member));
  const out = new Map<number, { member: string; sound: string }>();
  for (const { member, pitch } of members) {
    const key = keys.get(member);
    if (key === undefined) continue;
    // (a General MIDI name: that drum's sound, at the member's pitch; else a sine at its pitch, or a noise)
    const gm = gmDrumNote(member);
    const own = gm === null ? undefined : DRUMS[DRUM_OF[gm] ?? ''];
    const sound = own ? own.replace(/ ?loop=\S+/, '') : pitch ? TUNED : NOISE;
    out.set(key, { member, sound: pitch ? sound.replace(/^(s=\S+)/, `$1 loop=${pitch}`) : sound });
  }
  return notes.every((n) => out.has(n.key)) ? out : null;
}

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
  // (a rest longer than a step may be held (`MAX_REPS`) in pieces: a voice that enters late in a long piece)
  const rest = (n: number) => {
    for (; n > MAX_REPS; n -= MAX_REPS) out.push(`~@${MAX_REPS}`);
    if (n > 0) out.push(n === 1 ? '~' : `~@${n}`);
  };
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
 * and is shorter. `free`: its tempo a slider (else fixed). `watch`: the fold as it runs, each move the piece as it is
 * by then (a thunk: printed only if wanted), the last the fold taken (`done`; the piece returned is that, or the flat
 * one where the fold doesn't play the same). `credit`: lines said as comments under the card (where the file came from). `pitches`: folded in semitones, in degrees of the piece's key (#344), in sections by key (#346), or each and the shortest taken (`auto`).
 * `split`: a line a track (`tracks`), a line a voice (`voices`: a keyboard part's notes as the voices a fugue is
 * written in, `fold/voices.ts`), or each and the shorter fold taken (`auto`).
 */
export function cellsFromMidi(
  smf: Smf,
  title: string,
  {
    free = true,
    shorten = false,
    credit = [],
    pitches = 'auto',
    split = 'auto',
    watch,
    story = false,
  }: {
    free?: boolean;
    shorten?: boolean;
    credit?: readonly string[];
    pitches?: 'auto' | 'semitones' | 'degrees' | 'sections';
    split?: 'auto' | 'tracks' | 'voices';
    watch?: (source: () => string, stage: Stage) => void;
    /** Tell how the fold taken comes about (`Imported.story`). */
    story?: boolean;
  } = {},
): Imported {
  // a line a track, and a line a voice where a track holds several (a fugue's hands): the shorter fold taken, told
  // as one fold (each one's moves, then the one taken, `done`)
  if (shorten && split !== 'tracks') {
    const apart = byVoice(smf);
    const told = (how: string) =>
      watch && ((source: () => string, stage: Stage) => stage.tool !== 'done' && watch(source, how ? { ...stage, tool: `${stage.tool}, ${how}` } : stage));
    const options = { free, shorten, credit, pitches, story, split: 'tracks' as const };
    const inTracks = split === 'voices' && apart ? null : cellsFromMidi(smf, title, { ...options, watch: told('') });
    const inVoices = apart && cellsFromMidi(apart, title, { ...options, watch: told('in voices') });
    const taken = inVoices?.folded && (!inTracks || !inTracks.folded || inVoices.source.length < inTracks.source.length) ? inVoices : inTracks!;
    watch?.(() => taken.source, { tool: 'done', round: 0 });
    return taken;
  }
  // the parts: a track's notes by channel
  const parts: { name: string; drums: boolean; notes: SmfNote[]; kit?: Map<number, { member: string; sound: string }> | null }[] = [];
  smf.tracks.forEach((t, i) => {
    const channels = [...new Set(t.notes.map((n) => n.channel))].sort((a, b) => a - b);
    for (const c of channels) {
      const base = nameOf(t.name, `track${i + 1}`);
      const notes = t.notes.filter((n) => n.channel === c);
      // (the app's own drum track names its kit: its members come back as the piece's drums, at their pitches)
      const kit = c === 10 ? kitOf(t.name, notes) : null;
      const name = kit ? nameOf([...new Set([...kit.values()].map((k) => k.member))].join(' '), `track${i + 1}`) : base;
      parts.push({ name: channels.length > 1 ? `${name}Ch${c}` : name, drums: c === 10, notes, kit });
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
  // (the kits' members, as voices: a name each, the same sound under one name)
  const members = new Map<string, string>();
  // (a member may take a General MIDI drum's name, `bd`, unless a track of another program's drums writes that voice)
  const gmToo = parts.some((p) => p.drums && !p.kit);
  const memberVoice = (member: string, sound: string): string => {
    for (const [name, def] of members) if (def === sound && name.replace(/\d+$/, '') === member) return name;
    let name = member;
    for (let i = 2; members.has(name) || (taken.has(name) && (gmToo || !(name in DRUMS))); i++) name = `${member}${i}`;
    taken.add(name);
    members.set(name, sound);
    return name;
  };
  const kits = parts.map((p) => (p.kit ? new Map([...p.kit].map(([key, k]) => [key, memberVoice(k.member, k.sound)])) : null));
  let dropped = 0;
  let count = 0;
  for (const [pi, p] of parts.entries()) {
    const layers: Chord[][] = [];
    const kit = kits[pi];
    // (a legato line, each note held into the next by one slide: a glide's run, its notes tied, the voice gliding)
    const legato = p.drums ? null : legatoOf(p.notes, smf);
    for (const n of legato?.notes ?? [...p.notes].sort((a, b) => a.tick - b.tick || a.key - b.key)) {
      const value = kit ? kit.get(n.key) : p.drums ? DRUM_OF[n.key] : String(n.key - 60);
      if (value === undefined) {
        dropped++;
        continue;
      }
      if (p.drums && !kit) drumsUsed.add(value);
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
    if (voice) voices.push(`&${voice} s=tri loop=C4${legato ? ` glide=${legato.glide}` : ''} env=&(map=adsr .005 .2 .6 .15)`);
    for (const n of names) mix.push(voice ? `&${n} * &${voice} * .25` : `&${n} * .4`);
  }
  const write = (body: string[], how: string) => {
    const label = `Opened from a MIDI file: ${count} notes in ${lines.length} line${lines.length === 1 ? '' : 's'}, ${perQuarter} step${perQuarter === 1 ? '' : 's'} a quarter note, ${how}.`;
    return [
      `&piece title="${title.replace(/"/g, "'")}" tags="midi" label="${label}" about=&out`,
      // (where the file came from and on what terms: comments the piece keeps)
      ...(credit.length ? ['', ...credit.map((l) => `# ${l}`)] : []),
      '',
      `# the file's tempo map: a step each ${perQuarter === 4 ? 'sixteenth' : `1/${perQuarter} of a quarter note`}; laps=1, so the piece ends`,
      tempo,
      '',
      ...body,
      '',
      ...voices,
      ...[...drumsUsed].sort().map((d) => `&${d} ${DRUMS[d]}`),
      ...[...members].map(([name, sound]) => `&${name} ${sound}`),
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
  let inKey: string | null = null;
  let told: StoryStep[] | undefined;
  if (shorten && lines.length) {
    // (a move of a fold is told with which fold it is; each fold's end is `folded`, the one taken `done`, below)
    const label = (tool: string, round: number, how: string) => (tool === 'done' ? 'folded' : round ? `${tool}, ${how}` : tool);
    // (the folder, engine/fold: its symbols as cells above the lines; taken only if it plays the same notes, and is shorter)
    const printed = (f: Folded, fixed?: ReadonlyMap<string, string>) => {
      const { defs, lines: braids, scales } = printFolded(f, 'm', '&tempo', '^$', fixed);
      return write(
        [
          '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^$n: n semitones up',
          ...defs,
          '',
          '# every note, a line a track; melodies as semitones from C4',
          ...lines.map((l) => `&${l.name} step=&tempo${scales.get(l.name) === 1 ? '' : `/${scales.get(l.name)}`} ${braids.get(l.name)}`),
        ],
        'folded (engine/fold)',
      );
    };
    // (each with what it folded, the fold and its printer: the one taken can tell its story)
    type Print = (f: Folded, fixed?: ReadonlyMap<string, string>) => string;
    const candidates: { source: string; key: string | null; allowance?: number; from: readonly Line[]; folded: Folded; print: Print; how: string }[] = [];
    if (pitches === 'auto' || pitches === 'semitones') {
      const folds = fold(lines, watch && ((now, stage) => watch(() => printed(now()), { ...stage, tool: label(stage.tool, stage.round, 'in semitones') })));
      candidates.push({ source: printed(folds), key: null, from: lines, folded: folds, print: printed, how: 'Every note written out, as semitones from C4' });
    }
    // and in degrees of the piece's key (#344): a sequence, a step of the scale higher each time, is one phrase moved
    const key = bestKey(lines);
    if (pitches !== 'semitones' && key && lines.some((l) => l.chords.some((c) => c.values.some((v) => !v.startsWith('&'))))) {
      const name = unique('key');
      const printedIn = (f: Folded, fixed?: ReadonlyMap<string, string>) => {
        const { defs, lines: braids, scales } = printFolded(f, 'm', '&tempo', '^', fixed);
        return write(
          [
            `# the key: the lines read through it, a note its degree (0 the tonic; 6# the seventh raised a semitone)`,
            `&${name} ${scaleText(key)}`,
            '',
            '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up',
            ...defs,
            '',
            `# every note, a line a track; melodies as degrees of ${keyName(key)}`,
            ...lines.map(
              (l) =>
                `&${l.name} step=&tempo${scales.get(l.name) === 1 ? '' : `/${scales.get(l.name)}`}${l.chords.some((c) => c.values.some((v) => !v.startsWith('&'))) ? ` over=&${name}` : ''} ${braids.get(l.name)}`,
            ),
          ],
          `folded in degrees of ${keyName(key)} (engine/fold)`,
        );
      };
      if (pitches === 'auto' || pitches === 'degrees') {
        const tune = inDegrees(lines, key);
        const folds = fold(tune, watch && ((now, stage) => watch(() => printedIn(now()), { ...stage, tool: label(stage.tool, stage.round, `in degrees of ${keyName(key)}`) })), {
          degrees: true,
        });
        candidates.push({ source: printedIn(folds), key: keyName(key), from: tune, folded: folds, print: printedIn, how: `Every note written out, as degrees of ${keyName(key)}` });
      }
      // and in sections (#346): cut where the key changes, each part of a line a cell in degrees of its section's key
      const meter = smf.meters[0] ?? { num: 4, den: 4 };
      const bar = Math.max(1, Math.round((perQuarter * 4 * meter.num) / meter.den));
      const sections = pitches === 'auto' || pitches === 'sections' ? keyAreas(lines, bar) : [];
      if (sections.length > 1) {
        const parts = cutLines(lines, sections, bar);
        const tune = parts.map((p) => inDegrees([p.part], sections[p.section]!.key)[0]!);
        const keys = [...new Set(sections.map((x) => scaleText(x.key)))];
        const keyNames = new Map(keys.map((k, i) => [k, unique(`key${i + 1}`)]));
        const partNames = new Map<string, string>();
        const printedSections = (f: Folded, fixed?: ReadonlyMap<string, string>) => {
          const { defs, lines: braids, scales } = printFolded(f, 'm', '&tempo', '^', fixed);
          // (a part as a cell read through its section's key, spliced as slow as its clock; one written alike, the same cell)
          const cells = new Map<string, string>();
          const sectionDefs: string[] = [];
          const spliced = new Map<string, string[]>(lines.map((l) => [l.name, []]));
          for (const p of parts) {
            const braid = braids.get(p.part.name)!;
            const scale = scales.get(p.part.name) ?? 1;
            const stretched = scale === 1 ? '' : `@${scale}`;
            // (a part all rest is a rest in the line, one with the rests beside it)
            if (/^~(@\d+)?(!\d+)?$/.test(braid)) {
              const steps = spliced.get(p.line)!;
              const before = /^~(?:@(\d+))?$/.exec(steps[steps.length - 1] ?? '');
              const n = p.part.length + (before ? Number(before[1] ?? 1) : 0);
              if (before) steps.pop();
              steps.push(n === 1 ? '~' : `~@${n}`);
              continue;
            }
            const over = keyNames.get(scaleText(sections[p.section]!.key))!;
            const id = `${over} ${braid}`;
            let name = cells.get(id);
            if (!name) {
              name = partNames.get(`${p.line}§${p.section}`) ?? unique(`${p.line}${String.fromCharCode(65 + (p.section % 26))}`);
              partNames.set(`${p.line}§${p.section}`, name);
              cells.set(id, name);
              sectionDefs.push(`&${name} over=&${over} ${braid}`);
            }
            spliced.get(p.line)!.push(`&${name}${stretched}`);
          }
          return write(
            [
              `# the keys: a section a key, cut where the key changes; a note its degree (0 the tonic; 6# the seventh raised a semitone)`,
              ...keys.map((k) => `&${keyNames.get(k)} ${k}`),
              '',
              '# what comes back, as cells of its own (a phrase, a phrase made of phrases, …); ^n: n degrees up',
              ...defs,
              '',
              `# the sections, a cell each part of a line, read through its section's key: ${sections.map((x) => keyName(x.key)).join(', ')}`,
              ...sectionDefs,
              '',
              '# every note, a line a track: its sections in order',
              // (a section's cell, then the same again: x!n, as the printer writes a run)
              ...lines.map((l) => `&${l.name} step=&tempo ${runsOf(spliced.get(l.name)!)}`),
            ],
            `folded in ${sections.length} sections by key (engine/fold)`,
          );
        };
        const sectioned = fold(
          tune,
          watch && ((now, stage) => watch(() => printedSections(now()), { ...stage, tool: label(stage.tool, stage.round, `in ${sections.length} sections by key`) })),
          { degrees: true },
        );
        candidates.push({
          allowance: SECTIONS,
          source: printedSections(sectioned),
          key: `${sections.length} sections by key (${sections.map((x) => keyName(x.key)).join(', ')})`,
          from: tune,
          folded: sectioned,
          print: printedSections,
          how: `Every note written out, in ${sections.length} sections by key`,
        });
      }
    }
    // (a fold's story, fold/story.ts: each frame printed with the names the fold itself gives its cells, so a cell keeps
    // its name, and its node in the graph, from the frame it comes in to the end)
    const tell = (c: (typeof candidates)[number]): StoryStep[] => {
      const fixed = new Map(useOrder(c.folded).map((k, i) => [k, `m${i + 1}`]));
      return storyOf(c.from, c.folded).map((fr, i) => {
        const r = fr.came === null ? null : c.folded.rules.get(fr.came)!;
        const places = `in ${fr.uses} place${fr.uses === 1 ? '' : 's'}`;
        const says = !r
          ? i === 0
            ? c.how
            : 'The lines on their own clocks, figures read over chords'
          : r.of
            ? `&${fixed.get(fr.came!)} · a copy of &${fixed.get(r.of)}, changed · ${places}`
            : `&${fixed.get(fr.came!)} · ${r.kids.length} steps · ${places}`;
        return { source: c.print(fr.folded, fixed), says };
      });
    };
    // (the shorter first, sections counted at their allowance; each taken only if it is shorter than the notes written
    // out and plays them)
    for (const c of candidates.sort((a, b) => a.source.length / (a.allowance ?? 1) - b.source.length / (b.allowance ?? 1)))
      if (c.source.length < flat.length && sameNotes(flat, c.source)) {
        [source, folded, inKey] = [c.source, true, c.key];
        if (story) told = tell(c);
        break;
      }
    const taken = source;
    watch?.(() => taken, { tool: 'done', round: 0 });
  }
  return {
    source,
    notes: count,
    lines: lines.length,
    perQuarter,
    moved,
    dropped,
    folded,
    inKey,
    ...(story ? { story: told ?? [{ source, says: 'Every note written out' }] } : {}),
  };
}

/**
 * A line played legato (#334): single notes, each held into the next by one slide in seconds (or by the next one's
 * length, where that is shorter; one on the same key only meets it), as MIDI out sends a glide's run (`legatoNotes`,
 * engine/midi.ts). Its notes each ending where the next starts (tied, as the run was written), and the slide (its
 * voice's `glide=`, to the millisecond); null for a line that isn't (no overlaps, a chord, or overlaps that differ: a
 * file played in).
 */
function legatoOf(notes: readonly SmfNote[], smf: Smf): { notes: SmfNote[]; glide: number } | null {
  const ns = [...notes].sort((a, b) => a.tick - b.tick || a.key - b.key);
  if (ns.some((n, i) => i > 0 && n.tick === ns[i - 1]!.tick)) return null;
  const sec = (tick: number) => secondsAt(smf, tick);
  // (each overlap, and how long the note it overlaps into sounds: to the next start, or its own end; in seconds, as
  // the slide is, whatever the tempo map does to it in ticks)
  const overlaps = ns.flatMap((n, i) => {
    const next = ns[i + 1];
    if (!next || n.end <= next.tick) return [];
    const after = ns[i + 2];
    const room = (after && after.tick < next.end ? sec(after.tick) : sec(next.end)) - sec(next.tick);
    return [{ i, by: sec(n.end) - sec(next.tick), room }];
  });
  if (overlaps.length < 2) return null;
  const slide = Math.max(...overlaps.map((o) => o.by));
  if (!overlaps.every((o) => Math.abs(o.by - Math.min(slide, o.room)) <= LEGATO_EPS)) return null;
  const at = new Set(overlaps.map((x) => x.i));
  return { notes: ns.map((n, i) => (at.has(i) ? { ...n, end: ns[i + 1]!.tick } : n)), glide: Math.round(slide * 1000) / 1000 };
}

/** How far two overlaps of a legato line may differ (s): a few ticks, where a file's ticks round its seconds. */
const LEGATO_EPS = 0.004;

/** Voices' names, by how many (a line a voice, `byVoice`); more than four are numbered. */
const VOICE_NAMES: Readonly<Record<number, readonly string[]>> = {
  2: ['upper', 'lower'],
  3: ['upper', 'middle', 'lower'],
  4: ['soprano', 'alto', 'tenor', 'bass'],
};
/** At most this many voices: a texture of more is chords, not counterpoint. */
const MOST_VOICES = 8;

/**
 * A file's melodic notes a track a voice (`fold/voices.ts`), its drums as they were: where the tracks are one instrument
 * (a program) and some track holds more than one voice (a keyboard part's hands). Null where there is nothing to split,
 * or a track is a legato line (its overlaps a glide's, not voices).
 */
export function byVoice(smf: Smf): Smf | null {
  const melodic = smf.tracks.map((t) => t.notes.filter((n) => n.channel !== 10)).filter((ns) => ns.length);
  const programs = new Set(smf.tracks.filter((t) => t.notes.some((n) => n.channel !== 10)).map((t) => t.programs[0]?.program ?? 0));
  // (one instrument; and no legato line, a glide's run, whose overlaps aren't voices: #334)
  if (programs.size > 1 || melodic.some((ns) => legatoOf(ns, smf))) return null;
  const notes = melodic.flat().sort((a, b) => a.tick - b.tick || b.key - a.key);
  const { voice, count } = voicesOf(notes.map((n) => ({ start: n.tick, end: n.end, key: n.key })));
  if (count <= melodic.length || count > MOST_VOICES) return null;
  const names = VOICE_NAMES[count] ?? Array.from({ length: count }, (_, v) => `voice${v + 1}`);
  const channel = notes[0]!.channel;
  const voices = names.map((name, v) => ({ name, notes: notes.filter((_, i) => voice[i] === v).map((n) => ({ ...n, channel })), bends: [], programs: [] }));
  const drums = smf.tracks.flatMap((t) => (t.notes.some((n) => n.channel === 10) ? [{ ...t, notes: t.notes.filter((n) => n.channel === 10) }] : []));
  return { ...smf, tracks: [...voices.filter((v) => v.notes.length), ...drums] };
}

/** A piece in sections (#346) reads as its form: taken when at most this much longer than the shortest fold without, as
 * a phrase said as a phrase is (`STRUCTURE`, engine/fold). Measured: at 1.05 one piece of the MIDI library takes
 * sections, at 1.15 seven (the library 1 % longer), at 1.2 eleven (and the examples 3 % longer). */
const SECTIONS = 1.15;

/** Steps as a braid, a run of one written `x!n`. */
function runsOf(steps: readonly string[]): string {
  const out: string[] = [];
  for (let i = 0; i < steps.length;) {
    let n = 1;
    while (i + n < steps.length && steps[i + n] === steps[i]) n++;
    out.push(n === 1 ? steps[i]! : `${steps[i]}!${n}`);
    i += n;
  }
  return out.join(' ');
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
