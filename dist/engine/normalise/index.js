import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases, filterModels } from "./aliases.js";
import { libraryCells, libraryLines, libraryTemplates, takenArguments } from "./library.js";
import { narrowestFroms } from "./narrowest.js";
import { interfaceNames } from "./names.js";
import { evenScan, swingClock } from "./meter.js";
import { seeds } from "./seeds.js";
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
        ...seeds(source, result),
    ];
};
export const normalise = (source, options) => {
    return rewriteAll(source, normalisations(options), ROUNDS, options);
};
