const holds = (e, sortOf, sorts) => e.k === 'ref'
    ? sorts.includes(sortOf(e.ref.name))
    : e.k === 'num'
        ? false
        : e.k === 'prod'
            ? e.factors.some((f) => holds(f, sortOf, sorts))
            : e.items.some((it) => holds(it.e, sortOf, sorts));
export class AlgebraError extends Error {
    span;
    constructor(message, span) {
        super(message);
        this.span = span;
    }
}
const spanOf = (e) => (e.k === 'ref' ? e.ref.span : e.span);
const ACT = { k: 'act', terms: [], plain: [], offset: 0, gain: 1 };
const volumeTerm = (ref) => ({ ref, sign: 1, inSum: false });
const isVolume = (sortOf, t) => sortOf(t.ref.name) === 'volume' || (sortOf(t.ref.name) === 'plain' && !t.inSum);
export function distribute(e, sortOf, why) {
    const t = typeOf(e, sortOf);
    if (t.k === 'signal')
        return [...t.bindings];
    if (t.k === 'num')
        throw new AlgebraError('A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)', spanOf(e));
    const names = [...t.terms.map((x) => x.ref.name), ...t.plain.map((r) => r.name)];
    const hint = why?.(names);
    throw new AlgebraError(`${names.map((n) => '&' + n).join(' * ')} has no voice: a product needs one sound (a voice, a mix, a pattern read through a kit) — &theme * &lead${hint ? `. ${hint}` : ''}`, spanOf(e));
}
function typeOf(e, sortOf, mode = 'auto') {
    if (e.k === 'num')
        return { k: 'num', value: e.value };
    if (e.k === 'ref') {
        if (e.level !== undefined)
            throw new AlgebraError(`&${e.ref.name}:0:${+e.level.toFixed(3)} is a hit's gain, in a groove: in a mix, a gain is a number (&${e.ref.name} * ${+e.level.toFixed(3)})`, e.ref.span);
        const s = sortOf(e.ref.name);
        if (s === 'signal' || (s === 'wave' && mode === 'auto'))
            return { k: 'signal', bindings: [{ voice: e.ref, pitches: [], offset: 0, gain: 1 }] };
        if (s === 'plain')
            return { ...ACT, plain: [e.ref] };
        return { ...ACT, terms: [{ ref: e.ref, sign: 1, inSum: false }] };
    }
    if (e.k === 'prod') {
        const m = mode === 'pitch' || holds(e, sortOf, ['signal']) ? 'pitch' : 'auto';
        return e.factors.map((f) => typeOf(f, sortOf, m)).reduce((a, b, i) => times(a, b, spanOf(e.factors[i])));
    }
    return sum(e, sortOf, mode);
}
function times(a, b, at) {
    if (a.k === 'num' && b.k === 'num')
        return { k: 'num', value: a.value * b.value };
    if (a.k === 'signal' && b.k === 'signal')
        throw new AlgebraError(`Two sounds can't multiply (&${a.bindings[0].voice.name} * &${b.bindings[0].voice.name}): mix them with + or ,`, at);
    if (a.k === 'signal' || b.k === 'signal') {
        const [s, x, before] = a.k === 'signal' ? [a, b, false] : [b, a, true];
        const act = x.k === 'num' ? { ...ACT, gain: x.value } : x;
        const terms = [...act.terms, ...act.plain.map(volumeTerm)];
        return {
            k: 'signal',
            bindings: s.bindings.map((bd) => ({
                ...bd,
                pitches: before ? [...terms, ...bd.pitches] : [...bd.pitches, ...terms],
                offset: bd.offset + act.offset,
                gain: bd.gain * act.gain,
            })),
        };
    }
    const x = a.k === 'num' ? { ...ACT, gain: a.value } : a;
    const y = b.k === 'num' ? { ...ACT, gain: b.value } : b;
    return {
        k: 'act',
        terms: [...x.terms, ...x.plain.map(volumeTerm), ...y.terms, ...y.plain.map(volumeTerm)],
        plain: [],
        offset: x.offset + y.offset,
        gain: x.gain * y.gain,
    };
}
function sum(e, sortOf, mode) {
    const m = mode === 'pitch' || (!holds(e, sortOf, ['signal']) && holds(e, sortOf, ['pitch', 'plain'])) ? 'pitch' : 'auto';
    const items = e.items.map((it) => ({ t: typeOf(it.e, sortOf, m), sign: it.sign, span: spanOf(it.e) }));
    if (items.every((x) => x.t.k === 'num'))
        return { k: 'num', value: items.reduce((s, x) => s + x.sign * x.t.value, 0) };
    if (items.some((x) => x.t.k === 'signal')) {
        const bindings = [];
        for (const x of items) {
            if (x.t.k === 'num')
                throw new AlgebraError('A number is a gain or a pitch: it needs a voice (&theme * &lead * 0.8)', x.span);
            if (x.t.k === 'act')
                throw new AlgebraError("A pitch or a volume can't be added to a sound: it acts on one (&theme * &lead)", x.span);
            if (x.sign < 0)
                throw new AlgebraError("Sounds mix with +; there's no subtracting a voice", x.span);
            bindings.push(...x.t.bindings);
        }
        return { k: 'signal', bindings };
    }
    const terms = [];
    let offset = 0;
    for (const { t, sign, span } of items) {
        if (t.k === 'num') {
            offset += sign * t.value;
            continue;
        }
        const act = t;
        if (act.gain !== 1)
            throw new AlgebraError('A gain inside a pitch sum: gains multiply the sound — (&theme + 12) * &lead * 0.8', span);
        for (const term of act.terms) {
            if (term.inSum === false && !isPitchTerm(term, sortOf))
                throw new AlgebraError(`&${term.ref.name} is a volume: it multiplies, it can't be added — &theme * &${term.ref.name} * &lead`, term.ref.span);
            terms.push({ ...term, sign: (term.sign * sign), inSum: true });
        }
        for (const r of act.plain)
            terms.push({ ref: r, sign, inSum: true });
        offset += sign * act.offset;
    }
    return { k: 'act', terms, plain: [], offset, gain: 1 };
}
const isPitchTerm = (t, sortOf) => !isVolume(sortOf, t);
