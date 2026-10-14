/**
 * Voices (docs/notes/disassembler.md, *Voices*): a keyboard part's notes as the voices a fugue is written in, not the
 * hands that play them. Measured on the MIDI library against the voices its typesetters wrote (midi/<set>/voices/), the
 * same notes a line a voice fold 6 % shorter than a line a hand, a sinfonia's 10–20 %: a subject stays in one line,
 * whichever hand plays it. Pure.
 *
 * After Chew & Wu's contig mapping (2004), on line: as many voices as notes ever sound at once; at each moment, the
 * notes that start there go to the voices free then, in order (the highest to the highest free voice: voices don't
 * cross where they need not), the order that moves each voice least from where it last was; a voice not heard yet
 * starts from its place in the first moment all of them sound (a fugue's voices enter one at a time, each in its
 * register).
 */

/** A note to give a voice: when it starts and ends (any unit), its pitch. */
export interface Voiced {
  readonly start: number;
  readonly end: number;
  readonly key: number;
}

/** What a voice not heard yet costs, beyond its distance from its register: a voice goes on before a new one starts. */
const NEW = 7;
/** What crossing a voice that is sounding costs: a voice goes above the one above it, below the one below. */
const CROSS = 12;

/** More notes than voices may sound this share of the time (a cadence's chord): a voice holds two there. Measured
 * against the voices written (tools/disasm, 29 pieces of 3 voices or more): at 0 (the most that ever sound) a fugue's
 * cadences add voices that aren't there, agreement 96 % / 91 %; at 0.06 every count is the typesetter's but one,
 * 96 % / 93 %. */
const THICK = 0.06;

/** As many voices as notes sound at once, but for the thickest moments (`THICK` of the time; a note's end and another's
 * start at one moment don't overlap). */
export function voiceCount(notes: readonly Voiced[]): number {
  const edges = notes.flatMap((n) => [
    [n.start, 1],
    [n.end, -1],
  ]);
  edges.sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
  // (how long each number of notes sounds)
  const time = new Map<number, number>();
  let now = 0;
  for (let i = 0; i < edges.length; i++) {
    now += edges[i]![1]!;
    const next = edges[i + 1]?.[0] ?? edges[i]![0]!;
    time.set(now, (time.get(now) ?? 0) + next - edges[i]![0]!);
  }
  const total = [...time.values()].reduce((a, b) => a + b, 0);
  let count = Math.max(0, ...time.keys());
  let thicker = 0;
  while (count > 1 && thicker + (time.get(count) ?? 0) <= THICK * total) thicker += time.get(count--) ?? 0;
  return count;
}

/** Each note's voice (0 the highest), and how many voices. */
export function voicesOf(notes: readonly Voiced[]): { voice: number[]; count: number } {
  const count = voiceCount(notes);
  const voice = new Array<number>(notes.length).fill(0);
  if (count <= 1) return { voice, count };
  const order = notes.map((_, i) => i).sort((a, b) => notes[a]!.start - notes[b]!.start || notes[b]!.key - notes[a]!.key);
  // (each voice's register: its pitch the first moment all of them sound, highest first; else spread over the notes')
  const register = registers(notes, order, count);
  const last: (number | null)[] = new Array(count).fill(null);
  const busy = new Array<number>(count).fill(-Infinity);
  const sounding = new Array<number>(count).fill(0);
  for (let g = 0; g < order.length;) {
    let h = g;
    const t = notes[order[g]!]!.start;
    while (h < order.length && notes[order[h]!]!.start === t) h++;
    const group = order.slice(g, h);
    const free = [...Array(count).keys()].filter((v) => busy[v]! <= t);
    // (more notes than free voices: a cadence's chord, or a note held over where a voice should be free: the
    // voices ending earliest take them too, and a group larger than all of them puts its lowest notes in the lowest
    // voice, a chord)
    for (const v of [...Array(count).keys()].filter((x) => !free.includes(x)).sort((a, b) => busy[a]! - busy[b]!)) {
      if (free.length >= group.length) break;
      free.push(v);
    }
    free.sort((a, b) => a - b);
    const extra = group.splice(free.length);
    const take = assign(
      group.map((i) => notes[i]!.key),
      free,
      (k, v) => {
        let c = last[v] === null ? NEW + Math.abs(k - register[v]!) : Math.abs(k - last[v]!);
        // (a sounding voice above lower than this, or below higher: a crossing)
        for (let u = 0; u < count; u++) if (busy[u]! > t && ((u < v && sounding[u]! < k) || (u > v && sounding[u]! > k))) c += CROSS;
        return c;
      },
    );
    for (const i of extra) {
      const v = take[take.length - 1]!;
      voice[i] = v;
      busy[v] = Math.max(busy[v]!, notes[i]!.end);
    }
    group.forEach((i, j) => {
      const v = take[j]!;
      voice[i] = v;
      last[v] = notes[i]!.key;
      sounding[v] = notes[i]!.key;
      busy[v] = Math.max(busy[v]!, notes[i]!.end);
    });
    g = h;
  }
  return { voice, count };
}

/** Each voice's register: the pitches sounding the first moment `count` notes do, highest first (else spread evenly
 * over the notes' range). */
function registers(notes: readonly Voiced[], order: readonly number[], count: number): number[] {
  for (const i of order) {
    const t = notes[i]!.start;
    const now = notes.filter((n) => n.start <= t && n.end > t).map((n) => n.key);
    if (now.length >= count) return now.sort((a, b) => b - a).slice(0, count);
  }
  const keys = notes.map((n) => n.key);
  const [hi, lo] = [Math.max(...keys), Math.min(...keys)];
  return Array.from({ length: count }, (_, v) => hi - ((hi - lo) * v) / (count - 1));
}

/**
 * Notes (highest first) to free voices (highest first), in order, each to its own: the injection that costs least
 * (a table over notes × voices; a few of each).
 */
function assign(keys: readonly number[], free: readonly number[], cost: (key: number, voice: number) => number): number[] {
  const [n, m] = [keys.length, free.length];
  // best[i][j]: the cheapest way to place notes i.. into voices j..
  const best = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity));
  for (let j = 0; j <= m; j++) best[n]![j] = 0;
  for (let i = n - 1; i >= 0; i--) for (let j = m - (n - i); j >= 0; j--) best[i]![j] = Math.min(best[i]![j + 1]!, cost(keys[i]!, free[j]!) + best[i + 1]![j + 1]!);
  const out: number[] = [];
  for (let i = 0, j = 0; i < n; j++) {
    if (best[i]![j] === cost(keys[i]!, free[j]!) + best[i + 1]![j + 1]!) {
      out.push(free[j]!);
      i++;
    }
  }
  return out;
}
