import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases } from "./aliases.js";
import { mainKey } from "./mainkey.js";
import { forwardedUses } from "./forwarded.js";
import { libraryCells, libraryLines } from "./library.js";
import { fourFour, interfaceNames } from "./names.js";
import { uses } from "./uses.js";
export const normalisations = (options = {}) => (source, result) => [
    ...uses(source),
    ...forwardedUses(source, options.resolve),
    ...mainKey(source, result),
    ...interfaceNames(source, result),
    ...fourFour(source, result),
    ...aliases(source, result),
    ...libraryLines(source, options.library),
    ...libraryCells(source, options.library),
];
export const normalise = (source, options) => rewriteAll(source, normalisations(options), ROUNDS, options);
