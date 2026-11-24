import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases, filterModels } from "./aliases.js";
import { libraryCells, libraryLines, libraryTemplates, takenArguments } from "./library.js";
import { narrowestFroms } from "./narrowest.js";
import { interfaceNames } from "./names.js";
import { evenScan, swingClock } from "./meter.js";
import { seeds } from "./seeds.js";
export { seeds };
export const SEED_ROUNDS = 400;
import { migrations } from "../migrate/index.js";
export const normalisations = (options = {}) => (source, result) => {
    const names = interfaceNames(source, result);
    const naming = new Set(names.flatMap((r) => (r.rule === 'bar' ? [result.mainMeter] : r.rule === 'tempo' ? ['bar'] : r.rule === 'key' ? [result.mainKey] : r.rule === 'tonic' ? ['key'] : [])));
    const folds = swingClock(source, result);
    if (folds.length && result.mainMeter)
        naming.add(result.mainMeter);
    return [
        ...migrations(options)(source, result),
        ...names,
        ...evenScan(source, result),
        ...folds,
        ...aliases(source, result),
        ...filterModels(source, result),
        ...libraryLines(source, options.library),
        ...libraryTemplates(source, options.library, options.resolve).filter((r) => !naming.has(r.id.split(':')[2])),
        ...takenArguments(source),
        ...libraryCells(source, options.library),
        ...narrowestFroms(source, options.resolve),
    ];
};
export const normalise = (source, options) => {
    const old = { ...options, old: true };
    const first = rewriteAll(source, normalisations(old), ROUNDS, old);
    const then = rewriteAll(first.source, seeds, SEED_ROUNDS, old);
    return { source: then.source, steps: [...first.steps, ...then.steps] };
};
