/**
 * Standard MIDI Files (#307), the pure part: a file's bytes into its notes, tempos and meters by track, and back. Format
 * 0 and 1 are read (2, independent sequences, as if 1); format 1 is written, a conductor track (tempos, meters, the
 * piece's name) first. What is read: notes (note-on with velocity 0 ends one, as note-off does; a key struck again
 * before it is let go ends the earlier strike), pitch bends, program changes, tempos, time signatures, track names.
 * Everything else (controllers, sysex, other metas) is skipped; format 1's conductor track (only tempos, meters, a name)
 * is the file's header, not a track. Times are ticks; `secondsAt` lays them through the
 * tempo map.
 */

/** A note: on a channel (1–16), a key (0–127) struck at a velocity (1–127), from one tick to another. */
export interface SmfNote {
  readonly channel: number;
  readonly key: number;
  readonly velocity: number;
  readonly tick: number;
  readonly end: number;
}

/** A track: its name, its notes by when they start, and its channels' bends (14-bit, 8192 the centre) and programs. */
export interface SmfTrack {
  readonly name?: string;
  readonly notes: readonly SmfNote[];
  readonly bends: readonly { readonly tick: number; readonly channel: number; readonly value: number }[];
  readonly programs: readonly { readonly tick: number; readonly channel: number; readonly program: number }[];
}

/**
 * A MIDI file: ticks a quarter note (`ppq`), its tracks, and the tempo map (microseconds a quarter from each tick on;
 * 500 000, 120 bpm, until the first) and time signatures, from whichever track they are in.
 */
export interface Smf {
  readonly format: number;
  readonly ppq: number;
  readonly name?: string;
  readonly tracks: readonly SmfTrack[];
  readonly tempos: readonly { readonly tick: number; readonly micros: number }[];
  readonly meters: readonly { readonly tick: number; readonly num: number; readonly den: number }[];
}

/** MIDI's tempo until a file says otherwise: 120 bpm. */
const DEFAULT_MICROS = 500_000;

/** Why a file can't be read. */
export class SmfError extends Error {}

/** Do these bytes start as a MIDI file does (MThd)? */
export const isMidi = (bytes: Uint8Array): boolean => bytes.length >= 4 && bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;

