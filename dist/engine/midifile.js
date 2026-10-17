const DEFAULT_MICROS = 500_000;
export class SmfError extends Error {
}
export const isMidi = (bytes) => bytes.length >= 4 && bytes[0] === 0x4d && bytes[1] === 0x54 && bytes[2] === 0x68 && bytes[3] === 0x64;
export function readMidi(bytes) {
    let at = 0;
    const need = (n) => {
        if (at + n > bytes.length)
            throw new SmfError('the file ends too soon');
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
            if (!(b & 0x80))
                return v;
        }
        throw new SmfError('a length runs over four bytes');
    };
    const text = (n) => {
        need(n);
        const raw = bytes.subarray(at, at + n);
        let s;
        try {
            s = new TextDecoder('utf-8', { fatal: true }).decode(raw);
        }
        catch {
            s = new TextDecoder('latin1').decode(raw);
        }
        at += n;
        return s;
    };
    if (bytes.length < 14 || tag() !== 'MThd')
        throw new SmfError('not a MIDI file (no MThd)');
    const headerLength = u32();
    const format = u16();
    const count = u16();
    const division = u16();
    at += headerLength - 6;
    const smpte = division & 0x8000;
    const ppq = smpte ? (256 - (division >> 8)) * (division & 0xff) : division;
    if (!(ppq > 0))
        throw new SmfError('no ticks a quarter note');
    const tracks = [];
    const tempos = smpte ? [{ tick: 0, micros: 1_000_000 }] : [];
    const meters = [];
    let name;
    let copyright;
    for (let t = 0; t < count && at < bytes.length; t++) {
        const kind = tag();
        const length = u32();
        const end = at + length;
        if (kind !== 'MTrk') {
            at = end;
            continue;
        }
        if (end > bytes.length)
            throw new SmfError('a track runs past the end of the file');
        let tick = 0;
        let status = 0;
        let trackName;
        const notes = [];
        const bends = [];
        const programs = [];
        const held = new Map();
        const off = (channel, key, at) => {
            const k = channel * 128 + key;
            const s = held.get(k)?.shift();
            if (s)
                notes.push({ channel: channel + 1, key, velocity: s.velocity, tick: s.tick, end: at });
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
                if (type === 0x51 && n === 3 && !smpte)
                    tempos.push({ tick, micros: (u8() << 16) | (u8() << 8) | u8() });
                else if (type === 0x58 && n >= 2) {
                    const num = u8();
                    const den = 2 ** u8();
                    meters.push({ tick, num, den });
                    at += n - 2;
                }
                else if (type === 0x02)
                    copyright ??= text(n);
                else if (type === 0x03) {
                    const s = text(n);
                    trackName ??= s;
                    if (t === 0)
                        name ??= s;
                }
                else
                    at += n;
                continue;
            }
            if (b === 0xf0 || b === 0xf7) {
                at += vlq();
                continue;
            }
            let first;
            if (b < 0x80) {
                if (!status)
                    throw new SmfError('a running status with nothing before it');
                first = b;
                b = status;
            }
            else {
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
                    if (velocity === 0)
                        off(channel, first, tick);
                    else {
                        const k = channel * 128 + first;
                        if (held.get(k)?.length)
                            off(channel, first, tick);
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
        for (const [k, list] of held)
            for (const s of list)
                notes.push({ channel: (k >> 7) + 1, key: k & 127, velocity: s.velocity, tick: s.tick, end: tick });
        notes.sort((a, b) => a.tick - b.tick || a.channel - b.channel || a.key - b.key);
        tracks.push({ ...(trackName !== undefined ? { name: trackName } : {}), notes, bends, programs });
    }
    tempos.sort((a, b) => a.tick - b.tick);
    meters.sort((a, b) => a.tick - b.tick);
    const first = tracks[0];
    if (format === 1 && first && !first.notes.length && !first.bends.length && !first.programs.length)
        tracks.shift();
    return { format, ppq, ...(name !== undefined ? { name } : {}), ...(copyright !== undefined ? { copyright } : {}), tracks, tempos, meters };
}
export function writeMidi(smf) {
    const out = [];
    const u16 = (v) => out.push((v >> 8) & 0xff, v & 0xff);
    const u32 = (v) => (u16((v >>> 16) & 0xffff), u16(v & 0xffff));
    const vlq = (v, to) => {
        const bytes = [v & 0x7f];
        for (let x = Math.floor(v / 128); x > 0; x = Math.floor(x / 128))
            bytes.unshift((x & 0x7f) | 0x80);
        to.push(...bytes);
    };
    const latin1 = (s) => Array.from(s, (c) => c.charCodeAt(0) & 0xff);
    const utf8 = (s) => [...new TextEncoder().encode(s)];
    const chunk = (events) => {
        events.sort((a, b) => a.tick - b.tick || a.order - b.order);
        const body = [];
        let last = 0;
        for (const e of events) {
            vlq(Math.max(0, e.tick - last), body);
            body.push(...e.bytes);
            last = Math.max(last, e.tick);
        }
        body.push(0x00, 0xff, 0x2f, 0x00);
        out.push(...latin1('MTrk'));
        u32(body.length);
        for (const b of body)
            out.push(b);
    };
    const meta = (type, data) => {
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
        ...(smf.name !== undefined ? [{ tick: 0, order: 0, bytes: meta(0x03, utf8(smf.name)) }] : []),
        ...(smf.copyright !== undefined ? [{ tick: 0, order: 0, bytes: meta(0x02, utf8(smf.copyright)) }] : []),
        ...smf.tempos.map((t) => {
            const m = Math.max(1, Math.min(0xffffff, Math.round(t.micros)));
            return { tick: t.tick, order: 1, bytes: meta(0x51, [(m >> 16) & 0xff, (m >> 8) & 0xff, m & 0xff]) };
        }),
        ...smf.meters.map((m) => ({ tick: m.tick, order: 2, bytes: meta(0x58, [m.num, Math.round(Math.log2(m.den)), 24, 8]) })),
    ];
    chunk(conductor);
    for (const t of smf.tracks) {
        const ch = (c) => (Math.max(1, Math.min(16, c)) - 1) & 0x0f;
        chunk([
            ...(t.name !== undefined ? [{ tick: 0, order: 0, bytes: meta(0x03, utf8(t.name)) }] : []),
            ...t.programs.map((p) => ({ tick: p.tick, order: 1, bytes: [0xc0 | ch(p.channel), p.program & 0x7f] })),
            ...t.notes.map((n) => ({ tick: n.end, order: 2, bytes: [0x80 | ch(n.channel), n.key & 0x7f, 0x40] })),
            ...t.bends.map((b) => ({ tick: b.tick, order: 3, bytes: [0xe0 | ch(b.channel), b.value & 0x7f, (b.value >> 7) & 0x7f] })),
            ...t.notes.map((n) => ({ tick: n.tick, order: 4, bytes: [0x90 | ch(n.channel), n.key & 0x7f, Math.max(1, Math.min(127, n.velocity))] })),
        ]);
    }
    return Uint8Array.from(out);
}
export function secondsAt(smf, tick) {
    let seconds = 0;
    let from = 0;
    let micros = DEFAULT_MICROS;
    for (const t of smf.tempos) {
        if (t.tick >= tick)
            break;
        seconds += ((t.tick - from) * micros) / smf.ppq / 1e6;
        from = t.tick;
        micros = t.micros;
    }
    return seconds + ((tick - from) * micros) / smf.ppq / 1e6;
}
