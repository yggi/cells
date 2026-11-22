import { splitComment } from "../engine/edit.js";
import { BY_FRAGMENT } from "../engine/fills.js";
import { readFrom } from "../engine/parser/use.js";
import { expand } from "../engine/use.js";
import { resolveSeed } from "./library.js";
export const answered = (text, resolve = resolveSeed) => text
    .split('\n')
    .flatMap((l) => {
    const f = readFrom(splitComment(l)[0].trim());
    return f?.kind === 'use' && BY_FRAGMENT.has(f.id) ? expand(l.trim(), resolve).split('\n').filter(Boolean) : [l];
})
    .join('\n');
