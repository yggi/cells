import { ORDER } from "./order.js";
import { readPiece } from "./piecefile.js";
import { EXAMPLE_FILES } from "./examples.generated.js";
export const PRESETS = Object.fromEntries(ORDER.map((key) => {
    const file = EXAMPLE_FILES[key];
    if (file === undefined)
        throw new Error(`examples/${key}.md is missing`);
    const piece = readPiece(file);
    if ('problems' in piece)
        throw new Error(`examples/${key}.md: ${piece.problems.map((p) => `line ${p.line}: ${p.message}`).join('; ')}`);
    return [key, { source: piece.text, file }];
}));
