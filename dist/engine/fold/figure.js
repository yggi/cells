import { elementText, isElement } from "./transpose.js";
const LEAST_BLOCKS = 3;
const LEAST_NOTES = 12;
const SIZES = [3, 4, 5, 6, 7, 8, 9, 10, 12, 16];
const durOf = (t) => Number(/^[rdn](\d+)/.exec(t.key)[1]);
const pitchOf = (t) => (t.key.startsWith('r') ? null : /^n\d+:0$/.test(t.key) ? t.base : undefined);
function blockOf(toks) {
    const pitches = toks.map(pitchOf);
    if (pitches.some((p) => p === undefined))
        return null;
    const chord = [...new Set(pitches.filter((p) => p !== null))];
    if (chord.length < 2)
        return null;
    const sig = toks.map((t, i) => `${durOf(t)}:${pitches[i] === null ? '~' : chord.indexOf(pitches[i])}`).join(' ');
    return { sig, chord };
}
export const figure = (f) => {
    const looks = new Map(f.looks ?? []);
    let made = 0;
    const lines = f.lines.map((line) => {
        const toks = line.toks;
        if (toks.some((t) => !isElement(t.key)))
            return line;
        const starts = [];
        toks.reduce((s, t) => (starts.push(s), s + durOf(t)), 0);
        const found = [];
        for (const size of SIZES)
            for (let from = 0; from + size * LEAST_BLOCKS <= toks.length; from++) {
                const first = blockOf(toks.slice(from, from + size));
                if (!first)
                    continue;
                const dur = toks.slice(from, from + size).reduce((n, t) => n + durOf(t), 0);
                if (starts[from] % dur !== 0)
                    continue;
                const chords = [first.chord];
                while (from + size * (chords.length + 1) <= toks.length) {
                    const b = blockOf(toks.slice(from + size * chords.length, from + size * (chords.length + 1)));
                    if (!b || b.sig !== first.sig || b.chord.length !== first.chord.length)
                        break;
                    chords.push(b.chord);
                }
                if (chords.length < LEAST_BLOCKS || chords.length * size < LEAST_NOTES)
                    continue;
                const changes = chords.filter((c, j) => j > 0 && c.join() !== chords[j - 1].join()).length;
                if (changes < (chords.length - 1) / 2)
                    continue;
                const written = toks.slice(from, from + size * chords.length).reduce((n, t) => n + elementText(t.key, t.base).length + 1, 0);
                const table = 30 + chords.reduce((n, c) => n + c.join(',').length + 3, 0) + 2 * (starts[from] / dur);
                const cost = table + 30 + 2 * size + 8;
                if (cost < written)
                    found.push({ from, size, count: chords.length, chords, sig: first.sig, dur, gain: written - cost });
            }
        found.sort((a, b) => b.gain - a.gain || a.from - b.from);
        const taken = [];
        const runs = found.filter((r) => {
            const [a, b] = [r.from, r.from + r.size * r.count];
            if (taken.some(([x, y]) => a < y && x < b))
                return false;
            taken.push([a, b]);
            return true;
        });
        if (!runs.length)
            return line;
        const out = [];
        let i = 0;
        for (const r of runs.sort((a, b) => a.from - b.from)) {
            out.push(...toks.slice(i, r.from));
            const key = `f${looks.size + 1}`;
            const pattern = r.sig.split(' ').map((w) => {
                const [d, at] = w.split(':');
                return at === '~' ? { key: `r${d}`, base: null } : { key: `n${d}:0`, base: Number(at) };
            });
            const look = { pattern, chords: r.chords, dur: r.dur, start: starts[r.from], scale: line.scale ?? 1 };
            looks.set(key, look);
            out.push({ key, base: null });
            i = r.from + r.size * r.count;
            made++;
        }
        out.push(...toks.slice(i));
        return { ...line, toks: out };
    });
    return made ? { lines, rules: f.rules, looks } : null;
};
