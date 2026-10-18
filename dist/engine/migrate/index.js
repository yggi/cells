import { rewriteAll } from "../rewrite.js";
import { gates } from "./gates.js";
import { taps } from "./taps.js";
import { swings } from "./swing.js";
import { sections } from "./sections.js";
export const migrations = (source, result) => [
    ...gates(source, result),
    ...taps(source, result),
    ...swings(source, result),
    ...sections(source, result),
];
export const migrate = (source) => rewriteAll(source, migrations);
