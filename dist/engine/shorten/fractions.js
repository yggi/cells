import { attrsOf, setAttr, setBraid } from "../edit.js";
import { tapOfRaw } from "./taps.js";
import { saves } from "./harness.js";
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
export function fractions(source, cells, result) {
    const out = [];
    for (const c of cells) {
        const leaning = [...result.cells.values()].some((x) => x.name !== c.name &&
            (x.over === c.name ||
                x.step?.driver === c.name ||
                x.env === c.name ||
                x.pitch === c.name ||
                x.units.some((u) => u.atom.kind === 'ref' && u.atom.name === c.name) ||
                Object.values(x.paramCells ?? {}).some((p) => p.factors.includes(c.name))));
        if (leaning || result.outputs.some((o) => o.mods.some((m) => m.cell === c.name) || o.levels.some((l) => l.cell === c.name)))
            continue;
        if (c.tokens.some((t) => t.includes('&') || t.includes('?') || t.includes('|')))
            continue;
        const cell = result.cells.get(c.name);
        const attrs = attrsOf(source, c.name);
        const step = attrs.get('step');
        if (!cell || !step || attrs.has('stride') || attrs.has('cycle') || cell.loops)
            continue;
        const cut = (t) => t.lastIndexOf(']') + 1;
        const held = c.tokens.map((t) => {
            const m = /@([0-9]+)/.exec(t.slice(cut(t)));
            return m ? +m[1] : 1;
        });
        const g = held.reduce(gcd);
        if (g < 2)
            continue;
        let slower = null;
        const driven = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\*([0-9]+))?(?:\/([0-9]+))?$/.exec(step);
        if (driven) {
            let n = driven[2] ? +driven[2] : 1;
            let d = (driven[3] ? +driven[3] : 1) * g;
            const k = gcd(n, d);
            n /= k;
            d /= k;
            slower = `&${driven[1]}${n > 1 ? `*${n}` : ''}${d > 1 ? `/${d}` : ''}`;
        }
        else if (/^[0-9]*\.?[0-9]+$/.test(step))
            slower = String(+(+step / g).toFixed(6));
        if (driven && tapOfRaw(result, c.name) !== null)
            slower = tapOfRaw(result, c.name, g);
        else
            slower = slowerTap(step, g) ?? slower;
        if (!slower)
            continue;
        const next = c.tokens.map((t, i) => t.slice(0, cut(t)) + t.slice(cut(t)).replace(/@[0-9]+/, held[i] / g > 1 ? `@${held[i] / g}` : ''));
        const s = {
            id: `fraction:${c.name}`,
            tool: 'shorten',
            rule: 'fraction',
            title: `&${c.name}: every step is held ${g}× or more — divide by ${g}, and step ${g}× slower`,
            before: `step=${step}  ${c.tokens.slice(0, 5).join(' ')}${c.tokens.length > 5 ? ' …' : ''}`,
            after: `step=${slower}  ${next.slice(0, 5).join(' ')}${next.length > 5 ? ' …' : ''}`,
            apply: (src) => setAttr(setBraid(src, c.name, next), c.name, 'step', slower),
        };
        if ((saves(source, s) ?? 0) > 0)
            out.push(s);
    }
    return out;
}
function slowerTap(step, g) {
    const m = /^((?:&[A-Za-z_][A-Za-z0-9_]*:)?)(?:([0-9]+)(n\.?|t)|(pulse|beat)(?:\*([0-9]+))?|1m(?:\/([0-9]+))?)$/.exec(step);
    if (!m)
        return null;
    const [, of = '', count, unit, word, times, bars] = m;
    if (count !== undefined)
        return +count % g === 0 ? `${of}${+count / g}${unit}` : null;
    if (word !== undefined) {
        const k = times === undefined ? 1 : +times;
        return k % g === 0 ? `${of}${word}${k / g > 1 ? `*${k / g}` : ''}` : null;
    }
    const d = (bars === undefined ? 1 : +bars) * g;
    return `${of}${d > 1 ? `1m/${d}` : '1m'}`;
}
