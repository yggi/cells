import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases, filterModels } from "./aliases.js";
import { libraryCells, libraryLines, libraryTemplates } from "./library.js";
import { narrowestFroms } from "./narrowest.js";
import { interfaceNames } from "./names.js";
import { evenScan, shadowMeter, swingClock, tapClock } from "./meter.js";
import { migrations } from "../migrate/index.js";
import { mainMeters } from "../migrate/mainmeter.js";
import { oneRoot } from "../migrate/oneroot.js";
export const normalisations = (options = {}) => (source, result) => [
    ...migrations(options)(source, result).filter((r) => !r.exact && r.rule !== 'main meter' && r.rule !== 'one root'),
    ...interfaceNames(source, result),
    ...evenScan(source, result),
    ...swingClock(source, result),
    ...shadowMeter(source, result),
    ...tapClock(source, result, options),
    ...aliases(source, result),
    ...filterModels(source, result),
    ...libraryLines(source, options.library),
    ...libraryTemplates(source, options.library, options.resolve),
    ...libraryCells(source, options.library),
    ...narrowestFroms(source, options.resolve),
    ...oneRoot(source, result),
    ...mainMeters(source, result),
];
export const normalise = (source, options) => {
    const old = { ...options, old: true };
    return rewriteAll(source, normalisations(old), ROUNDS, old);
};
