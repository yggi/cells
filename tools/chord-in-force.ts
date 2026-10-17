/**
 * The chord in force (#95): how a line reads the chord sounding now, measured on E33's 384 bars
 * (`fixtures/jambot-chord-in-force.json`, lifted from yggi/jambot). The probe of a proposal,
 * `docs/notes/95-chord-in-force.md`; it changes nothing in `src/`.
 *
 * Every bass, pad and stab note E33 states as a degree of the key is restated over the harmony line, as an index
 * into the chord sounding at its onset: `i` a tone of the chord (past its last tone, the chord a lap up: the key's
 * seven degrees), `i#`/`ib` a degree of the key above or below one (an accidental on a number moves a step of the
 * table below, decision 015). A note no index reaches stays a degree of the key, and so does its line. Then:
 *
 * - **today**: the restated lines read `over=&harm` as cells reads it now (the braid of chords flattened, as turned),
 *   and cells plays them;
 * - **in force**: the same numbers read as the chord in force (options 1 to 3 of the note share this meaning), lowered
 *   back to degrees of the key by the chord sounding at each onset, and cells plays the lowering;
 * - **in force, integers**: what Strudel's `n(…).chord(…).voicing()` can say (option 4): an index with no accidental.
 *
 * Each is counted over the bar texts (E33's own, one bar each) and over section texts (a run's bars as one text, cut
 * where the key changes), where the harmony is a braid of many chords.
 *
 * `node --experimental-transform-types --no-warnings --import ./tools/node-ts.mjs tools/chord-in-force.ts` prints the
 * tables; `tools/chord-in-force.slow.test.ts` holds them.
 */
import { readFileSync } from 'node:fs';
import { planOf, windowAt } from '../src/index.ts';
import { channelTable, midiNote, router, routesOf } from '../src/engine/midi.ts';
import { SCALES, mod, pitchOfName, scan } from '../src/theory/modes.ts';

export type Part = 'bass' | 'pad' | 'stab';
export const PARTS: readonly Part[] = ['bass', 'pad', 'stab'];

/** A bar of the fixture: its lines by name, its chords ([step, pitch classes]) and notes ([part, step, key, length]). */
export interface Bar {
  readonly run: string;
  readonly bar: number;
  readonly steps: number;
  readonly lines: Readonly<Record<string, string>>;
  readonly chords: readonly (readonly [number, readonly number[]])[];
  readonly next: readonly number[] | null;
  readonly notes: readonly (readonly [Part, number, number, number])[];
}

export const BARS: readonly Bar[] = JSON.parse(readFileSync(new URL('../fixtures/jambot-chord-in-force.json', import.meta.url), 'utf8')).bars;

/** A tone as written: a number and its accidental (a step of the table below, `#` up, `b` down). */
export interface Tone {
  readonly n: number;
  readonly alter: number;
}
/** A word of a line: its tones (a stack, one, or none for a rest) and its length in steps. */
export interface Word {
  readonly tones: readonly Tone[];
  readonly length: number;
}

