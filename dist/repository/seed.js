import { signatureOf } from "../engine/use.js";
import { readFragments } from "./files.js";
import { SEED_FILES } from "./seed.generated.js";
function readSeed() {
    const read = readFragments(SEED_FILES);
    if ('problems' in read)
        throw new Error(`The seed library doesn't read: ${read.problems.join('; ')}`);
    return read.files;
}
export const SEED = readSeed();
export const takenAs = (id, args) => `${id}(${Object.entries(args)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')})`;
export function boundText(text, args) {
    const signature = signatureOf(text);
    if (!signature)
        throw new Error(`boundText: a template's arguments, but the text has no signature`);
    const bound = Object.keys(args).map((k) => `&${k}`);
    for (const p of bound)
        if (!signature.optional.includes(p))
            throw new Error(`boundText: ${p} is none of the signature's optional parameters (${signature.optional.join(', ')})`);
    const optional = signature.optional.filter((p) => !bound.includes(p));
    const head = `${signature.names.join(', ')} from ${optional.length ? `(${optional.join(', ')}) ` : ''}${signature.main ?? ''}`.trimEnd();
    let wrote = false;
    return text
        .split('\n')
        .flatMap((line) => {
        if (/^\s*(?:&[A-Za-z_]\w*\s*,\s*)*&[A-Za-z_]\w*\s+from(?:\s|$)/.test(line) && !wrote && signatureOf(line)) {
            wrote = true;
            return [head];
        }
        if (bound.some((p) => new RegExp(`^\\s*${p}(?![A-Za-z0-9_])`).test(line)))
            return [];
        return [Object.entries(args).reduce((l, [k, v]) => l.replace(new RegExp(`&${k}(?![A-Za-z0-9_])`, 'g'), v), line)];
    })
        .join('\n');
}
export function fragmentsOf(file) {
    const { fragment } = file;
    const plain = fragment.association.filter((wp) => !wp.args);
    const sets = new Map();
    for (const wp of fragment.association) {
        if (!wp.args)
            continue;
        const id = takenAs(fragment.id, wp.args);
        const { args: _, ...point } = wp;
        sets.set(id, { args: wp.args, points: [...(sets.get(id)?.points ?? []), point] });
    }
    return [
        ...(plain.length ? [{ ...fragment, association: plain }] : []),
        ...[...sets].map(([id, { args, points }]) => ({ id, text: boundText(fragment.text, args), association: points })),
    ];
}
export const seedFragments = (folder) => SEED.filter((f) => f.path.startsWith(`${folder}/`)).flatMap(fragmentsOf);
