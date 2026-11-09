import { attrsOf, declLine, declWords, renameCell, setAttr, spansLines, splitComment } from "../edit.js";
import { parse } from "../parser/index.js";
import { clocking } from "../clocking.js";
import { codeShifts } from "../program.js";
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
const after = (source, name, line) => {
    const lines = source.split('\n');
    const i = declLine(source, name);
    const indent = /^\s*/.exec(lines[i])[0];
    lines.splice(i + 1, 0, `${indent}${line}`);
    return lines.join('\n');
};
export const BAR_BPM = { from: 40, to: 300 };
function isBar(result, meter) {
    const beat = result.cells.get(meter)?.beat || 1;
    const map = clocking(result, plan(result, codeShifts(result)).statics).map(meter);
    const seconds = (map.q(4 * beat) - map.q(0)) / 4;
    const bpm = 60 / seconds;
    return Number.isFinite(bpm) && bpm >= BAR_BPM.from && bpm <= BAR_BPM.to;
}
const WRITTEN = new Set(['bar', 'tempo', 'key', 'tonic', 'harm', 'style']);
const named = (name) => WRITTEN.has(name);
const free = (source, result, name) => declLine(source, name) < 0 && !result.cells.has(name);
export function interfaceNames(source, result) {
    const own = new Set(parse(source).cells.map((d) => d.name));
    const out = [];
    const meters = [...own].filter((n) => result.clocks.has(n) && result.cells.get(n)?.meter);
    const meter = result.mainMeter;
    if (meter && own.has(meter) && meters.length === 1 && !spansLines(source, meter) && isBar(result, meter)) {
        if (!named(meter) && free(source, result, 'bar'))
            out.push(rewrite('bar', `&${meter} is the piece's meter: &bar`, `&${meter}`, '&bar', (src) => renameCell(src, meter, 'bar')));
        const rate = attrsOf(source, meter).get('step');
        if (meter === 'bar' && rate && !rate.startsWith('&') && free(source, result, 'tempo'))
            out.push(rewrite('tempo', `&bar's rate is its tempo: step=&tempo, &tempo step=${rate}`, `step=${rate}`, 'step=&tempo', (src) => after(setAttr(src, 'bar', 'step', '&tempo'), 'bar', `&tempo step=${rate}`)));
    }
    const keys = [...own].filter((n) => declWords(source, n)?.braid[0]?.startsWith('scale('));
    const key = result.mainKey;
    if (key && own.has(key) && keys.length === 1 && !spansLines(source, key)) {
        if (!named(key) && free(source, result, 'key'))
            out.push(rewrite('key', `&${key} is the piece's key: &key`, `&${key}`, '&key', (src) => renameCell(src, key, 'key')));
        const braid = declWords(source, key).braid;
        const tonic = braid.length === 1 ? /^scale\(\s*([^,()\s]+)\s*,\s*([A-Ga-g][#b♯♭]*-?\d*)\s*\)$/.exec(braid[0]) : null;
        if (key === 'key' && tonic && free(source, result, 'tonic'))
            out.push(rewrite('tonic', `&key's tonic is a cell: scale(${tonic[1]}, &tonic), &tonic ${tonic[2]}`, braid[0], `scale(${tonic[1]}, &tonic)`, (src) => after(replaceInDecl(src, 'key', braid[0], `scale(${tonic[1]}, &tonic)`), 'key', `&tonic ${tonic[2]}`)));
    }
    return out;
}
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
