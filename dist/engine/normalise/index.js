import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases, filterModels } from "./aliases.js";
import { libraryCells, libraryLines, libraryTemplates } from "./library.js";
import { narrowestFroms } from "./narrowest.js";
import { interfaceNames } from "./names.js";
import { evenScan, swingClock } from "./meter.js";
import { migrations } from "../migrate/index.js";
export const normalisations = (options = {}) => (source, result) => [
    ...migrations(options)(source, result).filter((r) => !r.exact),
    ...interfaceNames(source, result),
    ...evenScan(source, result),
    ...swingClock(source, result),
    ...aliases(source, result),
    ...filterModels(source, result),
    ...libraryLines(source, options.library),
    ...libraryTemplates(source, options.library, options.resolve),
    ...libraryCells(source, options.library),
    ...narrowestFroms(source, options.resolve),
];
export const normalise = (source, options) => {
    const old = { ...options, old: true };
    return rewriteAll(source, normalisations(old), ROUNDS, old);
};
