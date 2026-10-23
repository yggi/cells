import { declLine, setAttr, splitComment } from "../edit.js";
import { CARD, parse, pieceMeta, plainLabel } from "../parser/index.js";
import { isNote } from "../ast.js";
import { isPieceFile, writePiece } from "../piecefile.js";
import { soundsIdentical } from "../sameness.js";
function cardOf(text) {
    const meta = pieceMeta(text);
    if (meta?.cell)
        return meta.cell;
    return parse(text).cells.some((c) => c.name === CARD && isNote(c) && c.label) ? CARD : null;
}
export function movedCard(text) {
    const name = isPieceFile(text) ? null : cardOf(text);
    if (!name)
        return null;
    const meta = pieceMeta(text);
    let next = text;
    for (const key of ['title', 'tags', 'tier'])
        next = setAttr(next, name, key, null);
    const bare = setAttr(setAttr(next, name, 'label', null), name, 'about', null);
    const at = declLine(bare, name);
    if (at < 0)
        return null;
    const lines = bare.split('\n');
    const [code, comment] = splitComment(lines[at]);
    const goes = code.trim() === `&${name}`;
    if (!goes && !meta)
        return null;
    if (goes)
        comment ? (lines[at] = comment) : lines.splice(at, 1);
    const description = goes ? plainLabel(parse(text).cells.find((c) => c.name === name)?.label ?? '') : '';
    return {
        frontmatter: {
            ...(meta ? { title: meta.title } : {}),
            ...(meta?.tags.length ? { tags: meta.tags } : {}),
            ...(meta && meta.tier !== null ? { tier: meta.tier } : {}),
            ...(description ? { description } : {}),
        },
        text: goes ? lines.join('\n') : next,
    };
}
export function card(source, options = {}) {
    const moved = movedCard(source);
    const name = cardOf(source);
    if (!moved || !name || !soundsIdentical(source, moved.text, undefined, options))
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
            title: `&${name} says what the piece is: its title, tags, tier and label (its description) go in the file's frontmatter, the piece in its cells block (decision 047)`,
            before: source.split('\n')[at].trim(),
            after: moved.text.split('\n')[declLine(moved.text, name)]?.trim() ?? '',
            apply,
        },
    ];
}
