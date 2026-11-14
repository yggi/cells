import { attrsOf, declLine, declWords, spansLines, splitComment } from "../edit.js";
import { parse } from "../parser/index.js";
import { codeShifts } from "../program.js";
import { clocking } from "../clocking.js";
import { compileSource } from "../compile.js";
import { plan } from "../realize.js";
const rewrite = (rule, title, before, after, apply) => ({
    id: `${rule}:${before}`,
    tool: 'normalise',
    rule,
    title,
    before,
    after,
    apply,
});
function replaceInDecl(source, name, from, to) {
    const lines = source.split('\n');
    const i = declLine(source, name);
    if (i < 0)
        return source;
    const [code, comment] = splitComment(lines[i]);
    const at = code.indexOf(from);
    if (at < 0)
        return source;
    lines[i] = code.slice(0, at) + to + code.slice(at + from.length) + comment;
    return lines.join('\n');
}
function keepColumn(line, code) {
    const [was, comment] = splitComment(line);
    if (!comment)
        return code;
    const aligned = was.length - was.trimEnd().length > 1;
    return `${code}${' '.repeat(aligned ? Math.max(1, was.length - code.length) : 1)}${comment}`;
}
export function evenScan(source, result) {
    const meter = result.mainMeter;
    if (!meter || spansLines(source, meter) || attrsOf(source, meter).has('pulse'))
        return [];
    const braid = declWords(source, meter)?.braid ?? [];
    const scan = braid.length === 1 ? /^scan\(\s*([^()]*)\)$/.exec(braid[0]) : null;
    if (!scan)
        return [];
    const entries = scan[1]
        .trim()
        .split(/\s+/)
        .flatMap((w) => {
        const m = /^([0-9]+)(?:!([0-9]+))?$/.exec(w);
        return m ? Array.from({ length: Number(m[2] ?? 1) }, () => m[1]) : ['?'];
    });
    if (entries.length < 2 || entries.length > 12 || entries.some((e) => e !== entries[0]) || !['1', '4'].includes(entries[0]))
        return [];
    const sig = `meter("${entries.length}/4")`;
    return [rewrite('meter', `&${meter}: ${braid[0]} is ${sig}`, braid[0], sig, (src) => replaceInDecl(src, meter, braid[0], sig))];
}
function fraction(text) {
    const m = /^(-?)([0-9]*)(?:\.([0-9]+))?$/.exec(text);
    if (!m || (m[2] === '' && m[3] === undefined))
        return null;
    const d = 10 ** (m[3]?.length ?? 0);
    return [(m[1] ? -1 : 1) * Number(`${m[2] || '0'}${m[3] ?? ''}`), d];
}
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function share(x, b) {
    const [xn, xd] = fraction(x) ?? [NaN, 1];
    const [bn, bd] = fraction(b) ?? [NaN, 1];
    const n = xn * bd;
    const d = xn * bd + bn * xd;
    if (!Number.isFinite(n) || !(n > 0) || !(d > n))
        return null;
    const g = gcd(n, d);
    return `${n / g}/${d / g}`;
}
export function swingClock(source, result) {
    const meter = result.mainMeter;
    if (!meter || spansLines(source, meter) || attrsOf(source, meter).has('swing') || declLine(source, meter) < 0)
        return [];
    const out = [];
    for (const { name } of parse(source).cells) {
        if (name === meter || spansLines(source, name))
            continue;
        const words = declWords(source, name);
        const attrs = attrsOf(source, name);
        const tap = attrs.get('step') ?? '';
        if (!words || words.braid.length !== 1 || attrs.size !== 1 || !/^[0-9]+n$/.test(tap))
            continue;
        const NUM = '-?(?:[0-9]+(?:\\.[0-9]+)?|\\.[0-9]+)';
        const fixed = new RegExp(`^scan\\(\\s*(${NUM})\\s+(${NUM})\\s*\\)$`).exec(words.braid[0]);
        const free = new RegExp(`^scan\\(\\s*free\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\.\\.\\s*(${NUM})\\s*\\)\\s+(${NUM})\\s*\\)$`).exec(words.braid[0]);
        let amount = null;
        if (fixed)
            amount = share(fixed[1], fixed[2]);
        else if (free) {
            const [v, lo, hi] = [free[1], free[2], free[3]].map((x) => share(x, free[4]));
            amount = v && lo && hi ? `free(${v}, ${lo}..${hi})` : null;
        }
        if (!amount)
            continue;
        const said = source.replace(/about=(?:\([^)]*\)|&\w+)/g, '');
        const mentions = [...said.matchAll(new RegExp(`&${name}(?!\\w)`, 'g'))].length;
        const taps = [...said.matchAll(new RegExp(`step=&${name}:pulse(?![\\w*/.:])`, 'g'))].length;
        if (taps === 0 || mentions !== 1 + taps)
            continue;
        const lean = `swing=${tap}:${amount}`;
        out.push(rewrite('swing', `&${name} ${words.braid[0]} step=${tap}, tapped by its pulse, is a swing of the meter's: &${meter} swing=&${name}, &${name} ${lean}`, `&${name} ${words.braid[0]} step=${tap}`, `&${name} ${lean}`, (src) => {
            const lines = src.split('\n');
            const i = declLine(src, name);
            const indent = /^\s*/.exec(lines[i])[0];
            lines[i] = keepColumn(lines[i], `${indent}&${name} ${lean}`);
            const m = declLine(src, meter);
            const [code] = splitComment(lines[m]);
            lines[m] = keepColumn(lines[m], `${code.trimEnd()} swing=&${name}`);
            const tapped = new RegExp(`step=&${name}:pulse(?![\\w*/.:])`, 'g');
            return lines.map((l) => (tapped.test(l) ? keepColumn(l, splitComment(l)[0].trimEnd().replace(tapped, `step=${tap}`)) : l)).join('\n');
        }));
    }
    return out;
}
const TAPS = [...['1n', '2n', '4n', '8n', '16n', '32n'].flatMap((n) => [n, `${n}.`, n.replace('n', 't')]), 'pulse', 'beat', '1m'];
const SAME = { steps: 64, seconds: 1e-9 };
function otherMentions(source, name, ...readers) {
    const said = readers.reduce((s, r) => s.replace(r, ''), source.replace(/about=(?:\([^)]*\)|&\w+)/g, ''));
    return [...said.matchAll(new RegExp(`&${name}(?!\\w)`, 'g'))].length - 1;
}
const noted = (source, name) => new RegExp(`about=(?:\\([^)]*&${name}(?!\\w)[^)]*\\)|&${name}(?!\\w))`).test(source);
function dropLine(source, name) {
    const lines = source.split('\n');
    const i = declLine(source, name);
    return i < 0 ? source : [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n');
}
function clocksOf(source, options) {
    const r = compileSource(source, undefined, options);
    const maps = clocking(r, plan(r, codeShifts(r)).statics);
    return (key) => {
        if (!r.clocks.has(key))
            return null;
        const map = maps.map(key);
        return (i) => map.q(i);
    };
}
const firstSteps = (q, stride = 1) => Array.from({ length: SAME.steps }, (_, i) => q(i * stride));
const ULPS = 64;
const MAX_STRIDE = 100_000;
export function tapClock(source, result, options = {}) {
    const main = result.mainMeter;
    if (!main)
        return [];
    const own = new Set(parse(source).cells.map((d) => d.name));
    const out = [];
    for (const name of own) {
        if (name === main || !result.clocks.has(name) || spansLines(source, name))
            continue;
        const line = source.split('\n')[declLine(source, name)] ?? '';
        if (/free\(/.test(splitComment(line)[0]))
            continue;
        const tapped = new RegExp(`step=&${name}:([\\w.]+)(?![\\w*/.:])`, 'g');
        const taps = [...new Set([...source.matchAll(tapped)].map((m) => m[1]))];
        if (!taps.length || otherMentions(source, name, tapped) !== 0)
            continue;
        const near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) <= Math.max(SAME.seconds, ULPS * Number.EPSILON * Math.abs(x)));
        const mine = clocksOf(source, options);
        const named = result.meters ? `&${main}:` : '';
        const main_ = clocksOf(`${source}\n${TAPS.map((t, i) => `&__tap${i} step=${named}${t} 0`).join('\n')}`, options);
        const instead = new Map();
        for (const tap of taps) {
            const q = mine(`${name}:${tap}`);
            if (!q)
                continue;
            const theirs = firstSteps(q);
            const match = TAPS.find((t) => {
                const ours = main_(`${main}:${t}`);
                return ours !== null && near(firstSteps(ours), theirs);
            }) ??
                TAPS.flatMap((t) => {
                    const ours = main_(`${main}:${t}`);
                    return ours ? [{ t, ours, period: (ours(SAME.steps) - ours(0)) / SAME.steps }] : [];
                })
                    .sort((a, b) => b.period - a.period || TAPS.indexOf(b.t) - TAPS.indexOf(a.t))
                    .flatMap(({ t, ours, period }) => {
                    const k = Math.round((theirs[1] - theirs[0]) / period);
                    return k > 1 && k <= MAX_STRIDE && near(firstSteps(ours, k), theirs) ? [`${t}/${k}`] : [];
                })[0];
            if (match)
                instead.set(tap, match);
        }
        if (instead.size !== taps.length)
            continue;
        const said = [...instead].map(([a, b]) => `&${name}:${a} is ${b}`).join(', ');
        out.push(rewrite('meter', `&${name}'s ticks are &${main}'s: ${said}`, `step=&${name}:${taps[0]}`, `step=${instead.get(taps[0])}`, (src) => {
            const written = (prefix) => src.replace(tapped, (_, tap) => (instead.has(tap) ? `step=${prefix}${instead.get(tap)}` : `step=&${name}:${tap}`));
            let next = written('');
            const gone = !noted(next, name) && otherMentions(next, name) === 0;
            if ((result.meters ?? []).filter((m) => m !== name || !gone).length > 1)
                next = written(named);
            if (gone)
                next = dropLine(next, name);
            return next;
        }));
    }
    return out;
}
export function shadowMeter(source, result) {
    const main = result.mainMeter;
    if (!main || declLine(source, main) < 0 || spansLines(source, main))
        return [];
    const mine = attrsOf(source, main);
    const rate = mine.get('step');
    if (!rate || /free\(/.test(rate))
        return [];
    const out = [];
    for (const { name } of parse(source).cells) {
        if (name === main || !result.cells.get(name)?.meter || spansLines(source, name))
            continue;
        const theirs = attrsOf(source, name);
        if (theirs.get('step') !== rate)
            continue;
        const feel = ['swing', 'legato'].filter((k) => theirs.has(k));
        if (!feel.length || feel.some((k) => mine.has(k)) || [...theirs.keys()].some((k) => k !== 'step' && !feel.includes(k)))
            continue;
        const tapped = new RegExp(`step=&${name}:([\\w.]+)(?![\\w*/.:])`, 'g');
        if (!tapped.test(source) || otherMentions(source, name, tapped) !== 0)
            continue;
        const add = feel.map((k) => `${k}=${theirs.get(k)}`).join(' ');
        out.push(rewrite('swing', `&${name} is &${main} with ${add}: &${main} ${add}, its readers on &${main}'s taps`, `&${name}`, `&${main} ${add}`, (src) => {
            const lines = src.split('\n');
            const m = declLine(src, main);
            lines[m] = keepColumn(lines[m], `${splitComment(lines[m])[0].trimEnd()} ${add}`);
            let next = lines.join('\n').replace(tapped, (_, tap) => `step=${tap}`);
            if (!noted(next, name) && otherMentions(next, name) === 0)
                next = dropLine(next, name);
            return next;
        }));
    }
    return out;
}