const tone = (t: string): Tone => {
  const m = /^(-?\d+)(#*|b*)$/.exec(t.trim());
  if (!m) throw new Error(`not a tone: ${t}`);
  return { n: Number(m[1]), alter: m[2]!.startsWith('#') ? m[2]!.length : -m[2]!.length };
};

/** The words of a braid as E33 writes it: `7@10`, `[0,2,4]@16`, `~@3`, `-1#`. */
export function wordsOf(body: string): Word[] {
  return body
    .trim()
    .split(/\s+/)
    .map((w) => {
      const m = /^(~|\[[^\]]+\]|-?\d+[#b]*)(?:@(\d+))?$/.exec(w);
      if (!m) throw new Error(`not a word: ${w}`);
      const head = m[1]!;
      const tones = head === '~' ? [] : head.startsWith('[') ? head.slice(1, -1).split(',').map(tone) : [tone(head)];
      return { tones, length: m[2] ? Number(m[2]) : 1 };
    });
}

const toneText = (t: Tone) => `${t.n}${(t.alter < 0 ? 'b' : '#').repeat(Math.abs(t.alter))}`;
const held = (text: string, length: number) => (length === 1 ? text : `${text}@${length}`);
/** A word as cells writes it. */
export const wordText = (w: Word) => held(w.tones.length === 0 ? '~' : w.tones.length === 1 ? toneText(w.tones[0]!) : `[${w.tones.map(toneText).join(',')}]`, w.length);

/** A line's braid after `step=…`. */
const bodyOf = (line: string) => line.replace(/^&\w+ over=&key step=\S+ /, '');

/** The key: its tonic's pitch class and its scale's positions on the 12. */
export interface Key {
  readonly tonic: number;
  readonly positions: readonly number[];
}
export function keyOf(line: string): Key {
  const m = /scale\((\w+), ([A-G][#b]?)\)/.exec(line);
  if (!m) throw new Error(`not a key: ${line}`);
  return { tonic: mod(pitchOfName(m[2]!)!, 12), positions: scan(SCALES[m[1]!]!.steps).positions };
}

/** Where each part's degrees count from: its voice (E33's pins: the bass from C1, the comp from C3). */
const VOICE: Readonly<Record<Part, number>> = { bass: 24, pad: 48, stab: 48 };

/** A degree of the key from a voice, raised `semis` steps of the 12: a MIDI key. */
export const keyPitch = (key: Key, voice: number, degree: number, semis = 0) => {
  const n = key.positions.length;
  return voice + key.tonic + key.positions[mod(degree, n)]! + 12 * Math.floor(degree / n) + semis;
};

/** Steps of a 16th grid per step of a harmony clock. */
const CLOCK: Readonly<Record<string, number>> = { '2n.': 12, '2n': 8, '4n.': 6, '4n': 4, '8n.': 3, '8n': 2, '16n': 1 };

/** A bar's chords as its harmony line states them: each from its step, its tones degrees of the key. */
export function chordsOf(bar: Bar): { at: number; tones: readonly Tone[] }[] {
  const line = bar.lines.harm!;
  const clock = /step=(\S+)/.exec(line)![1]!;
  const unit = clock === '1m' ? bar.steps : CLOCK[clock]!;
  const out: { at: number; tones: readonly Tone[] }[] = [];
  let at = 0;
  for (const w of wordsOf(bodyOf(line))) {
    if (w.tones.length) out.push({ at, tones: w.tones });
    at += w.length * unit;
  }
  return out;
}

/** The last of `xs` that `f` holds for. */
const lastOf = <T>(xs: readonly T[], f: (x: T) => boolean): T => {
  for (let i = xs.length - 1; i >= 0; i--) if (f(xs[i]!)) return xs[i]!;
  throw new Error('none');
};

const inForce = (chords: readonly { at: number; tones: readonly Tone[] }[], step: number) => lastOf(chords, (c) => c.at <= step + 1e-9).tones;

/** The order an index is looked for in: the accidental first (none, then one, then two), then the index nearest 0. */
const ALTERS = [0, 1, -1, 2, -2];
const INDICES = Array.from({ length: 41 }, (_, i) => (i % 2 ? (i + 1) / 2 : i && -i / 2));

/** What a key is, read through the chord in force: index i (the chord's tone, a lap of the key's degrees per chord), its accidental a degree of the key. */
export function throughChord(key: Key, voice: number, chord: readonly Tone[], index: Tone): { degree: number; semis: number } {
  const n = chord.length;
  const lap = Math.floor(index.n / n);
  const t = chord[index.n - lap * n]!;
  return { degree: t.n + lap * key.positions.length + index.alter, semis: t.alter };
}

/** The index into the chord in force that plays `midi`: none, or the first in ALTERS × INDICES. */
export function indexOf(key: Key, voice: number, chord: readonly Tone[], midi: number): Tone | null {
  for (const alter of ALTERS)
    for (const n of INDICES) {
      const d = throughChord(key, voice, chord, { n, alter });
      if (keyPitch(key, voice, d.degree, d.semis) === midi) return { n, alter };
    }
  return null;
}

/** What a note restated over the chord in force is: a tone of the chord, a degree of the key beside one, or neither. */
export type Kind = 'tone' | 'beside' | 'off';

/** A part's line in a bar, restated: its words over the chord in force (null if a note has no index), and each note's kind. */
export interface Restated {
  readonly part: Part;
  readonly key: readonly Word[];
  readonly chord: readonly Word[] | null;
  readonly kinds: readonly Kind[];
}

export function restate(bar: Bar, part: Part): Restated | null {
  const line = bar.lines[part];
  if (!line) return null;
  const key = keyOf(bar.lines.key!);
  const chords = chordsOf(bar);
  const words = wordsOf(bodyOf(line));
  const kinds: Kind[] = [];
  let at = 0;
  let ok = true;
  const chord = words.map((w) => {
    const c = inForce(chords, at);
    const tones = w.tones.map((t) => {
      const i = indexOf(key, VOICE[part], c, keyPitch(key, VOICE[part], t.n, t.alter));
      kinds.push(i === null ? 'off' : i.alter === 0 ? 'tone' : 'beside');
      if (i === null) ok = false;
      return i ?? t;
    });
    at += w.length;
    return { tones, length: w.length };
  });
  return { part, key: words, chord: ok ? chord : null, kinds };
}

/** Restated words lowered back to degrees of the key, through the chord sounding at each onset: what "in force" means. */
export function lower(bar: Bar, part: Part, words: readonly Word[]): Word[] {
  const key = keyOf(bar.lines.key!);
  const chords = chordsOf(bar);
  let at = 0;
  return words.map((w) => {
    const c = inForce(chords, at);
    at += w.length;
    return {
      length: w.length,
      tones: w.tones.map((i) => {
        const d = throughChord(key, VOICE[part], c, i);
        // (the chord's own accidental is a step of the 12; written over the key it is a degree's)
        return { n: d.degree, alter: d.semis };
      }),
    };
  });
}

// ---- playing a text and reading it back

const CHANNEL: Readonly<Record<Part, number>> = { bass: 2, pad: 3, stab: 3 };
const VOICE_LINES = ['&bassV loop=C1', '&compV loop=C3', '&lap step=1m 0', '&lapV loop=C4'];

/** A text's notes as cells plays them: [channel, step on the 16th grid, MIDI key], over `bars` bars of `steps`. */
export function cellsPlays(lines: readonly string[], parts: readonly Part[], steps: number, bars = 1): { notes: string[]; diagnostics: string[] } {
  const bass = parts.includes('bass') ? '[&bass * &bassV]' : '~';
  const comp = parts.filter((p) => p !== 'bass').map((p) => `&${p} * &compV`);
  const card = `&out map=midi ~ ${bass} ${comp.length ? `[${comp.join(', ')}]` : '~'} ~!11 [&lap * &lapV]`;
  const plan = planOf([...lines, ...VOICE_LINES, card].join('\n'));
  const route = router(plan.result, channelTable(plan.result));
  const played = windowAt(plan, 0, 4 * bars * 4).events.flatMap((e) =>
    routesOf(route(e)).flatMap((r) => {
      const n = midiNote(e, r);
      return n ? [n] : [];
    }),
  );
  const laps = played.filter((n) => n.channel === 15).map((n) => n.at);
  const bar = laps.find((at) => at > 0)!;
  const step = bar / steps;
  return {
    notes: played.filter((n) => n.channel !== 15 && n.at < bar * bars - 1e-9).map((n) => `${n.channel} ${Math.round(n.at / step)} ${n.note}`),
    diagnostics: plan.result.diagnostics.map((d) => d.message),
  };
}

/** How many of `want` are in `got`, as multisets. */
export function matched(want: readonly string[], got: readonly string[]): number {
  const left = new Map<string, number>();
  for (const g of got) left.set(g, (left.get(g) ?? 0) + 1);
  let n = 0;
  for (const w of want) {
    const k = left.get(w) ?? 0;
    if (k > 0) {
      n++;
      left.set(w, k - 1);
    }
  }
  return n;
}

const bandNotes = (bars: readonly Bar[], offset: (b: Bar) => number) => bars.flatMap((b) => b.notes.map(([part, step, key]) => `${CHANNEL[part]} ${offset(b) + step} ${key}`));

// ---- the readings

/** How a line restated over the chord in force is written, for one reading. */
export type Reading = 'e33' | 'today' | 'inForce' | 'integers';
export const READINGS: readonly Reading[] = ['e33', 'today', 'inForce', 'integers'];

/** A part's words and the table its line reads, for a reading: over the chord where the reading can say every note, else E33's. */
function lineFor(bar: Bar, r: Restated, reading: Reading): { over: 'key' | 'harm'; words: readonly Word[] } {
  const usable = r.chord && (reading === 'today' || reading === 'inForce' || (reading === 'integers' && r.kinds.every((k) => k === 'tone')));
  if (!usable) return { over: 'key', words: r.key };
  return reading === 'today' ? { over: 'harm', words: r.chord! } : { over: 'key', words: lower(bar, r.part, r.chord!) };
}

/** A line as text: E33's spelling, over the key or over the harmony. */
const lineText = (part: Part, over: 'key' | 'harm', words: readonly Word[]) => `&${part} over=&${over} step=16n ${words.map(wordText).join(' ')}`;

/** One bar under a reading: the lines cells plays, and the notes it plays that are the band's. */
export function barUnder(bar: Bar, reading: Reading) {
  const restated = PARTS.map((p) => restate(bar, p)).filter((r): r is Restated => r !== null);
  const lines = [
    bar.lines.bar!,
    bar.lines.key!,
    bar.lines.harm!,
    ...restated.map((r) => {
      const l = lineFor(bar, r, reading);
      return lineText(r.part, l.over, l.words);
    }),
  ];
  const played = cellsPlays(
    lines,
    restated.map((r) => r.part),
    bar.steps,
  );
  const want = bandNotes([bar], () => 0);
  return { lines, want: want.length, matched: matched(want, played.notes), diagnostics: played.diagnostics };
}

/** A run's bars cut into sections where the key changes. */
export function sections(bars: readonly Bar[] = BARS): Bar[][] {
  const out: Bar[][] = [];
  for (const b of bars) {
    const last = out.at(-1);
    if (last && last[0]!.run === b.run && last[0]!.lines.key === b.lines.key && last.at(-1)!.bar === b.bar - 1) last.push(b);
    else out.push([b]);
  }
  return out;
}

/**
 * A section's harmony as one braid: a chord a bar on `1m`, or on `2n` where a bar holds two. A whole bar's chord there
 * is written `@2`; played, it is stated twice, since a stepped table turns once a step whatever its `@` and `!` say.
 */
export function sectionHarmony(section: readonly Bar[], played = false): string {
  const split = section.some((b) => /step=2n /.test(b.lines.harm!));
  const words = section.map((b) => {
    const body = bodyOf(b.lines.harm!);
    return split && /step=1m /.test(b.lines.harm!) ? (played ? `${body} ${body}` : `${body}@2`) : body;
  });
  return `&harm over=&key step=${split ? '2n' : '1m'} ${words.join(' ')}`;
}

/** Bars that repeat the bar before, written once with `!k` (a bar of several words as one, `[…]@steps!k`); the others as they are. */
export function collapsed(chunks: readonly (readonly Word[])[], steps: number): string {
  const text = chunks.map((c) => c.map(wordText).join(' '));
  const out: string[] = [];
  for (let i = 0; i < text.length;) {
    let k = 1;
    while (text[i + k] === text[i]) k++;
    out.push(k === 1 ? text[i]! : chunks[i]!.length === 1 ? `${text[i]}!${k}` : `[${text[i]}]@${steps}!${k}`);
    i += k;
  }
  return out.join(' ');
}

/** One section under a reading: a part's line over the chord only where every bar of it can be; the notes cells plays that are the band's; characters as written. */
export function sectionUnder(section: readonly Bar[], reading: Reading) {
  const steps = section[0]!.steps;
  const parts = PARTS.filter((p) => section.some((b) => b.lines[p]));
  const rest: Word[] = [{ tones: [], length: steps }];
  const lines: string[] = [];
  const chars: Record<string, number> = {};
  const overChord: Part[] = [];
  for (const part of parts) {
    const per = section.map((b) => (b.lines[part] ? { bar: b, r: restate(b, part)! } : null));
    // a section line reads one table: over the chord only if every bar of it can be
    const chord = reading !== 'e33' && per.every((x) => !x || (x.r.chord && (reading !== 'integers' || x.r.kinds.every((k) => k === 'tone'))));
    if (chord) overChord.push(part);
    const written = per.map((x) => (!x ? rest : chord ? x.r.chord! : x.r.key));
    const playedWords = per.map((x, i) => (!x || !chord || reading === 'today' ? written[i]! : lower(x.bar, part, x.r.chord!)));
    const over = chord && reading === 'today' ? 'harm' : 'key';
    lines.push(`&${part} over=&${over} step=16n ${collapsed(playedWords, steps)}`);
    chars[part] = `&${part} over=&${chord ? 'harm' : 'key'} step=16n ${collapsed(written, steps)}`.length + 1;
  }
  const head = [section[0]!.lines.bar!, section[0]!.lines.key!, sectionHarmony(section, true)];
  const played = cellsPlays([...head, ...lines], parts, steps, section.length);
  const first = section[0]!.bar;
  const want = bandNotes(section, (b) => (b.bar - first) * steps);
  return { lines: [...head, ...lines], want: want.length, matched: matched(want, played.notes), chars, overChord, diagnostics: played.diagnostics };
}

// ---- counts

/** Every note restated: how many are tones of the chord sounding, a degree of the key beside one, or neither; per part. */
export function kinds(bars: readonly Bar[] = BARS): Record<Part, Record<Kind, number>> {
  const out = Object.fromEntries(PARTS.map((p) => [p, { tone: 0, beside: 0, off: 0 }])) as Record<Part, Record<Kind, number>>;
  for (const b of bars) for (const p of PARTS) for (const k of restate(b, p)?.kinds ?? []) out[p][k]++;
  return out;
}

/** The notes whose pitch class is in the chord Jambot composed at their step (E33's own count, from the fixture's chords). */
export function chordTonesComposed(bars: readonly Bar[] = BARS): Record<Part, [number, number]> {
  const out = { bass: [0, 0], pad: [0, 0], stab: [0, 0] } as Record<Part, [number, number]>;
  for (const b of bars)
    for (const [part, step, key] of b.notes) {
      const pcs = lastOf(b.chords, ([at]) => at <= step)[1];
      out[part][1]++;
      if (pcs.includes(mod(key, 12))) out[part][0]++;
    }
  return out;
}

/** Notes off the chord sounding that are tones of the next bar's first chord (#50's next chord), per part. */
export function nextChordTones(bars: readonly Bar[] = BARS): Record<Part, number> {
  const out = { bass: 0, pad: 0, stab: 0 };
  for (const b of bars)
    for (const [part, step, key] of b.notes) {
      const pcs = lastOf(b.chords, ([at]) => at <= step)[1];
      if (!pcs.includes(mod(key, 12)) && b.next?.includes(mod(key, 12))) out[part]++;
    }
  return out;
}

/** Lines (a part in a bar): how many each reading can state over the chord. */
export function linesOverChord(bars: readonly Bar[] = BARS) {
  let lines = 0;
  let any = 0;
  let integers = 0;
  for (const b of bars)
    for (const p of PARTS) {
      const r = restate(b, p);
      if (!r) continue;
      lines++;
      if (r.chord) any++;
      if (r.chord && r.kinds.every((k) => k === 'tone')) integers++;
    }
  return { lines, any, integers };
}

/** Characters of the bass, pad and stab lines in the bar texts: E33's, and restated over the chord where a line can be (with `over=&harm`, or `over=&harm[0]`, three more). */
export function barCharacters(bars: readonly Bar[] = BARS) {
  let e33 = 0;
  let chord = 0;
  let integers = 0;
  let lines = 0;
  for (const b of bars)
    for (const p of PARTS) {
      const r = restate(b, p);
      if (!r) continue;
      const key = lineText(p, 'key', r.key).length + 1;
      e33 += key;
      chord += r.chord ? lineText(p, 'harm', r.chord).length + 1 : key;
      integers += r.chord && r.kinds.every((k) => k === 'tone') ? lineText(p, 'harm', r.chord).length + 1 : key;
      if (r.chord) lines++;
    }
  return { e33, chord, pick: chord + 3 * lines, integers };
}

/** Distinct bars of each part's line over a section, as E33 writes them and over the chord: what a section text states at least once. */
export function distinctBars(secs: readonly (readonly Bar[])[] = sections()) {
  let key = 0;
  let chord = 0;
  for (const s of secs)
    for (const p of PARTS) {
      const rs = s.map((b) => restate(b, p)).filter((r): r is Restated => r !== null);
      key += new Set(rs.map((r) => r.key.map(wordText).join(' '))).size;
      chord += new Set(rs.map((r) => (r.chord ?? r.key).map(wordText).join(' '))).size;
    }
  return { key, chord };
}

/** The harmony's characters: E33's stacks, a bar each or a section's braid; and option 3's chord cells (each chord stated once a text, named). */
export function harmonyCharacters(secs: readonly (readonly Bar[])[] = sections()) {
  const cellsOf = (bars: readonly Bar[], harm: string) => {
    const stacks = [
      ...new Set(
        bars.flatMap((b) =>
          wordsOf(bodyOf(b.lines.harm!))
            .filter((w) => w.tones.length)
            .map((w) => wordText({ ...w, length: 1 })),
        ),
      ),
    ];
    const names = new Map(stacks.map((s, i) => [s, `&c${i}`]));
    const line = harm.replace(/\[[^\]]+\]/g, (s) => names.get(s)!);
    return stacks.reduce((n, s) => n + `${names.get(s)} over=&key ${s}`.length + 1, 0) + line.length + 1;
  };
  let bar = 0;
  let barCells = 0;
  let section = 0;
  let sectionCells = 0;
  for (const s of secs) {
    for (const b of s) {
      bar += b.lines.harm!.length + 1;
      barCells += cellsOf([b], b.lines.harm!);
    }
    const h = sectionHarmony(s);
    section += h.length + 1;
    sectionCells += cellsOf(s, h);
  }
  return { bar, barCells, section, sectionCells };
}

/**
 * The comp's stacks over the chord in force: how many are close (consecutive indices, no accidental), and how many
 * one anchor would choose as Strudel's `voicing()` does in its `below` mode (the close stack of as many tones whose
 * top note is the highest at or under the anchor), for the anchor that chooses most.
 */
export function anchorVoicings(bars: readonly Bar[] = BARS) {
  let stacks = 0;
  let close = 0;
  const chosen = new Map<number, number>();
  for (const b of bars)
    for (const p of ['pad', 'stab'] as const) {
      const r = restate(b, p);
      if (!r?.chord) continue;
      const key = keyOf(b.lines.key!);
      const chords = chordsOf(b);
      let at = 0;
      for (const [i, w] of r.chord.entries()) {
        const chord = inForce(chords, at);
        at += w.length;
        if (w.tones.length < 2) continue;
        stacks++;
        if (w.tones.every((t, j) => t.alter === 0 && (j === 0 || t.n === w.tones[j - 1]!.n + 1))) close++;
        const pitch = (n: number) => {
          const d = throughChord(key, VOICE[p], chord, { n, alter: 0 });
          return keyPitch(key, VOICE[p], d.degree, d.semis);
        };
        const want = r.key[i]!.tones.map((t) => keyPitch(key, VOICE[p], t.n, t.alter))
          .sort((x, y) => x - y)
          .join(' ');
        const m = w.tones.length;
        for (let anchor = 55; anchor <= 84; anchor++) {
          const top = INDICES.filter((n) => pitch(n + m - 1) <= anchor).reduce((x, y) => Math.max(x, y), -Infinity);
          if (top === -Infinity) continue;
          const v = Array.from({ length: m }, (_, j) => pitch(top + j)).join(' ');
          if (v === want) chosen.set(anchor, (chosen.get(anchor) ?? 0) + 1);
        }
      }
    }
  const [anchor, count] = [...chosen].sort((x, y) => y[1] - x[1] || x[0] - y[0])[0]!;
  return { stacks, close, anchor, count };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const secs = sections();
  console.log('chord tones composed', JSON.stringify(chordTonesComposed()));
  console.log('kinds', JSON.stringify(kinds()));
  console.log('next chord tones', JSON.stringify(nextChordTones()));
  console.log('lines over chord', JSON.stringify(linesOverChord()));
  console.log('bar characters', JSON.stringify(barCharacters()));
  console.log('distinct bars', JSON.stringify(distinctBars(secs)));
  console.log('harmony characters', JSON.stringify(harmonyCharacters(secs)));
  console.log('anchor voicings', JSON.stringify(anchorVoicings()));
  console.log(
    'section lines over the chord',
    JSON.stringify(Object.fromEntries(READINGS.map((r) => [r, secs.reduce((n, s) => n + sectionUnder(s, r).overChord.length, 0)]))),
    'of',
    secs.reduce((n, s) => n + PARTS.filter((p) => s.some((b) => b.lines[p])).length, 0),
  );
  for (const reading of READINGS) {
    const bars = BARS.map((b) => barUnder(b, reading));
    const ss = secs.map((s) => sectionUnder(s, reading));
    const sum = (xs: { want: number; matched: number }[]) => [xs.reduce((n, x) => n + x.matched, 0), xs.reduce((n, x) => n + x.want, 0)];
    const chars = ss.reduce((n, s) => n + Object.values(s.chars).reduce((a, b) => a + b, 0), 0);
    console.log(
      reading,
      'bars',
      JSON.stringify(sum(bars)),
      'bars equal',
      bars.filter((b) => b.matched === b.want).length,
      'sections',
      secs.length,
      JSON.stringify(sum(ss)),
      'sections equal',
      ss.filter((s) => s.matched === s.want).length,
      'section chars',
      chars,
      'diagnostics',
      bars.reduce((n, b) => n + b.diagnostics.length, 0) + ss.reduce((n, s) => n + s.diagnostics.length, 0),
    );
  }
}
