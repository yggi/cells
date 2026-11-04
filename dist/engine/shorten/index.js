import { compileSource } from "../compile.js";
import { candidates, savesChars, size, structure, suggestion } from "./harness.js";
import { runs } from "./runs.js";
import { phrases } from "./phrases.js";
import { fractions } from "./fractions.js";
import { sameCells } from "./same.js";
import { defaults } from "./defaults.js";
import { progressions } from "./progressions.js";
import { wrappers } from "./wrappers.js";
import { stereo } from "./stereo.js";
import { gates } from "../migrate/gates.js";
import { aliases } from "./aliases.js";
import { taps } from "../migrate/taps.js";
import { swings } from "../migrate/swing.js";
import { sections } from "../migrate/sections.js";
import { card } from "./card.js";
export function shorten(source, options = {}) {
    const { result, cells } = candidates(source, options);
    if (!result.ok)
        return [];
    const found = [
        ...runs(source, cells),
        ...phrases(source, cells, result, options),
        ...fractions(source, cells, result),
        ...sameCells(source, result, options),
        ...defaults(source, result, options),
        ...progressions(source, result, options),
        ...wrappers(source, result, options),
        ...stereo(source, result, options),
        ...gates(source, result, options),
        ...aliases(source, result),
        ...taps(source, result, options),
        ...swings(source, result, options),
        ...sections(source, result, options),
        ...card(source, options),
    ];
    const kept = result.uses?.length ? found.filter((r) => r.rule === 'card' || keepsUsed(r, source, options, overridden(result))) : found;
    const chars = new Map(kept.map((r) => [r.id, savesChars(source, r) ?? 0]));
    return kept
        .map((r) => suggestion(source, r))
        .filter((s) => RESPELLINGS.has(s.kind) || s.saving > 0)
        .sort((a, b) => b.saving - a.saving || chars.get(b.id) - chars.get(a.id));
}
const RESPELLINGS = new Set(['gate', 'tap', 'swing', 'section', 'card', 'alias', 'fraction', 'progression']);
const overridden = (r) => (r.uses ?? [])
    .flatMap((u) => u.overrode)
    .sort()
    .join(' ');
function keepsUsed(r, source, options, before) {
    try {
        const next = compileSource(r.apply(source), undefined, options);
        return next.ok && overridden(next) === before;
    }
    catch {
        return false;
    }
}
export function shortenAll(source, rounds = 60, options = {}) {
    let now = source;
    const steps = [];
    for (let i = 0; i < rounds; i++) {
        const best = shorten(now, options).find((s) => s.kind !== 'card');
        if (!best)
            break;
        const next = best.apply(now);
        const saved = structure(now) - structure(next);
        if (saved < 0 || (saved === 0 && size(next) >= size(now)))
            break;
        steps.push(saved ? `−${saved}: ${best.title}` : `−${size(now) - size(next)} characters: ${best.title}`);
        now = next;
    }
    return { source: now, steps };
}
