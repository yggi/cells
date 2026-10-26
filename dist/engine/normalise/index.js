import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases } from "./aliases.js";
import { mainKey } from "./mainkey.js";
import { uses } from "./uses.js";
export const normalisations = (source, result) => [...uses(source), ...mainKey(source, result), ...aliases(source, result)];
export const normalise = (source, options) => rewriteAll(source, normalisations, ROUNDS, options);
