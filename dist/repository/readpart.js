import { givenOf, partOf } from "../engine/use.js";
import { PART_OF, readAudition } from "./firstguess.js";
export function readPart(document, head, options) {
    const text = partOf(document, head);
    const given = givenOf(document, head);
    if (text === null || given === null)
        return null;
    const part = options.part ?? (options.facet === undefined ? undefined : PART_OF[options.facet]);
    return part ? readAudition(text, part, options.resolve, given) : null;
}
