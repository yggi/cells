const restKey = (dur) => `r${dur}`;
const pitchOf = (v) => {
    const m = /^(-?\d+)([#b]*)$/.exec(v);
    return m ? { n: Number(m[1]), acc: m[2] } : null;
};
function chordTok(c) {
    const ps = c.values.map(pitchOf);
    if (ps.some((p) => p === null))
        return { key: `d${c.dur}:${[...c.values].sort().join(',')}`, base: null };
    const base = Math.min(...ps.map((p) => p.n));
    return { key: `n${c.dur}:${ps.map((p) => `${p.n - base}${p.acc}`).join(',')}`, base };
}
export function tokensOf(line) {
    const out = [];
    let now = 0;
    for (const c of [...line.chords].sort((a, b) => a.at - b.at)) {
        if (c.at > now)
            out.push({ key: restKey(c.at - now), base: null });
        out.push(chordTok(c));
        now = c.at + c.dur;
    }
    if (line.length > now)
        out.push({ key: restKey(line.length - now), base: null });
    return out;
}
export const scaled = (key, k) => key.replace(/^([rdn])(\d+)/, (_, kind, d) => `${kind}${Number(d) * k}`);
export const isElement = (key) => /^[rdn]\d/.test(key);
export const isLook = (key) => /^f\d/.test(key);
export function elementText(key, base) {
    const m = /^([rdn])(\d+)(?::(.*))?$/.exec(key);
    const dur = Number(m[2]);
    const hold = dur === 1 ? '' : `@${dur}`;
    if (m[1] === 'r')
        return `~${hold}`;
    const values = m[1] === 'd'
        ? m[3].split(',')
        : m[3].split(',').map((v) => {
            const p = pitchOf(v);
            return `${p.n + (base ?? 0)}${p.acc}`;
        });
    return `${values.length === 1 ? values[0] : `[${values.join(',')}]`}${hold}`;
}