/** A file's bytes as a Smf. Throws SmfError when they aren't a MIDI file (or end too soon). */
export function readMidi(bytes: Uint8Array): Smf {
  let at = 0;
  const need = (n: number) => {
    if (at + n > bytes.length) throw new SmfError('the file ends too soon');
  };
  const u8 = () => (need(1), bytes[at++]);
  const u16 = () => (u8() << 8) | u8();
  const u32 = () => ((u16() << 16) >>> 0) + u16();
  const tag = () => String.fromCharCode(u8(), u8(), u8(), u8());
  const vlq = () => {
    let v = 0;
    for (let i = 0; i < 4; i++) {
      const b = u8();
      v = v * 128 + (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
    throw new SmfError('a length runs over four bytes');
  };
  const text = (n: number) => {
    need(n);
    const s = new TextDecoder('latin1').decode(bytes.subarray(at, at + n));
    at += n;
    return s;
  };

  if (bytes.length < 14 || tag() !== 'MThd') throw new SmfError('not a MIDI file (no MThd)');
  const headerLength = u32();
  const format = u16();
  const count = u16();
  const division = u16();
  at += headerLength - 6;
  // (SMPTE: frames a second × ticks a frame; read as ticks a quarter at a quarter a second)
  const smpte = division & 0x8000;
  const ppq = smpte ? (256 - (division >> 8)) * (division & 0xff) : division;
  if (!(ppq > 0)) throw new SmfError('no ticks a quarter note');

  const tracks: SmfTrack[] = [];
  const tempos: { tick: number; micros: number }[] = smpte ? [{ tick: 0, micros: 1_000_000 }] : [];
  const meters: { tick: number; num: number; den: number }[] = [];
  let name: string | undefined;
  for (let t = 0; t < count && at < bytes.length; t++) {
    const kind = tag();
    const length = u32();
    const end = at + length;
    if (kind !== 'MTrk') {
      at = end;
      continue;
    }
    if (end > bytes.length) throw new SmfError('a track runs past the end of the file');
    let tick = 0;
    let status = 0;
    let trackName: string | undefined;
    const notes: SmfNote[] = [];
    const bends: { tick: number; channel: number; value: number }[] = [];
    const programs: { tick: number; channel: number; program: number }[] = [];
    // (each sounding key's strikes, oldest first: a note-off ends the oldest)
    const held = new Map<number, { tick: number; velocity: number }[]>();
    const off = (channel: number, key: number, at: number) => {
      const k = channel * 128 + key;
      const s = held.get(k)?.shift();
      if (s) notes.push({ channel: channel + 1, key, velocity: s.velocity, tick: s.tick, end: at });
    };
    while (at < end) {
      tick += vlq();
      let b = u8();
      if (b === 0xff) {
        const type = u8();
        const n = vlq();
        if (type === 0x2f) {
          at = end;
          break;
        }
        if (type === 0x51 && n === 3 && !smpte) tempos.push({ tick, micros: (u8() << 16) | (u8() << 8) | u8() });
        else if (type === 0x58 && n >= 2) {
          const num = u8();
          const den = 2 ** u8();
          meters.push({ tick, num, den });
          at += n - 2;
        } else if (type === 0x03) {
          const s = text(n);
          trackName ??= s;
          if (t === 0) name ??= s;
        } else at += n;
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        at += vlq();
        continue;
      }
      // (running status: a data byte first repeats the last status)
      let first: number;
      if (b < 0x80) {
        if (!status) throw new SmfError('a running status with nothing before it');
        first = b;
        b = status;
      } else {
        status = b;
        first = u8();
      }
      const channel = b & 0x0f;
      switch (b & 0xf0) {
        case 0x80:
          u8();
          off(channel, first, tick);
          break;
        case 0x90: {
          const velocity = u8();
          if (velocity === 0) off(channel, first, tick);
          else {
            const k = channel * 128 + first;
            // (struck again while held: the earlier strike ends here)
            if (held.get(k)?.length) off(channel, first, tick);
            const list = held.get(k) ?? [];
            list.push({ tick, velocity });
            held.set(k, list);
          }
          break;
        }
        case 0xa0:
        case 0xb0:
          u8();
          break;
        case 0xc0:
          programs.push({ tick, channel: channel + 1, program: first });
          break;
        case 0xd0:
          break;
        case 0xe0:
          bends.push({ tick, channel: channel + 1, value: first | (u8() << 7) });
          break;
        default:
          throw new SmfError(`an unknown status byte ${b.toString(16)}`);
      }
    }
    at = end;
    // (a note never let go ends with its track)
    for (const [k, list] of held) for (const s of list) notes.push({ channel: (k >> 7) + 1, key: k & 127, velocity: s.velocity, tick: s.tick, end: tick });
    notes.sort((a, b) => a.tick - b.tick || a.channel - b.channel || a.key - b.key);
    tracks.push({ ...(trackName !== undefined ? { name: trackName } : {}), notes, bends, programs });
  }
  tempos.sort((a, b) => a.tick - b.tick);
  meters.sort((a, b) => a.tick - b.tick);
  // (format 1's first track with nothing but metas is its conductor: its tempos, meters and name are the file's)
  const first = tracks[0];
  if (format === 1 && first && !first.notes.length && !first.bends.length && !first.programs.length) tracks.shift();
  return { format, ppq, ...(name !== undefined ? { name } : {}), tracks, tempos, meters };
}

/** A Smf as the bytes of a format 1 file: a conductor track (the name, tempos, meters), then each track. */
export function writeMidi(smf: Smf): Uint8Array {
  const out: number[] = [];
  const u16 = (v: number) => out.push((v >> 8) & 0xff, v & 0xff);
  const u32 = (v: number) => (u16((v >>> 16) & 0xffff), u16(v & 0xffff));
  const vlq = (v: number, to: number[]) => {
    const bytes = [v & 0x7f];
    for (let x = Math.floor(v / 128); x > 0; x = Math.floor(x / 128)) bytes.unshift((x & 0x7f) | 0x80);
    to.push(...bytes);
  };
  const latin1 = (s: string) => Array.from(s, (c) => c.charCodeAt(0) & 0xff);
  /** One track's events (tick, order at that tick, bytes) as an MTrk chunk. */
  const chunk = (events: { tick: number; order: number; bytes: number[] }[]) => {
    events.sort((a, b) => a.tick - b.tick || a.order - b.order);
    const body: number[] = [];
    let last = 0;
    for (const e of events) {
      vlq(Math.max(0, e.tick - last), body);
      body.push(...e.bytes);
      last = Math.max(last, e.tick);
    }
    body.push(0x00, 0xff, 0x2f, 0x00);
    out.push(...latin1('MTrk'));
    u32(body.length);
    for (const b of body) out.push(b);
  };
  const meta = (type: number, data: number[]) => {
    const b = [0xff, type];
    vlq(data.length, b);
    return [...b, ...data];
  };

  out.push(...latin1('MThd'));
  u32(6);
  u16(1);
  u16(smf.tracks.length + 1);
  u16(Math.max(1, Math.min(0x7fff, Math.round(smf.ppq))));
  const conductor = [
    ...(smf.name !== undefined ? [{ tick: 0, order: 0, bytes: meta(0x03, latin1(smf.name)) }] : []),
    ...smf.tempos.map((t) => {
      const m = Math.max(1, Math.min(0xffffff, Math.round(t.micros)));
      return { tick: t.tick, order: 1, bytes: meta(0x51, [(m >> 16) & 0xff, (m >> 8) & 0xff, m & 0xff]) };
    }),
    ...smf.meters.map((m) => ({ tick: m.tick, order: 2, bytes: meta(0x58, [m.num, Math.round(Math.log2(m.den)), 24, 8]) })),
  ];
  chunk(conductor);
  for (const t of smf.tracks) {
    const ch = (c: number) => (Math.max(1, Math.min(16, c)) - 1) & 0x0f;
    chunk([
      ...(t.name !== undefined ? [{ tick: 0, order: 0, bytes: meta(0x03, latin1(t.name)) }] : []),
      ...t.programs.map((p) => ({ tick: p.tick, order: 1, bytes: [0xc0 | ch(p.channel), p.program & 0x7f] })),
      // (at one tick: notes end, then bends move, then notes start: a bend for a note sits before it)
      ...t.notes.map((n) => ({ tick: n.end, order: 2, bytes: [0x80 | ch(n.channel), n.key & 0x7f, 0x40] })),
      ...t.bends.map((b) => ({ tick: b.tick, order: 3, bytes: [0xe0 | ch(b.channel), b.value & 0x7f, (b.value >> 7) & 0x7f] })),
      ...t.notes.map((n) => ({ tick: n.tick, order: 4, bytes: [0x90 | ch(n.channel), n.key & 0x7f, Math.max(1, Math.min(127, n.velocity))] })),
    ]);
  }
  return Uint8Array.from(out);
}

/** When a tick falls, in seconds from the start: laid through the tempo map. */
export function secondsAt(smf: Pick<Smf, 'ppq' | 'tempos'>, tick: number): number {
  let seconds = 0;
  let from = 0;
  let micros = DEFAULT_MICROS;
  for (const t of smf.tempos) {
    if (t.tick >= tick) break;
    seconds += ((t.tick - from) * micros) / smf.ppq / 1e6;
    from = t.tick;
    micros = t.micros;
  }
  return seconds + ((tick - from) * micros) / smf.ppq / 1e6;
}
