import { compileSource } from "../compile.js";
import { candidates, size, suggestion } from "./harness.js";
import { runs } from "./runs.js";
import { phrases } from "./phrases.js";
import { fractions } from "./fractions.js";
import { sameCells } from "./same.js";
import { defaults } from "./defaults.js";
import { progressions } from "./progressions.js";
import { wrappers } from "./wrappers.js";
import { stereo } from "./stereo.js";
import { gates } from "./gates.js";
import { aliases } from "./aliases.js";
import { taps } from "./taps.js";
import { swings } from "./swing.js";
import { sections } from "./sections.js";
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
    return kept.map((r) => suggestion(source, r)).sort((a, b) => b.saving - a.saving);
}
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
        if (size(next) >= size(now))
            break;
        steps.push(`−${best.saving}: ${best.title}`);
        now = next;
    }
    return { source: now, steps };
}
