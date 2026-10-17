export function steps(x) {
    return x.marks.map((m, i) => (i + 1 < x.marks.length ? x.marks[i + 1] - m : x.n - m + x.marks[0]));
}
function primitive(s) {
    for (let p = 1; p < s.length; p++)
        if (s.length % p === 0 && s.every((v, i) => v === s[i % p]))
            return s.slice(0, p);
    return [...s];
}
export function canonical(x) {
    const s = primitive(steps(x));
    let best = s;
    for (let r = 1; r < s.length; r++) {
        const rot = [...s.slice(r), ...s.slice(0, r)];
        for (let k = 0; k < rot.length; k++)
            if (rot[k] !== best[k]) {
                if (rot[k] > best[k])
                    best = rot;
                break;
            }
    }
    return best.join(' ');
}
export function maximallyEven(x) {
    const k = x.marks.length;
    if (k < 2)
        return true;
    for (let d = 1; d < k; d++) {
        const sizes = new Set(x.marks.map((m, i) => (x.marks[(i + d) % k] - m + x.n) % x.n || x.n));
        if (sizes.size > 2 || Math.max(...sizes) - Math.min(...sizes) > 1)
            return false;
    }
    return true;
}
export function rhythm(onsets, cycle, pulse, from = 0) {
    const n = Math.round(cycle / pulse);
    if (n < 2 || Math.abs(n * pulse - cycle) > pulse / 4 || !onsets.length)
        return null;
    const hits = new Map();
    let turns = 0;
    for (const t of onsets) {
        const local = (t - from) / pulse;
        const slot = Math.round(local);
        if (Math.abs(local - slot) > 0.25)
            return null;
        const turn = Math.floor(slot / n);
        turns = Math.max(turns, turn + 1);
        const at = ((slot % n) + n) % n;
        if (!hits.has(at))
            hits.set(at, new Set());
        hits.get(at).add(turn);
    }
    const marks = [...hits].filter(([, ts]) => ts.size * 2 >= turns).map(([slot]) => slot);
    return marks.length ? { n, marks: marks.sort((a, b) => a - b) } : null;
}
export function pitchClasses(freqs) {
    const marks = new Set();
    for (const f of freqs)
        if (f > 0)
            marks.add((((Math.round(12 * Math.log2(f / 440)) + 9) % 12) + 12) % 12);
    return marks.size ? { n: 12, marks: [...marks].sort((a, b) => a - b) } : null;
}
export function pulseOf(onsets) {
    const sorted = [...onsets].sort((a, b) => a - b);
    const count = new Map();
    for (let i = 1; i < sorted.length; i++) {
        const gap = Math.round((sorted[i] - sorted[i - 1]) * 1000);
        if (gap > 0)
            count.set(gap, (count.get(gap) ?? 0) + 1);
    }
    let best = null;
    for (const [gap, c] of count)
        if (!best || c > best[1] || (c === best[1] && gap < best[0]))
            best = [gap, c];
    return best ? best[0] / 1000 : null;
}
export function levelsOf(spans, heard, longest, most = 64) {
    const pulses = spans.map((x) => x.step);
    if (heard && !pulses.some((q) => Math.abs(q / heard - 1) < 0.02))
        pulses.push(heard);
    const out = [];
    for (const c of spans) {
        if (!(c.turn <= longest))
            continue;
        for (const pulse of pulses) {
            const n = Math.round(c.turn / pulse);
            if (n < 3 || n > most || Math.abs(n * pulse - c.turn) > 0.02 * pulse)
                continue;
            if (!out.some((l) => Math.abs(l.cycle - c.turn) < 1e-6 && Math.abs(l.pulse - pulse) < 1e-6))
                out.push({ name: `&${c.name} in ${n}`, cycle: c.turn, pulse });
        }
    }
    return out;
}
export function foldings(events, levels) {
    const byVoice = new Map();
    for (const e of events) {
        const notes = byVoice.get(e.voice);
        if (notes)
            notes.push(e);
        else
            byVoice.set(e.voice, [e]);
    }
    const out = [];
    const keep = (voice, level, kind, pulse, x) => {
        if (!x || x.marks.length < 2 || x.marks.length >= x.n || new Set(steps(x)).size === 1)
            return;
        out.push({ voice, level, kind, pulse, necklace: x, name: canonical(x), even: maximallyEven(x) });
    };
    for (const [voice, notes] of byVoice) {
        const onsets = [...new Set(notes.map((e) => +e.at.toFixed(4)))];
        for (const l of levels)
            keep(voice, l.name, 'rhythm', l.pulse, rhythm(onsets, l.cycle, l.pulse));
        keep(voice, 'octave', 'pitch', 0, pitchClasses(notes.map((e) => e.freq)));
    }
    return out;
}
export function alike(fs) {
    const by = new Map();
    for (const f of fs)
        by.set(f.name, [...(by.get(f.name) ?? []), f]);
    return ([...by]
        .map(([name, where]) => ({ name, even: where[0].even, where }))
        .filter((g) => new Set(g.where.map((f) => `${f.kind}:${f.pulse > 0 ? Math.round(24 * Math.log2(f.pulse)) : 0}`)).size > 1)
        .sort((a, b) => b.where.length - a.where.length));
}
