import { compileSource } from "../engine/compile.js";
import { toCore } from "../engine/core/index.js";
import { declLine, deleteCell, splitComment } from "../engine/edit.js";
import { parse } from "../engine/parser/index.js";
import { readFrom } from "../engine/parser/use.js";
import { signatureOf } from "../engine/use.js";
import { holesOf } from "./holes.js";
const H = { voice: '_hv', line: '_hl', meter: '_hbar', card: '_hout', read: '_hr' };
function standIn(name, sound) {
    const bare = name.replace(/^&/, '');
    if (sound)
        return `&${bare} s=sine loop=C4`;
    if (bare === 'tempo')
        return `&${bare} step=2`;
    if (bare === 'bar')
        return `&${bare} meter("4/4") step=2`;
    if (bare === 'key')
        return `&${bare} scale(major)`;
    return `&${bare} step=pulse*2 0 2 4 5`;
}
function entryOf(result, head) {
    const c = result.cells.get(head);
    if (!c)
        return null;
    if (c.map?.kind === 'role' || c.map?.kind === 'adsr' || c.map?.kind === 'style')
        return null;
    if (c.gate)
        return { entry: `&${head}` };
    if (c.voice)
        return { entry: `&${H.line} * &${head}` };
    if (c.map?.kind === 'sample' || c.sort === 'signal')
        return { entry: `&${head}` };
    if (c.meter && result.clocks.get(head)?.cell === head)
        return { entry: `&${H.read} * &${H.voice}`, line: `&${H.read} step=&${head}:pulse 0 2 4 5` };
    if (c.meter || c.scan || !c.clock)
        return { entry: `&${H.read} * &${H.voice}`, line: `&${H.read} over=&${head} step=&${H.line}:pulse 0 1 2 3` };
    if (c.steps > 0)
        return { entry: `&${head} * &${H.voice}` };
    return null;
}
function unreadGone(text, keep) {
    let now = text;
    for (let gone = true; gone;) {
        gone = false;
        for (const d of parse(now).cells) {
            if (keep.has(d.name))
                continue;
            const ref = new RegExp(`&${d.name}(?![A-Za-z0-9_])`);
            const own = declLine(now, d.name);
            if (!now.split('\n').some((l, i) => i !== own && ref.test(l))) {
                now = deleteCell(now, d.name);
                gone = true;
            }
        }
    }
    return now;
}
export function coreFragment(text, options = {}) {
    const sig = signatureOf(text);
    if (!sig)
        return { source: text, why: 'no signature: a collection is cored as a piece' };
    const compiled = (t) => compileSource(t, undefined, options);
    const holes = holesOf(text, compiled, options.resolve);
    const stands = holes.uses.map((u) => standIn(u, holes.sounds.includes(u)));
    const declares = (t, name) => parse(t).cells.some((d) => d.name === name);
    const base = [text, ...stands, `&${H.voice} s=sine loop=C4`];
    const meterless = !holes.uses.includes('&bar') && !declares(text, 'bar');
    if (meterless)
        base.push(`&${H.meter} meter("4/4") step=2`);
    base.push(`&${H.line} step=${meterless ? `&${H.meter}:` : ''}pulse*2 0 2 4 5`);
    const first = compiled(base.join('\n'));
    const heads = sig.names.map((n) => n.replace(/^&/, ''));
    const entries = heads.flatMap((h) => {
        const e = entryOf(first, h);
        return e ? [e] : [];
    });
    if (!entries.length)
        return { source: text, why: 'no head plays in a host: nothing to hear its rewrites by' };
    const host = [...base, ...entries.flatMap((e) => (e.line ? [e.line.replace(`step=&`, `step=&`)] : [])), `&${H.card} map=sample [${entries.map((e) => e.entry).join(', ')}]`].join('\n');
    const hosted = compiled(host);
    if (!hosted.ok)
        return { source: text, why: `the host doesn’t compile: ${hosted.diagnostics.find((d) => d.severity === 'error')?.message ?? ''}` };
    const hostNames = [...holes.uses.map((u) => u.replace(/^&/, '')), ...Object.values(H)];
    const taken = text.split('\n').flatMap((l) => {
        const f = readFrom(splitComment(l)[0].trim());
        return f && f.kind !== 'signature' ? (f.names ?? []) : [];
    });
    const kept = [...sig.names, ...sig.optional, ...(sig.main ? [sig.main] : []), ...taken, ...hostNames.map((n) => `&${n}`)];
    let core = toCore(host, { ...options, interface: kept, ...(meterless || holes.uses.includes('&bar') ? { skip: ['taps'] } : {}) }).source;
    for (const n of hostNames)
        if (declLine(core, n) >= 0)
            core = deleteCell(core, n);
    const interfaceNames = new Set(kept.map((n) => n.replace(/^&/, '')));
    core = unreadGone(core, interfaceNames);
    const fromLines = text.split('\n').filter((l) => {
        const f = readFrom(splitComment(l)[0].trim());
        return !!f && f.kind !== 'signature';
    });
    for (const n of taken.map((t) => t.replace(/^&/, '')))
        if (declLine(core, n) >= 0)
            core = deleteCell(core, n);
    core = unreadGone(core, new Set([...interfaceNames].filter((n) => !taken.includes(`&${n}`))));
    const sigLine = text.split('\n').find((l) => readFrom(splitComment(l)[0].trim())?.kind === 'signature');
    const lines = core.split('\n').filter((l) => readFrom(splitComment(l)[0].trim()) === undefined);
    return { source: [sigLine.trim(), ...fromLines.map((l) => l.trim()), ...lines].join('\n').replace(/\n+$/, '') };
}
