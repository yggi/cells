import { candidates, size, suggestion } from "./harness.js";
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
export function shorten(source) {
    const { result, cells } = candidates(source);
    if (!result.ok)
        return [];
    const found = [
        ...runs(source, cells),
        ...phrases(source, cells, result),
        ...fractions(source, cells, result),
        ...sameCells(source, result),
        ...defaults(source, result),
        ...progressions(source, result),
        ...wrappers(source, result),
        ...stereo(source, result),
        ...gates(source, result),
        ...aliases(source, result),
        ...taps(source, result),
        ...swings(source, result),
        ...sections(source, result),
        ...card(source),
    ];
    return found.map((r) => suggestion(source, r)).sort((a, b) => b.saving - a.saving);
}
export function shortenAll(source, rounds = 60) {
    let now = source;
    const steps = [];
    for (let i = 0; i < rounds; i++) {
        const best = shorten(now).find((s) => s.kind !== 'card');
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
