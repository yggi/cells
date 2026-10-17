const SAME_SCALE = 1.06;
export function motifs(events, { length = 5, times = 2 } = {}) {
    const byVoice = new Map();
    for (const e of events)
        if (e.freq > 0)
            push(byVoice, e.voice, e);
    const found = new Map();
    for (const [voice, notes] of byVoice) {
        const line = [...notes].sort((a, b) => a.at - b.at || b.freq - a.freq).filter((e, i, xs) => i === 0 || e.at - xs[i - 1].at > 1e-4);
        for (let i = 0; i + length <= line.length; i++) {
            const fig = line.slice(i, i + length);
            const first = fig[1].at - fig[0].at;
            if (!(first > 0))
                continue;
            const steps = fig.slice(1).map((e, k) => Math.round(12 * Math.log2(e.freq / fig[k].freq)));
            if (steps.filter((s) => s === 0).length >= 2 || steps.some((s) => Math.abs(s) >= 12))
                continue;
            const rhythm = fig.slice(1, -1).map((e, k) => Math.round((4 * (fig[k + 2].at - e.at)) / first) / 4);
            if (rhythm.some((r) => r === 0))
                continue;
            const shape = `${steps.join(' ')} | 1 ${rhythm.join(' ')}`;
            const fs = fig.map((e) => e.freq);
            push(found, shape, { voice, at: fig[0].at, to: fig[fig.length - 1].at, lo: Math.min(...fs), hi: Math.max(...fs), scale: first });
        }
    }
    return [...found]
        .filter(([, heard]) => heard.length >= times)
        .map(([shape, heard]) => {
        const scales = [];
        for (const s of heard.map((h) => h.scale).sort((a, b) => a - b))
            if (!scales.length || s / scales[scales.length - 1] > SAME_SCALE)
                scales.push(s);
        return { shape, heard, scales };
    })
        .sort((a, b) => b.heard.length - a.heard.length || b.scales.length - a.scales.length);
}
export function multiscale(ms, ratio = 1.4) {
    return ms
        .filter((m) => m.scales[m.scales.length - 1] / m.scales[0] >= ratio)
        .sort((a, b) => b.scales[b.scales.length - 1] / b.scales[0] - a.scales[a.scales.length - 1] / a.scales[0]);
}
function push(m, key, x) {
    const xs = m.get(key);
    if (xs)
        xs.push(x);
    else
        m.set(key, [x]);
}
