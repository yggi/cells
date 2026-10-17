import { compileSource } from "../compile.js";
import { codeShifts } from "../program.js";
import { eventsBetween, plan } from "../realize.js";
import { noteOf } from "../midi.js";
import { flatten } from "../flatten.js";
import { candidates } from "../shorten/harness.js";
const PHRASE = 5;
export function bare(source) {
    const r = compileSource(source);
    const sound = new Set([...r.cells.values()].filter((c) => c.voice || c.mix || c.sink || c.map || c.note || c.name === 'piece').map((c) => c.name));
    return source
        .split('\n')
        .map((l) => l
        .replace(/(^|\s)#.*$/, '')
        .replace(/\s(label|tags|title|show|tier|level)=("[^"]*"|\S+)/g, '')
        .replace(/\sabout=(\([^)]*\)|&\w+)/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim())
        .filter((l) => l && !sound.has(/^&(\w+)/.exec(l)?.[1] ?? ''))
        .join('\n').length;
}
export function heard(source, seconds) {
    const r = compileSource(source);
    const p = plan(r, codeShifts(r), r.off);
    return eventsBetween(p, 0, seconds)
        .filter((e) => e.freq > 0)
        .map((e) => ({ key: noteOf(e.freq).note, at: e.at }))
        .sort((a, b) => a.at - b.at || a.key - b.key);
}
export function same(a, b) {
    return differ(a, b) === '';
}
export function differ(a, b) {
    if (a.length !== b.length)
        return `${b.length} notes for ${a.length}`;
    const keys = a.filter((n, i) => n.key !== b[i].key).length;
    const late = a.reduce((m, n, i) => Math.max(m, Math.abs(n.at - b[i].at)), 0);
    return keys ? `${keys} keys` : late >= 0.01 ? `off by ${Math.round(late * 1000)} ms` : '';
}
export function phrases(source) {
    const { result, cells } = candidates(source);
    const shifts = codeShifts(result);
    const out = new Map();
    for (const c of cells) {
        let events;
        try {
            events = flatten(result, c.name, shifts);
        }
        catch {
            continue;
        }
        const top = new Map();
        for (const e of events) {
            const v = e.value + e.alter;
            const t = top.get(e.step);
            if (!t || v > t.value)
                top.set(e.step, { step: e.step, duration: e.duration, value: v });
        }
        const line = [...top.values()].sort((a, b) => a.step - b.step);
        if (line.length < PHRASE)
            continue;
        const s0 = line[0].step;
        const rhythm = line.map((n) => `${+(n.step - s0).toFixed(4)}:${+n.duration.toFixed(4)}`).join(' ');
        const contour = line
            .slice(1)
            .map((n, i) => Math.sign(n.value - line[i].value))
            .join('');
        out.set(c.name, `${rhythm}|${contour}`);
    }
    return out;
}
