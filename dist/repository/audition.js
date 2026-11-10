import { compileSource } from "../engine/compile.js";
import { parse } from "../engine/parser/index.js";
import { readFrom } from "../engine/parser/use.js";
import { splitComment } from "../engine/edit.js";
import { AXES } from "../engine/style.js";
import { signatureOf } from "../engine/use.js";
import { holesOf } from "./holes.js";
export const HOST = { voice: '_hv', line: '_hl', meter: '_hbar', card: '_hout', read: '_hr' };
function standIn(name, sound, styled) {
    const bare = name.replace(/^&/, '');
    if (styled)
        return `&${bare} map=style ${AXES.map((a) => `${a.name}=${styled[a.name] ?? (a.range[0] + a.range[1]) / 2}`).join(' ')}`;
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
export function entryOf(result, head, tap) {
    const c = result.cells.get(head);
    if (!c)
        return null;
    if (c.map?.kind === 'role' || c.map?.kind === 'adsr' || c.map?.kind === 'style')
        return null;
    if (c.gate)
        return { entry: `&${head}` };
    if (c.voice)
        return { entry: `&${HOST.line} * &${head}` };
    if (c.map?.kind === 'sample' || c.sort === 'signal')
        return { entry: `&${head}` };
    if (c.meter && result.clocks.get(head)?.cell === head)
        return { entry: `&${HOST.read} * &${HOST.voice}`, line: `&${HOST.read} step=&${head}:pulse 0 2 4 5` };
    if (c.meter || c.scan || !c.clock)
        return { entry: `&${HOST.read} * &${HOST.voice}`, line: `&${HOST.read} over=&${head} step=${tap}pulse*2 0 1 2 3` };
    if (c.steps > 0)
        return { entry: `&${head} * &${HOST.voice}` };
    return null;
}
export const NO_HEAD = 'no head plays in a host';
function roots(text) {
    const names = parse(text)
        .cells.filter((d) => !d.lambda)
        .map((d) => d.name);
    const lines = text.split('\n').filter((l) => readFrom(splitComment(l)[0].trim()) === undefined);
    return names.filter((n) => !lines.some((l) => !new RegExp(`^\\s*&${n}(?![A-Za-z0-9_])`).test(l) && new RegExp(`&${n}(?![A-Za-z0-9_])`).test(splitComment(l)[0])));
}
export function headsOf(text) {
    const sig = signatureOf(text);
    return sig ? sig.names.map((n) => n.replace(/^&/, '')) : roots(text);
}
export function playedHeadsOf(text) {
    const heads = headsOf(text);
    const outer = new Set(roots(text));
    const played = heads.filter((h) => outer.has(h));
    return played.length ? played : heads;
}
export function hosted(given, standIns, options = {}, heads) {
    let text = given;
    const compiled = (t) => compileSource(t, undefined, options);
    const holes = holesOf(text, compiled, options.resolve);
    const sig = signatureOf(text);
    const playing = heads ?? playedHeadsOf(text);
    const lines = [];
    const kitText = standIns.kit ? options.resolve?.(standIns.kit) : null;
    const kitNames = kitText ? new Set(parse(kitText).cells.map((d) => `&${d.name}`)) : new Set();
    const fromKit = holes.uses.filter((u) => holes.sounds.includes(u) && kitNames.has(u));
    if (fromKit.length)
        lines.push({ line: `${fromKit.join(', ')} from ${standIns.kit}`, fills: fromKit.join(', ') });
    const axes = AXES.map((a) => a.name).join('|');
    for (const u of holes.uses.filter((x) => !fromKit.includes(x))) {
        const styled = standIns.style && new RegExp(`${u}\\[(?:${axes})\\]`).test(text) ? standIns.style : null;
        lines.push({ line: standIn(u, holes.sounds.includes(u), styled), fills: u });
    }
    if (standIns.style && sig)
        for (const p of sig.optional.filter((o) => new RegExp(`${o}\\[(?:${axes})\\]`).test(text))) {
            const line = standIn(p, false, standIns.style);
            const own = new RegExp(`^\\s*${p}(?![A-Za-z0-9_]).*$`, 'm');
            if (own.test(text)) {
                text = text.replace(own, line);
                lines.push({ line, fills: p });
            }
        }
    const declares = (t, name) => parse(t).cells.some((d) => d.name === name);
    lines.push({ line: `&${HOST.voice} s=sine loop=C4`, fills: null });
    const meterless = !holes.uses.includes('&bar') && !declares(text, 'bar');
    if (meterless)
        lines.push({ line: `&${HOST.meter} meter("4/4") step=2`, fills: null });
    lines.push({ line: `&${HOST.line} step=${meterless ? `&${HOST.meter}:` : ''}pulse*2 0 2 4 5`, fills: null });
    const written = () => lines.filter((l) => !(l.fills && text.split('\n').includes(l.line))).map((l) => l.line);
    const first = compiled([text, ...written()].join('\n'));
    const tap = meterless ? `&${HOST.meter}:` : '';
    let reads = 0;
    const entriesOf = (heads) => heads.flatMap((h) => {
        const e = entryOf(first, h, tap);
        if (e?.line && reads++ > 0) {
            const r = `${HOST.read}_${h}`;
            const own = new RegExp(`&${HOST.read}(?![A-Za-z0-9_])`, 'g');
            return [{ entry: e.entry.replace(own, `&${r}`), line: e.line.replace(own, `&${r}`) }];
        }
        if (e)
            return [e];
        if ((standIns.kit || standIns.style) && first.cells.get(h)?.map?.kind === 'adsr') {
            const v = `${HOST.voice}_${h}`;
            return [{ entry: `&${HOST.line} * &${v}`, line: `&${v} s=tri loop=C4 env=&${h}` }];
        }
        return [];
    });
    let entries = entriesOf(playing);
    if (!entries.length && !heads) {
        reads = 0;
        entries = entriesOf(headsOf(text));
    }
    const done = (why) => ({ source: [text, ...written()].join('\n'), holes, lines, heads: playing, meterless, ...(why ? { why } : {}) });
    if (!entries.length)
        return done(NO_HEAD);
    for (const e of entries)
        if (e.line)
            lines.push({ line: e.line, fills: null });
    lines.push({ line: `&${HOST.card} map=sample [${entries.map((e) => e.entry).join(', ')}]`, fills: null });
    const r = compiled([text, ...written()].join('\n'));
    if (!r.ok)
        return done(`the host doesn’t compile: ${r.diagnostics.find((d) => d.severity === 'error')?.message ?? ''}`);
    return done();
}
export function audition(text, options = {}) {
    const { style = {}, kit = 'gm_kit', ...rest } = options;
    const h = hosted(text, { kit, style }, rest);
    return { text: h.source, host: h.lines, heads: h.heads, ...(h.why ? { why: h.why } : {}) };
}
