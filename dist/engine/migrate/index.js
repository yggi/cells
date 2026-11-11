import { rewriteAll, ROUNDS } from "../rewrite.js";
import { gates } from "./gates.js";
import { taps } from "./taps.js";
import { swings } from "./swing.js";
import { mainKey } from "./mainkey.js";
import { forwardedUses } from "./forwarded.js";
import { grids } from "./grids.js";
import { laps } from "./laps.js";
import { renamedIds } from "./renamed.js";
import { movedIds } from "./moved.js";
import { oneshots } from "./oneshot.js";
import { pairs } from "./pairs.js";
import { beats } from "./beats.js";
import { notes } from "./notes.js";
import { argumentsByName } from "./arguments.js";
import { parts } from "./parts.js";
import { axes } from "./axes.js";
export const migrations = (options = {}) => (source, result) => [
    ...gates(source, result, options),
    ...taps(source, result, options),
    ...swings(source, result, options),
    ...mainKey(source, result),
    ...forwardedUses(source, options.resolve),
    ...grids(source, result, options),
    ...laps(source, result),
    ...renamedIds(source, options.resolve),
    ...oneshots(source),
    ...pairs(source),
    ...beats(source, result, options),
    ...notes(source, result),
    ...argumentsByName(source, result, options.resolve),
    ...axes(source),
    ...parts(source, result),
    ...movedIds(source, options.resolve),
];
export const migrate = (source, options = {}) => {
    const old = { ...options, old: true };
    return rewriteAll(source, migrations(old), ROUNDS, old);
};
