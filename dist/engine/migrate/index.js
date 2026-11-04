import { rewriteAll, ROUNDS } from "../rewrite.js";
import { gates } from "./gates.js";
import { taps } from "./taps.js";
import { sections } from "./sections.js";
import { swings } from "./swing.js";
import { uses } from "./uses.js";
import { mainKey } from "./mainkey.js";
import { forwardedUses } from "./forwarded.js";
import { fromUses } from "./from.js";
import { grids } from "./grids.js";
import { laps } from "./laps.js";
export const migrations = (options = {}) => (source, result) => [
    ...gates(source, result, options),
    ...taps(source, result, options),
    ...sections(source, result, options),
    ...swings(source, result, options),
    ...uses(source),
    ...mainKey(source, result),
    ...forwardedUses(source, options.resolve),
    ...fromUses(source, options.resolve),
    ...grids(source, result, options),
    ...laps(source, result),
];
export const migrate = (source, options = {}) => rewriteAll(source, migrations(options), ROUNDS, options);
