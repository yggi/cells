import { declLine, declWords, setAttr, splitComment } from "../edit.js";
import { soundsIdentical } from "../sameness.js";
import { saves } from "./harness.js";
function splitTop(text, sep) {
    const out = [];
    let depth = 0;
    let cur = '';
    for (const ch of text) {
        if (ch === '[' || ch === '(')
            depth++;
        if (ch === ']' || ch === ')')
            depth--;
        if (ch === sep && depth === 0) {
            out.push(cur.trim());
            cur = '';
        }
        else
            cur += ch;
    }
    out.push(cur.trim());
    return out;
}
function chordsOf(text) {
    const chords = [];
    let depth = 0;
    let cur = '';
    for (const ch of text) {
        if (ch === '[') {
            if (depth === 0)
                cur = '';
            else
                cur += ch;
            depth++;
        }
        else if (ch === ']') {
            depth--;
            if (depth === 0)
                chords.push(cur);
            else
                cur += ch;
        }
        else if (depth > 0)
            cur += ch;
        else if (!/\s/.test(ch))
            return null;
    }
    return depth === 0 ? chords.map((c) => splitTop(c, ',')) : null;
}
const NUMBER = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
const entryOf = (e) => {
    const fs = splitTop(e, '*');
    return { sound: fs.filter((f) => !NUMBER.test(f)).join(' * '), gain: fs.filter((f) => NUMBER.test(f)).reduce((a, f) => a * parseFloat(f), 1), factors: fs };
};
const written = (p) => String(+p.toFixed(3)).replace(/^0\./, '.');
export function stereo(source, result, options = {}) {
    const out = [];
    const lines = source.split('\n');
    for (const card of result.cells.values()) {
        if (!card.sink)
            continue;
        const first = declLine(source, card.name);
        if (first < 0)
            continue;
        let last = first;
        while (last + 1 < lines.length && /[+*,[]\s*$/.test(splitComment(lines[last])[0]))
            last++;
        const [head, comment] = splitComment(lines[first]);
        const whole = [head, ...lines.slice(first + 1, last + 1).map((l) => splitComment(l)[0])].join(' ');
        const at = whole.search(/\[/);
        const words = declWords(source, card.name);
        if (at < 0 || !words)
            continue;
        const chords = chordsOf(whole.slice(at));
        if (!chords || chords.length !== 2 || chords[0].length !== chords[1].length)
            continue;
        const [L, R] = chords.map((c) => c.map(entryOf));
        if (L.some((e, i) => e.sound !== R[i].sound))
            continue;
        const voiceOf = (sound) => {
            const names = [...sound.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_[(^])/g)].map((m) => m[1]);
            const vs = names.filter((n) => {
                const c = result.cells.get(n);
                return !!c && c.voice && !c.kit && Object.keys(c.params).length > 0;
            });
            return vs.length === 1 ? vs[0] : null;
        };
        const voices = L.map((e) => voiceOf(e.sound));
        if (voices.some((v) => v === null) || new Set(voices).size !== voices.length)
            continue;
        const elsewhere = (v) => [...result.cells.values()].some((c) => c.name !== card.name && (c.mix ?? []).some((b) => b.voice.name === v || b.pitches.some((t) => t.ref.name === v)));
        if (voices.some((v) => elsewhere(v) || result.cells.get(v).params.pan !== undefined))
            continue;
        const pans = L.map((l, i) => {
            const r = R[i];
            return l.gain === r.gain ? 0.5 : r.gain < l.gain ? r.gain / (2 * l.gain) : 1 - l.gain / (2 * r.gain);
        });
        if (pans.some((p) => Math.abs(p * 1000 - Math.round(p * 1000)) > 1e-9))
            continue;
        const entries = L.map((l, i) => (R[i].gain > l.gain ? chords[1][i] : chords[0][i]));
        const apply = (src) => {
            const ls = src.split('\n');
            const prefix = whole.slice(0, at).trimEnd();
            ls.splice(first, last - first + 1, `${prefix} [${entries.join(', ')}]${comment ? ' ' + comment : ''}`);
            let next = ls.join('\n');
            voices.forEach((v, i) => {
                if (pans[i] !== 0.5)
                    next = setAttr(next, v, 'pan', written(pans[i]));
            });
            return next;
        };
        const s = {
            id: `pan:${card.name}`,
            tool: 'shorten',
            rule: 'pan',
            title: `&${card.name}'s two chords hold the same sounds at different gains: one chord, and each voice placed with pan=`,
            before: '[…] […]',
            after: voices.map((v, i) => `&${v} pan=${written(pans[i])}`).join(' · '),
            apply,
        };
        if ((saves(source, s) ?? 0) > 0 && soundsIdentical(source, s.apply(source), undefined, options))
            out.push(s);
    }
    return out;
}
