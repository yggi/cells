import { elementText, isElement, isLook } from "./transpose.js";
export function tokText(t, names, caret = '^$') {
    if (isElement(t.key))
        return elementText(t.key, t.base);
    if (isLook(t.key))
        return `&${names.get(t.key) ?? t.key}`;
    const name = names.get(t.key) ?? t.key;
    return `&${name}${t.base ? `${caret}${t.base}` : ''}${t.stretch && t.stretch !== 1 ? `@${t.stretch}` : ''}`;
}
function runs(texts) {
    const out = [];
    for (let i = 0; i < texts.length;) {
        let n = 1;
        while (i + n < texts.length && texts[i + n] === texts[i])
            n++;
        out.push(n === 1 ? texts[i] : `${texts[i]}!${n}`);
        i += n;
    }
    return out.join(' ');
}
const braid = (toks, names, caret = '^$') => runs(toks.map((t) => tokText(t, names, caret)));
function variantText(v, phrase, names, caret) {
    const j = v.kids.findIndex((k, i) => !v.patched[i] && k.off !== null && phrase.kids[i].off !== null);
    const by = j < 0 ? 0 : v.kids[j].off - phrase.kids[j].off;
    const steps = v.kids.map((k, i) => (v.patched[i] ? tokText({ key: k.key, base: k.off }, names, caret) : '='));
    while (steps.length && steps[steps.length - 1] === '=')
        steps.pop();
    return `base=&${names.get(phrase.key) ?? phrase.key}${by ? `${caret}${by}` : ''} ${runs(steps)}`;
}
export const kidsOf = (r) => r.kids.map((k) => ({ key: k.key, base: k.off, ...(k.stretch ? { stretch: k.stretch } : {}) }));
export function useOrder(f) {
    const order = [];
    const seen = new Set();
    const visit = (toks) => {
        for (const t of toks)
            if (!isElement(t.key) && !isLook(t.key) && !seen.has(t.key)) {
                seen.add(t.key);
                order.push(t.key);
                const r = f.rules.get(t.key);
                visit(r.of ? [{ key: r.of, base: null }] : kidsOf(r));
            }
    };
    for (const l of f.lines)
        visit(l.toks);
    return order;
}
export function printFolded(f, prefix = 'm', clock = 'pulse', caret = '^$', fixed) {
    const used = useOrder(f);
    const order = fixed ? [...fixed.keys()].filter((k) => used.includes(k)) : used;
    const names = new Map(fixed ? order.map((k) => [k, fixed.get(k)]) : order.map((k, i) => [k, `${prefix}${i + 1}`]));
    const defs = order.map((k) => {
        const r = f.rules.get(k);
        return `&${names.get(k)} ${r.of ? variantText(r, f.rules.get(r.of), names, caret) : braid(kidsOf(r), names, caret)}`;
    });
    const figures = new Map();
    let n = 0;
    for (const [key, look] of f.looks ?? []) {
        n++;
        let k = 1;
        for (let d = 2; d <= look.pattern.length; d++) {
            const p = look.pattern.length / d;
            if (Number.isInteger(p) && look.pattern.every((t, i) => t.key === look.pattern[i % p].key && t.base === look.pattern[i % p].base))
                k = d;
        }
        const figure = braid(look.pattern.slice(0, look.pattern.length / k), names);
        if (!figures.has(figure)) {
            figures.set(figure, `figure${figures.size + 1}`);
            defs.push(`&${figures.get(figure)} ${figure}`);
        }
        const chord = (c) => `[${c.join(',')}]`;
        const pad = Math.round(look.start / look.dur);
        const chords = [...Array(pad).fill('0'), ...look.chords.map(chord)];
        const table = `chords${n}`;
        defs.push(`&${table} step=${clock}/${look.dur * (look.scale ?? 1)} ${chords.join(' ')}`);
        names.set(key, `run${n}`);
        defs.push(`&run${n} over=&${table} &${figures.get(figure)}!${look.chords.length * k}`);
    }
    return { defs, lines: new Map(f.lines.map((l) => [l.name, braid(l.toks, names, caret)])), scales: new Map(f.lines.map((l) => [l.name, l.scale ?? 1])) };
}
