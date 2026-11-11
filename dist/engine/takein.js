import { compileSource } from "./compile.js";
import { declLine, splitComment } from "./edit.js";
import { readFrom } from "./parser/use.js";
import { expansion, signatureOf } from "./use.js";
export function takeIn(text, name, options = {}) {
    if (declLine(text, name) >= 0)
        return { text };
    const lines = text.split('\n');
    for (const raw of lines) {
        const f = readFrom(splitComment(raw)[0].trim());
        if (f?.kind !== 'use' || !f.names?.includes(`&${name}`))
            continue;
        const theirs = options.resolve?.(f.id) ?? null;
        if (theirs !== null && signatureOf(theirs) !== null) {
            if (f.names.length === 1)
                return { text };
            return {
                why: `&${name} is one of ${f.names.join(', ')}, which one line takes from ${f.id}: an attribute before from is one head's, so write it on a line of the head's own`,
            };
        }
    }
    const x = expansion(text, options);
    const origin = x.origins.get(name);
    if (!origin?.length)
        return { why: `&${name} is not a cell this piece is given by a from line` };
    const at = origin[0].line - 1;
    const take = readFrom(splitComment(lines[at] ?? '')[0].trim());
    if (take?.kind !== 'use')
        return { why: `&${name} came through no from line of the piece's` };
    const theirs = options.resolve?.(take.id) ?? null;
    const template = theirs !== null && signatureOf(theirs) !== null;
    if (template && take.names !== null)
        return { why: `&${name} is ${take.id}'s copy's own: change it through the from line's arguments` };
    const added = x.text.split('\n');
    const own = added.findIndex((l, i) => i >= lines.length && new RegExp(`^\\s*&${name}(?![A-Za-z0-9_])`).test(l));
    if (own < 0)
        return { why: `&${name} has no line of its own in the expansion` };
    let end = own;
    while (end + 1 < added.length && /[+*,[]\s*$/.test(splitComment(added[end])[0]))
        end++;
    const written = added.slice(own, end + 1);
    const out = lines.flatMap((raw, i) => {
        if (i !== at || take.names === null)
            return [raw];
        const left = take.names.filter((n) => n !== `&${name}`);
        if (!left.length)
            return [];
        const [code, comment] = splitComment(raw);
        return [code.replace(/^(\s*)[^]*?(?=\s+from\s)/, `$1${left.join(', ')}`) + comment];
    });
    const after = at + (out.length < lines.length ? 0 : 1);
    const result = [...out.slice(0, after), ...written, ...out.slice(after)].join('\n');
    const errors = (t) => compileSource(t, undefined, options).diagnostics.flatMap((d) => (d.severity === 'error' ? [d.message] : []));
    const before = new Set(errors(text));
    const now = errors(result).filter((m) => !before.has(m));
    return now.length ? { why: `&${name}'s line, written into the piece, doesn't compile there: ${now[0]}` } : { text: result };
}
