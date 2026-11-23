export const SLOT_OPERATORS = ['rotate', 'reverse', 'swap', 'substitute'];
export function fixedOf(mask, n) {
    return [...new Set(mask.map((k) => (k < 0 ? n + k : k)).filter((k) => Number.isInteger(k) && k >= 0 && k < n))].sort((a, b) => a - b);
}
export function spansOf(n, fixed) {
    if (!fixed.length)
        return [Array.from({ length: n }, (_, s) => s)];
    return fixed.map((start, k) => {
        const end = fixed[(k + 1) % fixed.length] + (k + 1 === fixed.length ? n : 0);
        return Array.from({ length: end - start - 1 }, (_, j) => (start + 1 + j) % n);
    });
}
export function slotMoves(keys, fixed, operators) {
    const n = keys.length;
    const free = (s) => !fixed.includes(s);
    const identity = Array.from({ length: n }, (_, s) => s);
    const changes = (from) => from.some((f, s) => keys[f] !== keys[s]);
    const respanned = (place) => {
        const from = [...identity];
        for (const span of spansOf(n, fixed))
            for (const [j, s] of span.entries())
                from[s] = span[place(span, j)];
        return from;
    };
    const firsts = identity.filter((s) => keys.indexOf(keys[s]) === s);
    const out = [];
    const push = (move) => changes(move.from) && out.push(move);
    for (const operator of operators) {
        if (operator === 'rotate')
            push({ operator, amounts: [], from: respanned((span, j) => (j + span.length - 1) % span.length), what: 'each span a slot later, its last to its first' });
        else if (operator === 'reverse')
            push({ operator, amounts: [], from: respanned((span, j) => span.length - 1 - j), what: 'each span in reverse order, the fixed slots kept' });
        else if (operator === 'swap')
            for (let s = 0; s + 1 < n; s++) {
                if (!free(s) || !free(s + 1))
                    continue;
                const from = [...identity];
                [from[s], from[s + 1]] = [s + 1, s];
                push({ operator, amounts: [s], from, what: `slots ${s} and ${s + 1} exchanged` });
            }
        else if (operator === 'substitute')
            for (let s = 0; s < n; s++) {
                if (!free(s))
                    continue;
                for (const j of firsts) {
                    if (keys[j] === keys[s])
                        continue;
                    const from = [...identity];
                    from[s] = j;
                    push({ operator, amounts: [s, j], from, what: `slot ${s} plays slot ${j}'s` });
                }
            }
    }
    return out;
}
export function slotReference(name, before, after) {
    const delta = [];
    let kept = 0;
    for (const [s, slot] of after.entries()) {
        if (slot === before[s]) {
            kept++;
            continue;
        }
        if (kept)
            delta.push(kept === 1 ? '=' : `=!${kept}`);
        delta.push(slot);
        kept = 0;
    }
    if (!delta.length)
        return null;
    const form = `base=${name} ${delta.join(' ')}`;
    return { form, line: (cell) => `&${cell} ${form}` };
}
export function shiftMoves(n, fixed, amounts, movable) {
    const out = [];
    for (let slot = 0; slot < n; slot++)
        if (!fixed.includes(slot) && movable(slot))
            for (const by of amounts)
                if (by !== 0)
                    out.push({ slot, by });
    return out;
}
