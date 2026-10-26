import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases } from "./aliases.js";
import { uses } from "./uses.js";
export const normalisations = (source, result) => [...uses(source), ...aliases(source, result)];
export const normalise = (source, options) => rewriteAll(source, normalisations, ROUNDS, options);
