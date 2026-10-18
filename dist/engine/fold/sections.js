import { degreeOf, keyOf } from "./degrees.js";
const SWITCH = 12;
const SHORTEST = 2;
const pitched = (c) => c.values.map(Number).filter((v) => Number.isInteger(v));
function within(lines, from, to) {
    return lines.map((l) => ({ ...l, length: to - from, chords: l.chords.filter((c) => c.at >= from && c.at < to).map((c) => ({ ...c, at: c.at - from })) }));
}
export function keyAreas(lines, bar) {
    const length = Math.max(0, ...lines.map((l) => l.length));
    const bars = Math.ceil(length / bar);
    const collections = [];
    for (let t = 0; t < 12; t++)
        collections.push(keyOf('major', t), keyOf('harmonic', t), keyOf('melodic', t));
    const cost = Array.from({ length: bars }, () => new Array(collections.length).fill(0));
    for (const l of lines)
        for (const c of l.chords)
            for (const p of pitched(c)) {
                const b = Math.min(bars - 1, Math.floor(c.at / bar));
                collections.forEach((k, i) => (cost[b][i] += Math.abs(degreeOf(k, p).alter)));
            }
    if (!bars)
        return [];
    const best = cost.map(() => new Array(collections.length).fill(0));
    const from = cost.map(() => new Array(collections.length).fill(0));
    best[0] = [...cost[0]];
    for (let b = 1; b < bars; b++) {
        const prev = best[b - 1];
        let low = 0;
        for (let i = 1; i < prev.length; i++)
            if (prev[i] < prev[low])
                low = i;
        for (let i = 0; i < collections.length; i++) {
            const stay = prev[i];
            const move = prev[low] + SWITCH;
            [best[b][i], from[b][i]] = stay <= move ? [stay + cost[b][i], i] : [move + cost[b][i], low];
        }
    }
    const path = new Array(bars);
    let at = 0;
    for (let i = 1; i < collections.length; i++)
        if (best[bars - 1][i] < best[bars - 1][at])
            at = i;
    for (let b = bars - 1; b >= 0; b--) {
        path[b] = at;
        at = from[b][at];
    }
    const runs = [];
    for (let b = 0; b < bars; b++) {
        const last = runs[runs.length - 1];
        if (last && last.k === path[b])
            last.to = b + 1;
        else
            runs.push({ from: b, to: b + 1, k: path[b] });
    }
    const merged = [];
    for (const r of runs) {
        const last = merged[merged.length - 1];
        if (last && (r.to - r.from < SHORTEST || last.to - last.from < SHORTEST)) {
            if (r.to - r.from > last.most)
                [last.k, last.most] = [r.k, r.to - r.from];
            last.to = r.to;
        }
        else
            merged.push({ ...r, most: r.to - r.from });
    }
    const sections = merged.map((r) => {
        const [from, to] = [r.from * bar, Math.min(length, r.to * bar)];
        const k = collections[r.k];
        if (k.name !== 'major')
            return { from, to, key: k };
        const part = within(lines, from, to).flatMap((l) => l.chords.filter((c) => pitched(c).length));
        const bassAt = (at) => {
            const here = part.filter((c) => c.at === at);
            return here.length ? ((Math.min(...here.flatMap(pitched)) % 12) + 12) % 12 : null;
        };
        const ends = part.length ? [bassAt(Math.min(...part.map((c) => c.at))), bassAt(Math.max(...part.map((c) => c.at)))] : [];
        const minor = (k.tonic + 9) % 12;
        return { from, to, key: ends.includes(minor) && !ends.includes(k.tonic) ? keyOf('minor', minor) : k };
    });
    const minor = (k) => k.name !== 'major';
    const out = [];
    for (const s of sections) {
        const last = out[out.length - 1];
        const same = last && last.key.tonic === s.key.tonic && (last.key.name === s.key.name || (minor(last.key) && minor(s.key)));
        if (last && same)
            out[out.length - 1] = { from: last.from, to: s.to, key: s.to - s.from > last.to - last.from ? s.key : last.key };
        else
            out.push(s);
    }
    return out;
}
export function cutLines(lines, sections, bar) {
    const out = [];
    for (const l of lines) {
        const free = (s) => !l.chords.some((c) => c.at < s && c.at + c.dur > s);
        const cut = (s) => {
            for (let d = 0; d <= bar; d++) {
                if (s + d <= l.length && free(s + d))
                    return s + d;
                if (s - d >= 0 && free(s - d))
                    return s - d;
            }
            return null;
        };
        const cuts = [0];
        for (const s of sections.slice(1)) {
            const c = cut(s.from);
            if (c !== null && c > cuts[cuts.length - 1])
                cuts.push(c);
            else
                cuts.push(cuts[cuts.length - 1]);
        }
        cuts.push(l.length);
        sections.forEach((_, i) => {
            const [from, to] = [cuts[i], cuts[i + 1]];
            if (to <= from)
                return;
            out.push({
                line: l.name,
                section: i,
                part: { name: `${l.name}§${i}`, length: to - from, chords: l.chords.filter((c) => c.at >= from && c.at < to).map((c) => ({ ...c, at: c.at - from })) },
            });
        });
    }
    return out;
}
