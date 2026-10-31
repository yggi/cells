import { parse } from "../engine/parser/index.js";
import { AXES, CENTRE as CENTRE_VALUES } from "../engine/style.js";
import { createRepository } from "./fragments.js";
import { INSTRUMENT_FRAGMENTS } from "./instruments.js";
import { resolveSeed } from "./library.js";
export const PERFORMER_VOICES = {
    bass: { voice: 'bassV', own: 'bass' },
    pad: { voice: 'padV', own: 'pad' },
    stab: { voice: 'keysV', own: 'keys' },
    lead: { voice: 'leadV', own: 'lead' },
};
export const CENTRE = Object.fromEntries(AXES.map((a, i) => [a.name, CENTRE_VALUES[i]]));
const repositories = new WeakMap();
const lineOf = (text, voice) => text.split('\n').find((l) => l.startsWith(`&${voice} `));
export function instrumentsAt(point, fragments = INSTRUMENT_FRAGMENTS) {
    let repository = repositories.get(fragments);
    if (!repository)
        repositories.set(fragments, (repository = createRepository(fragments)));
    const ranked = repository.query(point, fragments.length, {}, { facet: 'instrument' });
    const found = {};
    for (const [part, { voice, own }] of Object.entries(PERFORMER_VOICES)) {
        for (const { fragment } of ranked) {
            const line = lineOf(fragment.text, voice);
            if (line === undefined)
                continue;
            if (fragment.id !== own)
                found[part] = { id: fragment.id, line };
            break;
        }
    }
    return found;
}
export function bandAt(point, band = resolveSeed('band'), fragments = INSTRUMENT_FRAGMENTS) {
    const found = Object.values(instrumentsAt(point, fragments));
    if (!found.length)
        return band;
    const voiceOf = (line) => /^&(\w+)\s/.exec(line)?.[1];
    const by = new Map(found.map((f) => [voiceOf(f.line), f.line]));
    const lines = band.split('\n').map((l) => {
        const v = voiceOf(l);
        const line = v === undefined ? undefined : by.get(v);
        if (line === undefined)
            return l;
        by.delete(v);
        return line;
    });
    return [...lines, ...by.values()].join('\n');
}
function pointOf(p, decls) {
    const valuesOf = (name) => {
        const d = decls.get(name);
        if (d?.map?.kind !== 'style' || d.braid.kind !== 'list')
            return null;
        const v = d.braid.tokens.map((t) => (t.atom.kind === 'note' ? t.atom.value : NaN));
        return v.length === AXES.length && v.every((x) => Number.isFinite(x)) ? v : null;
    };
    if (p.kind === 'cell')
        return valuesOf(p.ref.name);
    const terms = p.terms.map((t) => ({ v: valuesOf(t.ref.name), w: t.weight }));
    if (terms.some((t) => !t.v))
        return null;
    return AXES.map((_, i) => terms.reduce((a, t) => a + t.w * t.v[i], 0));
}
export function scoreStyle(score) {
    const { cells } = parse(score);
    const decls = new Map(cells.map((c) => [c.name, c]));
    const style = decls.get('style')?.style;
    const v = style ? pointOf(style.from, decls) : null;
    return v ? Object.fromEntries(AXES.map((a, i) => [a.name, v[i]])) : null;
}
export function resolveBand(score, resolve = resolveSeed) {
    const text = bandAt(scoreStyle(score) ?? CENTRE);
    return (id, hash) => (id === 'band' ? text : resolve(id, hash));
}
