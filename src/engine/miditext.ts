/**
 * A MIDI file as text (#307): what the code editor shows of a `.mid`, and what is saved back as one. The file as it is,
 * readably: a header, the tempo map, then a track at a time, a line an event at its place in bars and beats.
 *
 * ```
 * midi format=1 ppq=480 name="Bach, Prelude and Fugue in C minor"
 * copyright "Typeset by … (CC BY-SA 4.0)"   (the file's copyright notice, if it has one)
 * tempo 1:1:0 107.9
 * meter 1:1:0 4/4
 *
 * track "saw"
 * 1:1:0 ch1 C5 120 v90        (a note: where, channel, key, ticks it lasts, velocity)
 * 1:1:120 ch1 Eb4 120 v90
 * program 1:1:0 ch1 81
 * bend 3:2:0 ch1 8192
 * ```
 *
 * A place is bar:beat:tick, from 1:1:0, through the time signatures (`meter`, 4/4 until the first); a key a name (C4 is
 * middle C, 60; sharps or flats) or a number. Lines starting `#` are comments. `isMidiText` tells such a text from a
 * piece's code: its first line that isn't blank or a comment starts `midi`. Pure: text in, `Smf` out, and back.
 */
import type { Diagnostic } from './ast';
import type { Smf, SmfNote, SmfTrack } from './midifile';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A key's name: 60 is C4. */
export const keyName = (key: number): string => `${NAMES[key % 12]}${Math.floor(key / 12) - 1}`;

/** A key from its name (C4, C#4, Db4, Cb4, B#3 …) or its number; null if it is neither, or out of 0–127. */
export function keyOf(word: string): number | null {
  const n = /^\d+$/.test(word) ? Number(word) : null;
  if (n !== null) return n <= 127 ? n : null;
  const m = /^([A-Ga-g])([#b]*)(-?\d+)$/.exec(word);
  if (!m) return null;
  const key = STEPS[m[1].toUpperCase()] + [...m[2]].reduce((a, c) => a + (c === '#' ? 1 : -1), 0) + 12 * (Number(m[3]) + 1);
  return key >= 0 && key <= 127 ? key : null;
}

/** A line without its comment: from a `#` at its start or after a space, not one in quotes (a name, a notice) nor in a
 * key (`C#4`). */
function uncommented(line: string): string {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === '#' && !quoted && (i === 0 || /\s/.test(line[i - 1]!))) return line.slice(0, i);
  }
  return line;
}

/** Is this text a MIDI file's (its first line that isn't blank or a comment starts `midi`)? */
export function isMidiText(text: string): boolean {
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    return /^midi(\s|$)/.test(t);
  }
  return false;
}

