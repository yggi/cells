import { rewriteAll, ROUNDS } from "../rewrite.js";
import { aliases } from "./aliases.js";
export const normalisations = (source, result) => [...aliases(source, result)];
export const normalise = (source, options) => rewriteAll(source, normalisations, ROUNDS, options);
