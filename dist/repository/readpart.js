import { givenOf, partOf } from "../engine/use.js";
import { associationOf } from "./declarations.js";
import { styleNamesIn } from "./files.js";
import { PART_OF, readAudition } from "./firstguess.js";
import { SEED_FILES } from "./seed.generated.js";
export function readPart(document, head, options) {
    const text = partOf(document, head);
    const given = givenOf(document, head);
    if (text === null || given === null)
        return null;
    const part = options.part ?? (options.facet === undefined ? undefined : PART_OF[options.facet]);
    return part ? readAudition(text, part, options.resolve, given) : null;
}
export const READ_AXES = { rhythm: ['sync'], harmony: ['harm'], motif: ['mood'] };
const HALF_AXIS = 0.5;
export function readPlace(reading, facet) {
    const point = {};
    const reach = {};
    for (const axis of READ_AXES[facet] ?? []) {
        const value = reading.point[axis];
        const sure = reading.confidence[axis];
        if (value === undefined || sure === undefined)
            continue;
        point[axis] = value;
        reach[axis] = (1 - sure) * HALF_AXIS;
    }
    return Object.keys(point).length ? { point, weight: 1, facet, reach } : null;
}
export function placeOfPart(document, head, options) {
    const text = partOf(document, head);
    if (text === null)
        return null;
    const declared = associationOf(text
        .split('\n')
        .filter((line) => !line.trim().startsWith('*'))
        .join('\n'), { styles: styleNamesIn(SEED_FILES) });
    if (declared?.explicit)
        return declared.association;
    const reading = readPart(document, head, options);
    const read = reading ? readPlace(reading, options.facet) : null;
    return read ? [read] : null;
}
