import { DOUGH_SOURCES } from "./dough-params.js";
import { cellId } from "./ids.js";
import { grainOffset, noise, NOISE_SECONDS } from "./noise.js";
import { outputSounds } from "./realize.js";
import { harmonics, waveform } from "./wave.js";
export const DEFAULT_RATE = 48000;
export const RATES = { lowest: 8000, highest: 192000 };
const LATER = {
    room: 'R2',
    delay: 'R2',
    delaytime: 'R2',
    delayfeedback: 'R2',
    distort: 'R2',
    crush: 'R2',
    fm: 'R2',
    body: 'R3',
    ring: 'R3',
    hard: 'R3',
    board: 'R3',
    couple: 'R3',
    coupling: 'R3',
    excite: 'R3',
};
const FILTER = ['lpf', 'lpq', 'hpf', 'hpq'];
const BLOCK = 32;
const NOTE_PEAK = 0.35;
const NOISE_PEAK = 2.8;
const VOICE_GAIN = 0.4;
const ARTICULATION = 0.9;
const DEFAULT_ENV = { attack: 0.005, decay: 0.1, sustain: 1, release: 0.05 };
class Auto {
    initial;
    events = [];
    j = -1;
    start;
    constructor(initial) {
        this.initial = initial;
        this.start = initial;
    }
    cancel(at) {
        this.events = this.events.filter((e) => e.at < at);
        if (this.j >= this.events.length)
            this.j = this.events.length - 1;
    }
    push(e) {
        let i = this.events.length;
        while (i > 0 && this.events[i - 1].at > e.at)
            i--;
        this.events.splice(i, 0, e);
    }
    segment(t) {
        const e = this.events[this.j];
        const n = this.events[this.j + 1];
        const t0 = e ? e.at : 0;
        if (n && (n.kind === 'lin' || n.kind === 'exp') && n.at > t0) {
            const x = Math.min(1, Math.max(0, (t - t0) / (n.at - t0)));
            if (n.kind === 'exp' && this.start > 0 && n.value > 0)
                return this.start * Math.pow(n.value / this.start, x);
            return this.start + (n.value - this.start) * x;
        }
        if (e?.kind === 'target')
            return e.value + (this.start - e.value) * Math.exp(-(t - e.at) / Math.max(1e-6, e.tau ?? 0));
        return this.start;
    }
    at(t) {
        while (this.j + 1 < this.events.length && this.events[this.j + 1].at <= t) {
            const next = this.events[this.j + 1];
            const before = this.j < 0 && next.kind !== 'set' ? this.initial : this.segment(next.at);
            this.j++;
            this.start = next.kind === 'target' ? before : next.value;
        }
        return this.segment(t);
    }
}
const TABLE = 2048;
const MOST_HARMONICS = TABLE / 2 - 1;
const SINES = (() => {
    const s = new Float64Array(TABLE);
    for (let i = 0; i < TABLE; i++)
        s[i] = Math.sin((2 * Math.PI * i) / TABLE);
    return s;
})();
function waveOf(real, imag) {
    const top = Math.max(1, Math.min(MOST_HARMONICS, Math.max(real.length, imag.length) - 1));
    const levels = Math.ceil(Math.log2(top)) + 1;
    const raw = [];
    for (let l = 0; l < levels; l++) {
        const most = Math.min(top, 2 ** l);
        const t = new Float64Array(TABLE);
        for (let k = 1; k <= most; k++) {
            const a = real[k] ?? 0;
            const b = imag[k] ?? 0;
            if (!a && !b)
                continue;
            for (let i = 0; i < TABLE; i++) {
                const p = (k * i) % TABLE;
                t[i] += a * SINES[(p + TABLE / 4) % TABLE] + b * SINES[p];
            }
        }
        raw.push(t);
    }
    const full = raw[raw.length - 1];
    let peak = 0;
    for (let i = 0; i < TABLE; i++)
        peak = Math.max(peak, Math.abs(full[i]));
    const scale = peak > 0 ? 1 / peak : 0;
    return { tables: raw.map((t) => Float32Array.from(t, (v) => v * scale)) };
}
function builtin(type) {
    const n = type === 'sine' ? 1 : MOST_HARMONICS;
    const imag = new Float64Array(n + 1);
    for (let k = 1; k <= n; k++)
        imag[k] =
            type === 'sine'
                ? 1
                : type === 'sawtooth'
                    ? (2 / (Math.PI * k)) * (k % 2 ? 1 : -1)
                    : type === 'square'
                        ? (2 / (Math.PI * k)) * (1 - (k % 2 ? -1 : 1))
                        : (8 * Math.sin((Math.PI * k) / 2)) / (Math.PI * k) ** 2;
    return waveOf(new Float64Array(n + 1), imag);
}
const BUILTIN = new Map();
const builtinWave = (type) => {
    let w = BUILTIN.get(type);
    if (!w)
        BUILTIN.set(type, (w = builtin(type)));
    return w;
};
function tableFor(w, freq, rate) {
    const allowed = Math.floor(rate / 2 / Math.abs(freq));
    if (!(allowed >= 1))
        return null;
    const l = Math.min(w.tables.length - 1, Math.floor(Math.log2(allowed)));
    return w.tables[l];
}
class Biquad {
    type;
    b0 = 1;
    b1 = 0;
    b2 = 0;
    a1 = 0;
    a2 = 0;
    z1 = [0, 0];
    z2 = [0, 0];
    constructor(type) {
        this.type = type;
    }
    set(freq, q, rate) {
        const f = Math.min(Math.max(freq, 1), rate / 2 - 1);
        const w0 = (2 * Math.PI * f) / rate;
        const cos = Math.cos(w0);
        const alpha = Math.sin(w0) / (2 * Math.pow(10, q / 20));
        const a0 = 1 + alpha;
        const low = this.type === 'lowpass';
        this.b0 = (low ? (1 - cos) / 2 : (1 + cos) / 2) / a0;
        this.b1 = (low ? 1 - cos : -(1 + cos)) / a0;
        this.b2 = this.b0;
        this.a1 = (-2 * cos) / a0;
        this.a2 = (1 - alpha) / a0;
    }
    run(x, ch) {
        const y = this.b0 * x + this.z1[ch];
        this.z1[ch] = this.b1 * x - this.a1 * y + this.z2[ch];
        this.z2[ch] = this.b2 * x - this.a2 * y;
        return y;
    }
}
const finite = (x) => Number.isFinite(x);
function envelopeAt(n, t) {
    const { attack, decay, sustain } = n.env;
    const open = (u) => {
        if (u < 0)
            return 0;
        if (u < attack)
            return (n.peak * u) / attack;
        const s = n.peak * sustain;
        return decay > 0 ? s + (n.peak - s) * Math.exp(-(u - attack) / (decay / 3)) : s;
    };
    if (t < n.gateEnd)
        return open(t - n.at);
    return open(n.gateEnd - n.at) * Math.exp(-(t - n.gateEnd) / (Math.max(n.env.release, 0.005) / 3));
}
function schedule(auto, key, track, time, dur) {
    const freq = key === 'lpf' || key === 'hpf';
    const v = (x) => (freq ? Math.max(1, x) : x);
    const ramp = freq ? 'exp' : 'lin';
    auto.cancel(time);
    if (track.kind === 'points') {
        track.points.forEach((x, i) => {
            if (!finite(x.at) || !finite(x.value))
                return;
            auto.push({ at: Math.max(time, x.at), value: v(x.value), kind: i > 0 && x.ramp ? ramp : 'set' });
        });
        return;
    }
    const { from, peak, attack, decay, sustain, release } = track;
    const hold = from + (peak - from) * sustain;
    const held = time + Math.max(dur, attack + decay + 0.003);
    auto.push({ at: time, value: v(from), kind: 'set' });
    auto.push({ at: time + Math.max(0.001, attack), value: v(peak), kind: ramp });
    auto.push({ at: time + Math.max(0.002, attack + decay), value: v(hold), kind: ramp });
    auto.push({ at: held, value: v(hold), kind: 'set' });
    auto.push({ at: held + Math.max(0.005, release), value: v(from), kind: ramp });
}
function pitchShape(track, time, dur) {
    const a = new Auto(0);
    if (track.kind === 'points') {
        track.points.forEach((x, i) => {
            if (finite(x.at) && finite(x.value))
                a.push({ at: Math.max(time, x.at), value: x.value, kind: i > 0 && x.ramp ? 'lin' : 'set' });
        });
        return a;
    }
    const { from, peak, attack, decay, sustain, release } = track;
    const hold = from + (peak - from) * sustain;
    if (attack > 0) {
        a.push({ at: time, value: from, kind: 'set' });
        a.push({ at: time + attack, value: peak, kind: 'lin' });
    }
    else
        a.push({ at: time, value: peak, kind: 'set' });
    a.push({ at: time + Math.max(0.002, attack + decay), value: hold, kind: 'lin' });
    const end = time + Math.max(dur, attack + decay + 0.003);
    a.push({ at: end, value: hold, kind: 'set' });
    if (hold !== from)
        a.push({ at: end + Math.max(0.005, release), value: from, kind: 'lin' });
    return a;
}
function heardVoices(result, muted) {
    const off = (name) => muted.has(cellId(name));
    return new Set(result.outputs
        .filter((o) => !o.silent && outputSounds(result, o, muted))
        .flatMap((o) => (o.kit ? [o.voice, ...[...(result.cells.get(o.voice)?.children.keys() ?? [])].filter((m) => !off(m))] : [o.voice])));
}
export function createRenderer(result, shifts, options = {}) {
    const rate = options.sampleRate ?? DEFAULT_RATE;
    if (!(rate >= RATES.lowest && rate <= RATES.highest))
        throw new RangeError(`a render's sample rate is ${RATES.lowest} to ${RATES.highest} Hz, not ${rate}`);
    const muted = options.muted ?? result.off;
    const tracks = options.tracks ?? 'mix';
    const heard = heardVoices(result, muted);
    const card = [...result.cells.values()].find((c) => c.sink);
    const master = typeof card?.params.postgain === 'number' ? card.params.postgain : 1;
    const diagnostics = [];
    const said = new Set();
    const say = (voice, param, message) => {
        const key = `${voice}\u0000${param}`;
        if (said.has(key))
            return;
        said.add(key);
        diagnostics.push({ voice, param, message });
    };
    if (result.tapes.length)
        for (const t of result.tapes)
            say(t.name, 'write', `&${t.name} is a tape, which a render sounds from stage R3: left out`);
    const voices = new Map();
    const voiceOf = (name) => {
        const known = voices.get(name);
        if (known)
            return known;
        const c = result.cells.get(name);
        if (!c?.voice)
            return null;
        for (const k of Object.keys(c.params))
            if (LATER[k])
                say(name, k, `&${name}'s ${k}= is sounded from stage ${LATER[k]}: rendered without it`);
        for (const k of Object.keys(c.paramCells ?? {}))
            if (LATER[k])
                say(name, k, `&${name}'s ${k}= is sounded from stage ${LATER[k]}: rendered without it`);
        const src = c.params.s !== undefined ? DOUGH_SOURCES[String(c.params.s)] : null;
        const isNoise = src === 'white' || src === 'pink' || src === 'brown';
        let wave = null;
        if (src && !isNoise)
            wave = builtinWave(src);
        else if (!src) {
            const { real, imag } = harmonics(waveform(result, name, shifts));
            wave = waveOf(real, imag);
        }
        const moves = c.paramCells ?? {};
        const start = (k, d) => (typeof c.params[k] === 'number' ? c.params[k] : (moves[k]?.range?.[0] ?? d));
        const filters = {};
        const autos = {};
        if (typeof c.params.lpf === 'number' || moves.lpf) {
            filters.lpf = new Biquad('lowpass');
            autos.lpf = new Auto(start('lpf', 2000));
            autos.lpq = new Auto(start('lpq', 1));
        }
        if (typeof c.params.hpf === 'number' || moves.hpf) {
            filters.hpf = new Biquad('highpass');
            autos.hpf = new Auto(start('hpf', 200));
            autos.hpq = new Auto(start('hpq', 1));
        }
        const v = {
            name,
            seed: c.seed,
            wave,
            noise: isNoise ? noise(src, rate) : null,
            filters,
            autos,
            notes: [],
            dry: [new Float64Array(BLOCK), new Float64Array(BLOCK)],
        };
        voices.set(name, v);
        return v;
    };
    const stems = tracks === 'voices' ? [...result.cells.values()].filter((c) => c.voice && heard.has(c.name)).map((c) => c.name) : [];
    let position = 0;
    const add = (events) => {
        const sorted = [...events].sort((a, b) => a.at - b.at || (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : 0) || a.freq - b.freq || a.dur - b.dur);
        for (const e of sorted) {
            if (e.unheard || !heard.has(e.voice))
                continue;
            if (!finite(e.at) || !finite(e.dur) || !finite(e.freq))
                continue;
            const v = voiceOf(e.voice);
            if (!v)
                continue;
            const c = result.cells.get(e.voice);
            if (typeof c.params.body === 'string')
                continue;
            const [g0, g1] = e.gains;
            const size = Math.max(Math.abs(g0), Math.abs(g1));
            if (!(size > 0))
                continue;
            const level = g0 + g1 < 0 ? -size : size;
            const pan = (4 / Math.PI) * Math.atan2(Math.abs(g1), Math.abs(g0)) - 1;
            const x = ((pan + 1) / 2) * (Math.PI / 2);
            const env = e.env ?? DEFAULT_ENV;
            const dur = Math.max(0.02, e.held ? e.dur : e.dur * ARTICULATION);
            const gateEnd = e.at + dur;
            const end = gateEnd + env.release * 4 + 0.05;
            const levels = e.levels.filter((l) => finite(l.at) && finite(l.level));
            let lvl = null;
            if (levels.length > 1 || (levels[0] && levels[0].level !== 1)) {
                lvl = new Auto(1);
                lvl.push({ at: e.at, value: levels[0]?.level ?? 1, kind: 'set' });
                for (const l of levels.slice(1))
                    lvl.push(l.ramp ? { at: l.at, value: l.level, kind: 'lin' } : { at: l.at, value: l.level, kind: 'target', tau: 0.004 });
            }
            const bends = e.bends.filter((b) => finite(b.at) && finite(b.cents));
            let cents = null;
            if (bends.length) {
                cents = new Auto(0);
                cents.push({ at: e.at, value: 0, kind: 'set' });
                for (const b of bends)
                    cents.push({ at: b.at, value: b.cents, kind: b.ramp ? 'lin' : 'set' });
            }
            const params = e.params ?? {};
            const semis = params.pitch ? pitchShape(params.pitch, e.at, dur) : null;
            for (const k of FILTER) {
                const track = params[k];
                const auto = v.autos[k];
                if (track && auto)
                    schedule(auto, k, track, e.at, dur);
            }
            for (const k of Object.keys(params))
                if (LATER[k] || k === 'index')
                    say(e.voice, k, `&${e.voice}'s moving ${k}= is sounded from stage R2: rendered without it`);
            const note = {
                start: Math.max(0, Math.ceil(e.at * rate - 1e-9)),
                at: e.at,
                end,
                gateEnd,
                peak: NOTE_PEAK * level * (v.noise ? NOISE_PEAK : 1),
                left: Math.cos(x),
                right: Math.sin(x),
                env,
                level: lvl,
                freq: e.freq,
                semis,
                cents,
                grain: v.noise ? Math.floor(grainOffset(v.seed, e.voice, e.code ?? e.at, NOISE_SECONDS) * rate) : 0,
                phase: 0,
            };
            let i = v.notes.length;
            while (i > 0 && v.notes[i - 1].at > note.at)
                i--;
            v.notes.splice(i, 0, note);
        }
    };
    const sound = (v, from, to, blockStart) => {
        const [dl, dr] = v.dry;
        dl.fill(0, from - blockStart, to - blockStart);
        dr.fill(0, from - blockStart, to - blockStart);
        for (const n of v.notes) {
            if (n.start >= to)
                break;
            const lastFrame = Math.ceil(n.end * rate);
            const a = Math.max(from, n.start);
            const b = Math.min(to, lastFrame);
            for (let f = a; f < b; f++) {
                const t = f / rate;
                if (f === n.start)
                    n.phase = 0;
                let s;
                if (v.noise)
                    s = v.noise[(n.grain + (f - n.start)) % v.noise.length];
                else {
                    let hz = n.freq;
                    if (n.semis)
                        hz *= Math.pow(2, n.semis.at(t) / 12);
                    if (n.cents)
                        hz *= Math.pow(2, n.cents.at(t) / 1200);
                    const table = tableFor(v.wave, hz, rate);
                    if (table) {
                        const p = n.phase * TABLE;
                        const i = Math.floor(p);
                        const frac = p - i;
                        const s0 = table[i % TABLE];
                        const s1 = table[(i + 1) % TABLE];
                        s = s0 + (s1 - s0) * frac;
                    }
                    else
                        s = 0;
                    n.phase += hz / rate;
                    n.phase -= Math.floor(n.phase);
                }
                let amp = envelopeAt(n, t);
                if (n.level)
                    amp *= n.level.at(t);
                const y = s * amp;
                dl[f - blockStart] += y * n.left;
                dr[f - blockStart] += y * n.right;
            }
        }
        const done = Math.ceil;
        v.notes = v.notes.filter((n) => done(n.end * rate) > to);
    };
    const filter = (v, from, to, blockStart) => {
        const t = blockStart / rate;
        for (const k of ['lpf', 'hpf']) {
            const bq = v.filters[k];
            if (!bq)
                continue;
            const q = k === 'lpf' ? 'lpq' : 'hpq';
            bq.set(v.autos[k].at(t), v.autos[q].at(t), rate);
            for (let f = from; f < to; f++) {
                const i = f - blockStart;
                v.dry[0][i] = bq.run(v.dry[0][i], 0);
                v.dry[1][i] = bq.run(v.dry[1][i], 1);
            }
        }
    };
    const render = (frames) => {
        const n = Math.max(0, Math.floor(frames));
        const mix = [new Float32Array(n), new Float32Array(n)];
        const stemOut = new Map(stems.map((s) => [s, [new Float32Array(n), new Float32Array(n)]]));
        const order = [...result.cells.values()].filter((c) => c.voice && heard.has(c.name)).map((c) => c.name);
        const end = position + n;
        for (let from = position; from < end;) {
            const blockStart = Math.floor(from / BLOCK) * BLOCK;
            const to = Math.min(end, blockStart + BLOCK);
            for (const name of order) {
                const v = voices.get(name);
                if (!v || (!v.notes.length && !v.filters.lpf && !v.filters.hpf))
                    continue;
                sound(v, from, to, blockStart);
                filter(v, from, to, blockStart);
                const stem = stemOut.get(name);
                for (let f = from; f < to; f++) {
                    const i = f - blockStart;
                    const l = v.dry[0][i] * VOICE_GAIN * master;
                    const r = v.dry[1][i] * VOICE_GAIN * master;
                    if (stem) {
                        stem[0][f - position] = l;
                        stem[1][f - position] = r;
                        mix[0][f - position] += stem[0][f - position];
                        mix[1][f - position] += stem[1][f - position];
                    }
                    else {
                        mix[0][f - position] += Math.fround(l);
                        mix[1][f - position] += Math.fround(r);
                    }
                }
            }
            from = to;
        }
        position = end;
        return { mix, stems: stemOut };
    };
    return {
        sampleRate: rate,
        stems,
        get position() {
            return position;
        },
        diagnostics,
        add,
        render,
    };
}
export function loudness(channels) {
    let sum = 0;
    let top = 0;
    let clipped = 0;
    let n = 0;
    for (const d of channels)
        for (let i = 0; i < d.length; i++) {
            const v = Math.abs(d[i]);
            sum += v * v;
            if (v > top)
                top = v;
            if (v >= 0.999)
                clipped++;
            n++;
        }
    const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
    return { rms: db(Math.sqrt(sum / Math.max(1, n))), peak: db(top), clipped };
}
