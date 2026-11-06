import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases, filterModels } from "./aliases.js";
import { libraryCells, libraryLines } from "./library.js";
import { narrowestFroms } from "./narrowest.js";
import { fourFour, interfaceNames } from "./names.js";
import { migrations } from "../migrate/index.js";
export const normalisations = (options = {}) => (source, result) => [
    ...migrations(options)(source, result).filter((r) => !r.exact),
    ...interfaceNames(source, result),
    ...fourFour(source, result),
    ...aliases(source, result),
    ...filterModels(source, result),
    ...libraryLines(source, options.library),
    ...libraryCells(source, options.library),
    ...narrowestFroms(source, options.resolve),
];
export const normalise = (source, options) => {
    const old = { ...options, old: true };
    return rewriteAll(source, normalisations(old), ROUNDS, old);
};
