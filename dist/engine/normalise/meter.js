import { attrsOf, declLine, declWords, spansLines, splitComment } from "../edit.js";
import { parse } from "../parser/index.js";
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
