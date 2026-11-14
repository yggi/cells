import { splitComment } from "./edit.js";
import { leftOf, readFrom, topTokens } from "./parser/use.js";
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
        return [
            {
                id: form.id,
                span: { line: i + 1, col: lead + token.at + 1, len },
                names: form.names,
                takes: form.takes,
                head: form.head,
                args: form.args,
                main: form.main,
            },
        ];
    });
}
const idOf = (id) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id) ? id : `"${id}"`);
export function fromLine({ names, takes = names, head = [], id, args = null, main = null }) {
    const written = args?.length ? `(${args.map((a) => `${a.name}=${a.value}`).join(', ')})` : '';
    return [leftOf(names, takes), ...head, 'from', `${idOf(id)}${written}`, ...(main ? [main] : [])].join(' ');
}
