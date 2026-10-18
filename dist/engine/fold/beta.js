import { kidsOf, tokText } from "./print.js";
import { isElement, isLook, scaled } from "./transpose.js";
function uses(f) {
    const n = new Map();
    const count = (toks) => {
        toks.forEach((t, i) => {
            if (isElement(t.key) || isLook(t.key))
                return;
            const runs = n.get(t.key) ?? [];
            const prev = toks[i - 1];
            if (prev && prev.key === t.key && prev.base === t.base && prev.stretch === t.stretch)
                runs[runs.length - 1].run++;
            else
                runs.push({ run: 1, stretch: t.stretch ?? 1 });
            n.set(t.key, runs);
        });
    };
    for (const l of f.lines)
        count(l.toks);
    for (const r of f.rules.values())
        count(r.of ? [{ key: r.of, base: null }] : kidsOf(r));
    return n;
}
function expand(r, base, stretch = 1) {
    return r.kids.map((k) => {
        const at = k.off === null ? null : (base ?? 0) + k.off;
        if (isElement(k.key))
            return { key: stretch === 1 ? k.key : scaled(k.key, stretch), base: at };
        const s = (k.stretch ?? 1) * stretch;
        return { key: k.key, base: at, ...(s !== 1 ? { stretch: s } : {}) };
    });
}
const kidOf = (t) => ({ key: t.key, off: t.base, ...(t.stretch ? { stretch: t.stretch } : {}) });
const written = (toks, names) => toks.reduce((n, t) => n + tokText(t, names).length + 1, 0);
export function inline(f, key) {
    const gone = f.rules.get(key);
    const out = (toks) => toks.flatMap((t) => (t.key === key ? expand(gone, t.base, t.stretch ?? 1) : [t]));
    const rules = new Map();
    for (const [k, r] of f.rules) {
        if (k === key)
            continue;
        if (r.of) {
            const kids = [];
            const patched = [];
            r.kids.forEach((c, i) => {
                for (const t of c.key === key ? expand(gone, c.off, c.stretch ?? 1) : [{ key: c.key, base: c.off, ...(c.stretch ? { stretch: c.stretch } : {}) }]) {
                    kids.push(kidOf(t));
                    patched.push(r.patched[i]);
                }
            });
            rules.set(k, r.of === key ? { key: k, kids } : { ...r, kids, patched });
        }
        else
            rules.set(k, { key: k, kids: out(kidsOf(r)).map(kidOf) });
    }
    return { ...f, lines: f.lines.map((l) => ({ ...l, toks: out(l.toks) })), rules };
}
export const beta = (f, see) => {
    let now = f;
    let changed = false;
    for (;;) {
        const n = uses(now);
        const names = new Map([...now.rules.keys()].map((k) => [k, 'm00']));
        let worst = null;
        for (const [key, r] of now.rules) {
            const body = written(kidsOf(r), names);
            const ref = 4 + 1 + (r.kids.some((c) => c.off !== null) ? 4 : 0);
            const def = r.of
                ? 22 +
                    written(kidsOf(r).filter((_, i) => r.patched[i]), names)
                : 1 + 3 + 1 + body;
            const at = (stretch) => (stretch === 1 ? body : written(expand(r, 0, stretch), names));
            const gain = (n.get(key) ?? []).reduce((g, u) => g + u.run * at(u.stretch) - ref - (u.stretch > 1 ? 2 : 0) - (u.run > 1 ? 2 : 0), 0) - def;
            if (gain <= 0 && (!worst || gain < worst.gain))
                worst = { key, gain };
        }
        if (!worst)
            break;
        now = inline(now, worst.key);
        changed = true;
        const seen = now;
        see?.(() => seen);
    }
    return changed ? now : null;
};
