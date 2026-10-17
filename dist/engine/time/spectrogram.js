import { fft } from "./fft.js";
const AUDIBLE = [20, 20000];
export function peaks(samples, columns) {
    const out = new Float32Array(2 * columns);
    for (let c = 0; c < columns; c++) {
        const from = Math.floor((c / columns) * samples.length);
        const to = Math.max(from + 1, Math.floor(((c + 1) / columns) * samples.length));
        let lo = 0;
        let hi = 0;
        for (let i = from; i < Math.min(to, samples.length); i++) {
            lo = Math.min(lo, samples[i]);
            hi = Math.max(hi, samples[i]);
        }
        out[2 * c] = lo;
        out[2 * c + 1] = hi;
    }
    return out;
}
export function waterfall(samples, rate, { frames = 512, size = 4096, perOctave = 12 } = {}) {
    const freqs = [];
    for (let f = AUDIBLE[0]; f <= Math.min(AUDIBLE[1], rate / 2); f *= Math.pow(2, 1 / perOctave))
        freqs.push(f);
    const edge = (b) => freqs[b] * Math.pow(2, -0.5 / perOctave);
    const rows = freqs.map(() => new Float32Array(frames));
    const times = [];
    const hann = Float64Array.from({ length: size }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size));
    for (let f = 0; f < frames; f++) {
        const centre = Math.floor(((f + 0.5) / frames) * samples.length);
        times.push(centre / rate);
        const re = new Float64Array(size);
        const im = new Float64Array(size);
        for (let i = 0; i < size; i++)
            re[i] = (samples[centre - size / 2 + i] ?? 0) * hann[i];
        fft(re, im);
        const bin = (hz) => (hz * size) / rate;
        for (let b = 0; b < freqs.length; b++) {
            const lo = bin(edge(b));
            const hi = bin(edge(b) * Math.pow(2, 1 / perOctave));
            let power = 0;
            if (Math.floor(hi) <= Math.ceil(lo))
                power = re[Math.round(bin(freqs[b]))] ** 2 + im[Math.round(bin(freqs[b]))] ** 2;
            else
                for (let k = Math.ceil(lo); k < hi && k < size / 2; k++)
                    power += re[k] ** 2 + im[k] ** 2;
            rows[b][f] = 10 * Math.log10(power / size + 1e-12);
        }
    }
    return { freqs, times, rows };
}
export function owners(w, notes, voices, { harmonics = 32, tail = 0.15 } = {}) {
    const bands = w.freqs.length;
    const frames = w.times.length;
    const owner = new Uint8Array(bands * frames);
    if (!bands || !frames)
        return owner;
    const best = new Float32Array(bands * frames);
    const index = new Map(voices.slice(0, 254).map((v, i) => [v, i + 1]));
    const perOctave = Math.log(2) / Math.log(w.freqs[1] / w.freqs[0] || 2);
    const frameAt = (t) => {
        let lo = 0;
        let hi = frames;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (w.times[mid] < t)
                lo = mid + 1;
            else
                hi = mid;
        }
        return lo;
    };
    for (const e of notes) {
        const who = index.get(e.voice);
        if (!who || !(e.freq > 0))
            continue;
        const level = e.gains ? (e.gains[0] + e.gains[1]) / 2 || 1 : 1;
        const to = frameAt(e.at + e.dur + tail);
        for (let k = 1; k <= harmonics; k++) {
            const b = Math.round(Math.log2((k * e.freq) / w.freqs[0]) * perOctave);
            if (b < 0)
                continue;
            if (b >= bands)
                break;
            const weight = level / k;
            for (let f = frameAt(e.at); f < to; f++) {
                const at = b * frames + f;
                if (weight > best[at]) {
                    best[at] = weight;
                    owner[at] = who;
                }
            }
        }
    }
    return owner;
}
