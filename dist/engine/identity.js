import { declarations } from "../repository/fit.js";
import { canonicalText } from "../repository/learned.js";
import { normalise } from "./normalise/index.js";
export const byteIdentical = (a, b) => a === b;
const layout = (text) => declarations(text)
    .map((l) => l.code)
    .join('\n');
export const identicalUpToLayout = (a, b) => layout(a) === layout(b);
export const identicalUpToRenaming = (a, b) => canonicalText(a) === canonicalText(b);
export const normalFormIdentical = (a, b) => identicalUpToRenaming(normalise(a).source, normalise(b).source);