/** Places in bars and beats, through a file's time signatures. */
class Bars {
  /** Each signature from its tick: its bar number there, ticks a beat, beats a bar. */
  readonly #at: { tick: number; bar: number; beat: number; beats: number }[] = [];
  constructor(
    readonly ppq: number,
    meters: readonly { tick: number; num: number; den: number }[],
  ) {
    for (const m of [{ tick: 0, num: 4, den: 4 }, ...meters]) this.add(m.tick, m.num, m.den);
  }
  /** A signature from `tick` on (after those already added). */
  add(tick: number, num: number, den: number): void {
    const last = this.#at[this.#at.length - 1];
    const beat = (this.ppq * 4) / den;
    if (last && tick === last.tick) this.#at.pop();
    const prev = this.#at[this.#at.length - 1];
    // (a signature mid-bar starts a bar there: the bar before is short)
    const bar = prev ? prev.bar + Math.ceil((tick - prev.tick) / (prev.beat * prev.beats) - 1e-9) : 1;
    this.#at.push({ tick, bar, beat, beats: num });
  }
  #seg(tick: number) {
    let s = this.#at[0];
    for (const m of this.#at) if (m.tick <= tick) s = m;
    return s;
  }
  place(tick: number): string {
    const s = this.#seg(tick);
    const rel = tick - s.tick;
    const barTicks = s.beat * s.beats;
    const bar = s.bar + Math.floor(rel / barTicks);
    const inBar = rel - Math.floor(rel / barTicks) * barTicks;
    const beat = Math.floor(inBar / s.beat);
    return `${bar}:${beat + 1}:${+(inBar - beat * s.beat).toFixed(3)}`;
  }
  /** A place's tick; null if it isn't one. */
  tick(place: string): number | null {
    const m = /^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(place);
    if (!m) return null;
    const [bar, beat, tick] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (bar < 1 || beat < 1) return null;
    let s = this.#at[0];
    for (const x of this.#at) if (x.bar <= bar) s = x;
    return Math.round(s.tick + (bar - s.bar) * s.beat * s.beats + (beat - 1) * s.beat + tick);
  }
}

/** A MIDI file as text: its header, tempos and meters, then its tracks. `file`: its name, said in the first comment. */
export function midiText(smf: Smf, file?: string): string {
  const bars = new Bars(smf.ppq, smf.meters);
  const quote = (s: string) => `"${s.replace(/"/g, "'")}"`;
  const lines = [
    `# ${file ? `${file}: ` : ''}a MIDI file, as text: a line a note (where in bar:beat:tick, its channel, key, ticks and velocity).`,
    '# It plays as it is; edit it, save it (a .mid again), or convert it to cells: a piece written out, for Shorten to fold.',
    `midi format=${smf.format} ppq=${smf.ppq}${smf.name !== undefined ? ` name=${quote(smf.name)}` : ''}`,
    ...(smf.copyright !== undefined ? [`copyright ${quote(smf.copyright)}`] : []),
    ...smf.tempos.map((t) => `tempo ${bars.place(t.tick)} ${+(60e6 / t.micros).toFixed(4)}`),
    ...smf.meters.map((m) => `meter ${bars.place(m.tick)} ${m.num}/${m.den}`),
  ];
  for (const t of smf.tracks) {
    lines.push('', `track${t.name !== undefined ? ` ${quote(t.name)}` : ''}`);
    const events: { tick: number; order: number; text: string }[] = [
      ...t.programs.map((p) => ({ tick: p.tick, order: 0, text: `program ${bars.place(p.tick)} ch${p.channel} ${p.program}` })),
      ...t.bends.map((b) => ({ tick: b.tick, order: 1, text: `bend ${bars.place(b.tick)} ch${b.channel} ${b.value}` })),
      ...t.notes.map((n) => ({ tick: n.tick, order: 2, text: `${bars.place(n.tick)} ch${n.channel} ${keyName(n.key)} ${n.end - n.tick} v${n.velocity}` })),
    ];
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    for (const e of events) lines.push(e.text);
  }
  return lines.join('\n') + '\n';
}

/**
 * A MIDI file's text as the file: what each line says, and a diagnostic for each line that says nothing it can read
 * (an error: the line is left out; the rest is read).
 */
export function parseMidiText(text: string): { smf: Smf; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const error = (line: number, message: string, len = 1) => diagnostics.push({ severity: 'error', message, span: { line, col: 1, len } });
  let format = 1;
  let ppq = 480;
  let name: string | undefined;
  let copyright: string | undefined;
  const tempos: { tick: number; micros: number }[] = [];
  const meters: { tick: number; num: number; den: number }[] = [];
  const tracks: { name?: string; notes: SmfNote[]; bends: SmfTrack['bends'][number][]; programs: SmfTrack['programs'][number][] }[] = [];
  let bars: Bars | null = null;
  let headed = false;
  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = uncommented(raw).trim();
    if (!line) return;
    const words = line.split(/\s+/);
    const len = raw.trimEnd().length || 1;
    const quoted = /"([^"]*)"/.exec(line)?.[1];
    if (words[0] === 'midi') {
      if (headed) return error(n, 'a second midi line: only the first says the file', len);
      headed = true;
      for (const w of words.slice(1)) {
        const [k, v] = w.split('=');
        if (k === 'format' && /^[012]$/.test(v)) format = Number(v);
        else if (k === 'ppq' && /^\d+$/.test(v) && Number(v) > 0) ppq = Number(v);
      }
      name = quoted;
      bars = new Bars(ppq, []);
      return;
    }
    if (words[0] === 'copyright') {
      if (quoted === undefined) return error(n, 'copyright "…": the notice in quotes', len);
      copyright = quoted;
      return;
    }
    if (!bars) {
      bars = new Bars(ppq, []);
      error(n, 'no midi line before this: read at 480 ticks a quarter note', len);
    }
    const ch = (w: string | undefined) => {
      const c = /^ch(\d+)$/.exec(w ?? '');
      return c && Number(c[1]) >= 1 && Number(c[1]) <= 16 ? Number(c[1]) : null;
    };
    if (words[0] === 'tempo' || words[0] === 'meter') {
      const tick = bars.tick(words[1] ?? '');
      if (tick === null) return error(n, `${words[0]}: where? (bar:beat:tick, as 1:1:0)`, len);
      if (words[0] === 'tempo') {
        const bpm = Number(words[2]);
        if (!(bpm > 0)) return error(n, 'tempo: how fast? (beats a minute, as 120)', len);
        tempos.push({ tick, micros: Math.round(60e6 / bpm) });
      } else {
        const m = /^(\d+)\/(\d+)$/.exec(words[2] ?? '');
        if (!m || !(Number(m[1]) > 0) || !/^(1|2|4|8|16|32|64)$/.test(m[2])) return error(n, 'meter: which? (as 4/4, 3/4, 6/8)', len);
        meters.push({ tick, num: Number(m[1]), den: Number(m[2]) });
        bars.add(tick, Number(m[1]), Number(m[2]));
      }
      return;
    }
    if (words[0] === 'track') {
      tracks.push({ ...(quoted !== undefined ? { name: quoted } : {}), notes: [], bends: [], programs: [] });
      return;
    }
    if (!tracks.length) tracks.push({ notes: [], bends: [], programs: [] });
    const track = tracks[tracks.length - 1];
    if (words[0] === 'program' || words[0] === 'bend') {
      const tick = bars.tick(words[1] ?? '');
      const c = ch(words[2]);
      const v = Number(words[3]);
      const most = words[0] === 'program' ? 127 : 16383;
      if (tick === null || c === null || !Number.isInteger(v) || v < 0 || v > most)
        return error(n, `${words[0]}: as ${words[0]} 1:1:0 ch1 ${words[0] === 'program' ? 81 : 8192}`, len);
      if (words[0] === 'program') track.programs.push({ tick, channel: c, program: v });
      else track.bends.push({ tick, channel: c, value: v });
      return;
    }
    // a note: place, channel, key, ticks, velocity
    const tick = bars.tick(words[0]);
    const c = ch(words[1]);
    const key = keyOf(words[2] ?? '');
    const dur = Number(words[3]);
    const vel = /^v(\d+)$/.exec(words[4] ?? '');
    if (tick === null) return error(n, 'not a line a MIDI file has: a note starts with its place, as 1:1:0', len);
    if (c === null) return error(n, 'a note: which channel? (ch1 to ch16)', len);
    if (key === null) return error(n, 'a note: which key? (C4, F#3, Bb5, or 0 to 127)', len);
    if (!(Number.isInteger(dur) && dur > 0)) return error(n, 'a note: how many ticks long? (as 120)', len);
    const velocity = vel ? Number(vel[1]) : 100;
    if (!(velocity >= 1 && velocity <= 127)) return error(n, 'a note: how hard? (v1 to v127)', len);
    track.notes.push({ channel: c, key, velocity, tick, end: tick + dur });
  });
  for (const t of tracks) t.notes.sort((a, b) => a.tick - b.tick || a.channel - b.channel || a.key - b.key);
  tempos.sort((a, b) => a.tick - b.tick);
  return { smf: { format, ppq, ...(name !== undefined ? { name } : {}), ...(copyright !== undefined ? { copyright } : {}), tracks, tempos, meters }, diagnostics };
}
