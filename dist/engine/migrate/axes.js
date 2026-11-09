import { splitComment } from "../edit.js";
import { BRIGHTNESS } from "../style.js";
export const OLD_AXES = ['sync', 'harm', 'artic', 'energy'];
export const OLD_MODES = [
    { mode: 'aeolian', point: { sync: 0.3, harm: 0.45, artic: 0.55, energy: 0.55 } },
    { mode: 'aeolian', point: { sync: 0.12, harm: 0, artic: 1, energy: 0.8 } },
    { mode: 'aeolian', point: { sync: 0.5, harm: 0.75, artic: 0.35, energy: 0.5 } },
    { mode: 'dorian', point: { sync: 0.35, harm: 0.55, artic: 0.65, energy: 0.65 } },
    { mode: 'dorian', point: { sync: 1, harm: 0.12, artic: 0.85, energy: 0.75 } },
    { mode: 'ionian', point: { sync: 0.05, harm: 0.3, artic: 0, energy: 0.2 } },
    { mode: 'ionian', point: { sync: 0.75, harm: 0.85, artic: 0.45, energy: 0.45 } },
    { mode: 'ionian', point: { sync: 0.35, harm: 1, artic: 0.3, energy: 0.6 } },
    { mode: 'ionian', point: { sync: 0.1, harm: 0.12, artic: 0.5, energy: 0.35 } },
    { mode: 'mixolydian', point: { sync: 0.875, harm: 0.485, artic: 0.65, energy: 0.6 } },
    { mode: 'phrygian', point: { sync: 0.6, harm: 0.6, artic: 0.7, energy: 0.85 } },
    { mode: 'lydian', point: { sync: 0.15, harm: 0.6, artic: 0.15, energy: 0.3 } },
    { mode: 'locrian', point: { sync: 0.9, harm: 1, artic: 0.6, energy: 0.9 } },
    { mode: 'ionian', point: { sync: 0.383, harm: 0.717, artic: 0.25, energy: 0.417 } },
    { mode: 'harmonic_minor', point: { sync: 0.55, harm: 0.75, artic: 0.6, energy: 0.75 } },
    { mode: 'harmonic_minor', point: { sync: 0.2, harm: 0.9, artic: 0.3, energy: 0.35 } },
];
const round = (x) => Math.round(x * 1e6) / 1e6;
const text = (x) => String(round(x)).replace(/^0\./, '.');
export function oldMode(p) {
    const d = (q) => OLD_AXES.reduce((a, k) => a + (p[k] - q[k]) ** 2, 0);
    return OLD_MODES.reduce((best, m) => (d(m.point) < d(best.point) ? m : best)).mode;
}
export function newPoint(p, bright = true) {
    return { sync: p.sync, harm: p.harm, drive: round((p.artic + p.energy) / 2), ...(bright ? { bright: BRIGHTNESS[oldMode(p)] } : {}) };
}
function valueAt(code, from) {
    let i = from;
    const term = () => {
        if (code.startsWith('free(', i)) {
            let depth = 0;
            for (; i < code.length; i++) {
                if (code[i] === '(')
                    depth++;
                else if (code[i] === ')' && --depth === 0)
                    return void i++;
            }
            return;
        }
        const m = /&?\(?[A-Za-z0-9_.\-[\]$]+/y;
        m.lastIndex = i;
        if (m.test(code))
            i = m.lastIndex;
    };
    term();
    for (;;) {
        const op = /\s*(\.\.|\*|±|\+-)\s*/y;
        op.lastIndex = i;
        if (!op.test(code))
            return i;
        i = op.lastIndex;
        term();
    }
}
const heldAt = (value) => parseFloat(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/.exec(value)?.[0] ?? '0.5');
const plain = (value) => /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(value);
function restyleBody(body) {
    const named = new Map();
    for (const k of OLD_AXES) {
        const m = new RegExp(`(^|\\s)${k}=`).exec(body);
        if (!m)
            continue;
        const at = m.index + m[1].length;
        const end = valueAt(body, at + k.length + 1);
        named.set(k, { at, end, value: body.slice(at + k.length + 1, end) });
    }
    if (named.has('artic') || named.has('energy')) {
        if (!OLD_AXES.every((k) => named.has(k)))
            return null;
        const v = (k) => named.get(k).value;
        const old = Object.fromEntries(OLD_AXES.map((k) => [k, heldAt(v(k))]));
        const drive = plain(v('artic')) && plain(v('energy')) ? text(newPoint(old).drive) : plain(v('artic')) ? v('energy') : v('artic');
        const bright = text(newPoint(old).bright);
        const [a, e] = [named.get('artic'), named.get('energy')];
        const edits = [
            { at: a.at, end: a.end, to: `drive=${drive}` },
            { at: e.at, end: e.end, to: `bright=${bright}` },
        ].sort((x, y) => y.at - x.at);
        return edits.reduce((s, x) => s.slice(0, x.at) + x.to + s.slice(x.end), body);
    }
    const tokens = /^\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)\s+((?:free\([^)]*\)|\S)+)(?=\s*(?:$|\)|\s+[a-z]+=))/.exec(body);
    if (!tokens || !tokens.slice(1).every((t) => plain(t) || t.startsWith('free(')))
        return null;
    const [s, h, ar, en] = tokens.slice(1);
    const old = { sync: heldAt(s), harm: heldAt(h), artic: heldAt(ar), energy: heldAt(en) };
    const drive = plain(ar) && plain(en) ? text(newPoint(old).drive) : plain(ar) ? en : ar;
    return ` sync=${s} harm=${h} drive=${drive} bright=${text(newPoint(old).bright)}${body.slice(tokens[0].length)}`;
}
export function restyled(code) {
    let out = code.replace(/\[(artic|energy)\]/g, '[drive]');
    const at = [...out.matchAll(/map=style(?=\s)/g)].map((m) => m.index + 'map=style'.length).reverse();
    for (const i of at) {
        const close = out.lastIndexOf('&(', i) > out.lastIndexOf(')', i) && out.lastIndexOf('&(', i) >= 0 ? matching(out, out.lastIndexOf('&(', i) + 1) : -1;
        const end = close >= 0 ? close : out.length;
        const body = restyleBody(out.slice(i, end));
        if (body !== null)
            out = out.slice(0, i) + body + out.slice(end);
    }
    return out === code ? null : out;
}
function matching(s, open) {
    let depth = 0;
    for (let i = open; i < s.length; i++) {
        if (s[i] === '(')
            depth++;
        else if (s[i] === ')' && --depth === 0)
            return i;
    }
    return s.length;
}
export const writesOldAxes = (code) => /(?:^|\s)(?:artic|energy)=|\[(?:artic|energy)\]/.test(code) && /map=style|\[(?:artic|energy)\]/.test(code);
export function axes(source) {
    return source.split('\n').flatMap((raw, i) => {
        const [code, comment] = splitComment(raw);
        if (!/^\s*&/.test(code))
            return [];
        const after = restyled(code);
        if (after === null)
            return [];
        return [
            {
                id: `axes:${i + 1}`,
                tool: 'migrate',
                rule: 'axes',
                title: `a style on the axes sync harm drive bright: drive the mean of articulation and energy, bright the mode's (decision 076)`,
                before: code.trim(),
                after: after.trim(),
                apply: (src) => src
                    .split('\n')
                    .map((l, j) => (j === i && l === raw ? after + comment : l))
                    .join('\n'),
                exact: true,
            },
        ];
    });
}
