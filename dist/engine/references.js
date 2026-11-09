import { splitComment } from "./edit.js";
import { readFrom, topTokens } from "./parser/use.js";
export function references(text) {
    return text.split('\n').flatMap((raw, i) => {
        const code = splitComment(raw)[0];
        const trimmed = code.trim();
        const form = readFrom(trimmed);
        if (!form || form.kind !== 'use')
            return [];
        const lead = code.length - code.trimStart().length;
        const tokens = topTokens(trimmed);
        const at = tokens.findIndex((t) => t.text === 'from');
        const token = tokens[at + 1];
        if (at < 0 || !token)
            return [];
        const len = token.text.startsWith('"') ? form.id.length + 2 : form.id.length;
        return [{ id: form.id, span: { line: i + 1, col: lead + token.at + 1, len }, names: form.names, args: form.args, main: form.main }];
    });
}
