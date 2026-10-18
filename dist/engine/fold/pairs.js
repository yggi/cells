function pairOf(a, b) {
    const base = a.base ?? b.base;
    const offA = a.base === null ? null : a.base - base;
    const offB = b.base === null ? null : b.base - base;
    const at = (t) => (t.stretch ? `${t.key}@${t.stretch}` : t.key);
    return { key: `${at(a)}/${offA}|${at(b)}/${offB}`, base, offA, offB };
}
function commonest(lines, held) {
    const counts = new Map();
    lines.forEach((toks, l) => {
        const h = held[l];
        let last = '';
        let lastAt = -2;
        for (let i = 0; i + 1 < toks.length; i++) {
            if (h && (h[i] || h[i + 1]))
                continue;
            const k = pairOf(toks[i], toks[i + 1]).key;
            if (k === last && lastAt === i - 1)
                continue;
            counts.set(k, (counts.get(k) ?? 0) + 1);
            last = k;
            lastAt = i;
        }
    });
    let best = null;
    for (const [key, count] of counts)
        if (count >= 2 && (!best || count > best.count))
            best = { key, count };
    return best;
}
export const pairs = (f, see) => {
    const copiesOf = new Map();
    for (const r of f.rules.values())
        if (r.of)
            copiesOf.set(r.of, [...(copiesOf.get(r.of) ?? []), r]);
    const inside = [...f.rules.values()].filter((r) => !r.of).map((r) => r.key);
    let seqs = [
        ...f.lines.map((l) => [...l.toks]),
        ...inside.map((k) => f.rules.get(k).kids.map((c) => ({ key: c.key, base: c.off, ...(c.stretch ? { stretch: c.stretch } : {}) }))),
    ];
    let held = [
        ...f.lines.map(() => null),
        ...inside.map((k) => {
            const copies = copiesOf.get(k);
            return copies ? f.rules.get(k).kids.map((_, i) => copies.some((v) => v.patched[i])) : null;
        }),
    ];
    const copies = new Map([...copiesOf].map(([k, vs]) => [k, vs.map((v) => ({ ...v, kids: [...v.kids], patched: [...v.patched] }))]));
    const rules = new Map(f.rules);
    let made = 0;
    let next = Math.max(0, ...[...rules.keys()].map((k) => Number(k.slice(1)) || 0)) + 1;
    for (let best = commonest(seqs, held); best; best = commonest(seqs, held)) {
        const name = `s${next++}`;
        let rule = null;
        const nextHeld = [];
        seqs = seqs.map((toks, l) => {
            const h = held[l];
            const vs = l >= f.lines.length ? copies.get(inside[l - f.lines.length]) : undefined;
            const out = [];
            const outHeld = [];
            const kept = vs?.map(() => ({ kids: [], patched: [] }));
            for (let i = 0; i < toks.length; i++) {
                if (i + 1 < toks.length && !(h && (h[i] || h[i + 1]))) {
                    const p = pairOf(toks[i], toks[i + 1]);
                    if (p.key === best.key) {
                        rule ??= {
                            key: name,
                            kids: [
                                { key: toks[i].key, off: p.offA, ...(toks[i].stretch ? { stretch: toks[i].stretch } : {}) },
                                { key: toks[i + 1].key, off: p.offB, ...(toks[i + 1].stretch ? { stretch: toks[i + 1].stretch } : {}) },
                            ],
                        };
                        out.push({ key: name, base: p.base });
                        outHeld.push(false);
                        vs?.forEach((v, c) => {
                            const [a, b] = [v.kids[i], v.kids[i + 1]];
                            const q = pairOf({ key: a.key, base: a.off }, { key: b.key, base: b.off });
                            kept[c].kids.push({ key: name, off: q.base });
                            kept[c].patched.push(false);
                        });
                        i++;
                        continue;
                    }
                }
                out.push(toks[i]);
                outHeld.push(h?.[i] ?? false);
                vs?.forEach((v, c) => {
                    kept[c].kids.push(v.kids[i]);
                    kept[c].patched.push(v.patched[i]);
                });
            }
            vs?.forEach((v, c) => Object.assign(v, kept[c]));
            nextHeld.push(h ? outHeld : null);
            return out;
        });
        held = nextHeld;
        rules.set(name, rule);
        made++;
        see?.(now);
    }
    return made ? now() : null;
    function now() {
        const out = new Map(rules);
        inside.forEach((k, i) => out.set(k, { key: k, kids: seqs[f.lines.length + i].map((t) => ({ key: t.key, off: t.base, ...(t.stretch ? { stretch: t.stretch } : {}) })) }));
        for (const vs of copies.values())
            for (const v of vs)
                out.set(v.key, { ...v, kids: [...v.kids], patched: [...v.patched] });
        return { lines: f.lines.map((l, i) => ({ ...l, toks: seqs[i] })), rules: out, looks: f.looks };
    }
};
