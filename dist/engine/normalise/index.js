import { rewriteAll } from "../rewrite.js";
import { aliases } from "./aliases.js";
export const normalisations = (source, result) => [...aliases(source, result)];
export const normalise = (source) => rewriteAll(source, normalisations);
