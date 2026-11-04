import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases } from "./aliases.js";
import { libraryCells, libraryLines } from "./library.js";
import { fourFour, interfaceNames } from "./names.js";
import { migrations } from "../migrate/index.js";
export const normalisations = (options = {}) => (source, result) => [
    ...migrations(options)(source, result).filter((r) => !r.exact),
    ...interfaceNames(source, result),
    ...fourFour(source, result),
    ...aliases(source, result),
    ...libraryLines(source, options.library),
    ...libraryCells(source, options.library),
];
export const normalise = (source, options) => rewriteAll(source, normalisations(options), ROUNDS, options);
