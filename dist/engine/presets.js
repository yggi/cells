import { ORDER } from "./order.js";
import { EXAMPLE_SOURCES } from "./examples.generated.js";
export const PRESETS = Object.fromEntries(ORDER.map((key) => {
    const source = EXAMPLE_SOURCES[key];
    if (source === undefined)
        throw new Error(`examples/${key}.cells is missing`);
    return [key, { source: source.replace(/\n$/, '') }];
}));
