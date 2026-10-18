import { declLine, setAttr, splitComment } from "../edit.js";
import { pieceMeta } from "../parser/index.js";
import { isPieceFile, writePiece } from "../piecefile.js";
import { soundsIdentical } from "../sameness.js";
export function movedCard(text) {
    const meta = isPieceFile(text) ? null : pieceMeta(text);
    if (!meta?.cell)
        return null;
    const name = meta.cell;
    let next = text;
    for (const key of ['title', 'tags', 'tier'])
        next = setAttr(next, name, key, null);
    const at = declLine(next, name);
    if (at < 0)
        return null;
    const lines = next.split('\n');
    const [code, comment] = splitComment(lines[at]);
    if (code.trim() === `&${name}`)
        comment ? (lines[at] = comment) : lines.splice(at, 1);
    return {
        frontmatter: { title: meta.title, ...(meta.tags.length ? { tags: meta.tags } : {}), ...(meta.tier !== null ? { tier: meta.tier } : {}) },
        text: lines.join('\n'),
    };
}
export function card(source) {
    const moved = movedCard(source);
    const name = pieceMeta(source)?.cell;
    if (!moved || !name || !soundsIdentical(source, moved.text))
        return [];
    const apply = (s) => {
        const m = movedCard(s);
        return m ? writePiece({ frontmatter: m.frontmatter, text: m.text, prose: '' }) : s;
    };
    const at = declLine(source, name);
    return [
        {
            id: `card:${name}`,
            tool: 'migrate',
            rule: 'card',
            title: `&${name} says what the piece is: its title, tags and tier go in the file's frontmatter, the piece in its cells block (decision 047)`,
            before: source.split('\n')[at].trim(),
            after: moved.text.split('\n')[declLine(moved.text, name)]?.trim() ?? '',
            apply,
        },
    ];
}
