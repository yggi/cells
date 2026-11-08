import { parse } from "../parser/index.js";
import { TEMPI } from "../parser/free.js";
import { isNote } from "../ast.js";
import { compileSource } from "../compile.js";
import { soundsIdentical } from "../sameness.js";
import { noteValue } from "../meter.js";
import { noteFrequency } from "../program.js";
import { expansion } from "../use.js";
import { readFrom, readUse } from "../parser/use.js";
import { declLine, declWords, deleteCell, splitComment } from "../edit.js";
const num = (x) => String(x);
const codeWise = (text, f) => text
    .split('\n')
    .map((raw) => {
    const [code, comment] = splitComment(raw);
    const parts = code.split(/("(?:[^"\\]|\\.)*")/);
    const done = parts.map((p, i) => (i % 2 ? p : f(p))).join('');
    return comment ? `${done}${comment}` : done;
})
    .join('\n');
const UNIT = { bpm: 1 / 60, hz: 1, min: 1 / 60, h: 1 / 3600, d: 1 / 86400, wk: 1 / 604800, k: 1000 };
export const FAMILIES = [
    {
        key: 'comments',
        rows: '5 `#` `//`',
        rewrite: (text) => text
            .split('\n')
            .map((raw) => splitComment(raw)[0].replace(/\s+$/, ''))
            .filter((l) => l.trim())
            .join('\n'),
    },
    {
        key: 'inert',
        rows: '2, 85–90 a note, `label=` `show=` `size=` `tags=` `about=` `title=` `tier=`',
        rewrite: (text) => inert(text),
    },
    {
        key: 'from',
        rows: '7 `from`',
        rewrite: (text, options) => (options.resolve ? inPlace(text, options.resolve) : text),
    },
    {
        key: 'units',
        rows: '58–64 `bpm` `hz` `min` `h` `d` `wk` `k`',
        rewrite: (text) => codeWise(text, (c) => c
            .split(/(\bfree\([^)]*\))/)
            .map((part, i) => (i % 2 ? part : part.replace(/(?<=[=(,\s*])(-?\d*\.?\d+)(bpm|hz|min|h|d|wk|k)(?![A-Za-z0-9_])/g, (_, n, u) => num(+n * UNIT[u]))))
            .join('')),
    },
    {
        key: 'sliders',
        rows: '58–64 a unit in `free(…)`',
        rewrite: (text) => codeWise(text, (c) => c
            .replace(/\bfree\((-?[0-9]*\.?[0-9]+)(bpm|hz|min|h|d|wk|k),\s*(-?[0-9]*\.?[0-9]+)\.\.(-?[0-9]*\.?[0-9]+)/g, (_, n, u, lo, hi) => `free(${num(+n * UNIT[u])}, ${num(+lo * UNIT[u])}..${num(+hi * UNIT[u])}, unit=${u}`)
            .replace(/\bfree\(([a-z]+)\)/g, (written, word) => {
            const range = TEMPI[word];
            if (!range)
                return written;
            const [lo, hi] = range;
            return `free(${num(Math.round((lo + hi) / 2) / 60)}, ${num(lo / 60)}..${num(hi / 60)}, unit=bpm)`;
        })),
    },
    {
        key: 'note names',
        rows: '50 `loop=NAME`',
        rewrite: (text) => codeWise(text, (c) => c.replace(/(?<=\bloop=)([A-Ga-g](?:#|b)?-?\d+)(?![A-Za-z0-9_])/g, (name) => {
            const f = noteFrequency(name);
            return f === null ? name : num(f);
        })),
    },
    {
        key: 'unnamed cells',
        rows: '36 `&( … )`',
        rewrite: (text) => {
            const lifted = [];
            let now = text;
            for (let at = innermost(now); at; at = innermost(now)) {
                const name = `_c${lifted.length + 1}`;
                lifted.push(`&${name} ${at.body.trim()}`);
                now = now.slice(0, at.start) + `&${name}` + now.slice(at.end);
            }
            return lifted.length ? `${now.replace(/\s+$/, '')}\n${lifted.join('\n')}` : text;
        },
    },
    {
        key: 'repeats',
        rows: '21 `x!n`',
        rewrite: (text) => tokenWise(text, (tok, cell) => (unitRead(text).has(cell) ? tok : repeated(tok))),
    },
    {
        key: 'scans',
        rows: '37 `scan(i …)`',
        rewrite: (text) => codeWise(text, (c) => /\bstep=/.test(c)
            ? c
            : c.replace(/\bscan\(([-\d.\s]+)\)/g, (written, body) => {
                const steps = body.trim().split(/\s+/).map(Number);
                if (steps.some((s) => !Number.isFinite(s)))
                    return written;
                let at = 0;
                return steps.map((s) => ((at += s), num(at - s))).join(' ');
            })),
    },
    {
        key: 'copies',
        rows: '79 `base=` (a copy that writes no braid of its own)',
        rewrite: (text) => copies(text),
    },
    {
        key: 'keys',
        rows: '40 `scale(name)` `scale(name, tonic)` `scale(&mode, &tonic)`',
        rewrite: (text, options) => keys(text, options),
    },
    {
        key: 'gates',
        rows: '111–113 `play=` `level=` `[&a, &b]`',
        rewrite: (text, options) => gates(text, options),
    },
    {
        key: 'pitch',
        rows: '88 `pitch=&x`',
        rewrite: (text) => pitches(text),
    },
    {
        key: 'meters',
        rows: '42 `meter("sig")`',
        rewrite: (text, options) => meters(text, options),
    },
    {
        key: 'taps',
        rows: '54–55 `step=16n` `8t` `4n.` `1m`',
        rewrite: (text, options) => taps(text, options),
    },
    {
        key: 'subsequences',
        rows: '16, 22 `[a b]` `x*n`, and `@` on the line’s finest grid',
        rewrite: (text, options) => subsequences(text, options),
    },
    {
        key: 'chains',
        rows: '53 `step=&x*n/d` as one ratio',
        rewrite: (text) => codeWise(text, chains),
    },
    {
        key: 'counts',
        rows: '21, 22 a run as `x!n`, `x*n` as `[x!n]`',
        rewrite: (text) => counts(text),
    },
];
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const ratio = (n, d) => {
    const g = gcd(n, d) || 1;
    return [n / g, d / g];
};
const times = (a, b) => ratio(a[0] * b[0], a[1] * b[1]);
function leaves(tokens, lines, dur) {
    const foot = (t) => t.elongate * t.repeat;
    const all = tokens.reduce((s, t) => s + foot(t), 0);
    if (!all || tokens.some((t) => !Number.isInteger(t.elongate)))
        return null;
    const out = [];
    for (const t of tokens) {
        const each = times(dur, ratio(t.elongate, all));
        for (let r = 0; r < t.repeat; r++) {
            const a = t.atom;
            if (a.kind === 'seq') {
                if (a.layers.length !== 1 || a.mode || a.euclid || a.slow || a.bare)
                    return null;
                const inner = leaves(a.layers[0], lines, each);
                if (!inner)
                    return null;
                for (let s = 0; s < t.subdivide; s++)
                    out.push(...inner.map((x) => ({ ...x, dur: times(x.dur, ratio(1, t.subdivide)) })));
                continue;
            }
            if (a.kind !== 'note' && a.kind !== 'rest' && a.kind !== 'ref' && a.kind !== 'chord')
                return null;
            const written = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len) ?? '';
            const text = written.replace(/(?:@[0-9.]+|![0-9]+|\*[0-9]+)+$/, '').replace(/(?:@[0-9.]+|![0-9]+|\*[0-9]+)(?=[?:]|$)/g, '');
            if (!text || /[@!*]/.test(text.replace(/^&[A-Za-z_][A-Za-z0-9_]*/, '')))
                return null;
            for (let s = 0; s < t.subdivide; s++)
                out.push({ text, dur: times(each, ratio(1, t.subdivide)) });
        }
    }
    return out;
}
function subsequences(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const lines = text.split('\n');
    const spliced = new Set([...r.cells.values()].flatMap((c) => c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []))));
    const read = unitRead(text);
    for (const d of parse(text).cells) {
        if (d.braid.kind !== 'list' || !d.step || spliced.has(d.name) || read.has(d.name))
            continue;
        const tokens = d.braid.tokens;
        if (!tokens.some((t) => t.atom.kind === 'seq' || t.subdivide > 1))
            continue;
        const i = d.span.line - 1;
        const [code, comment] = splitComment(lines[i] ?? '');
        if (/[?|]/.test(code) || /\bchance=/.test(code))
            continue;
        if (d.step.kind === 'tap' && r.cells.get(d.step.meter?.name ?? r.mainMeter ?? '')?.meter?.legato)
            continue;
        const ls = leaves(tokens, lines, [tokens.reduce((n, t) => n + t.elongate * t.repeat, 0), 1]);
        if (!ls || tokens.some((t) => t.span.line - 1 !== i))
            continue;
        const k = ls.reduce((l, x) => (l * x.dur[1]) / gcd(l, x.dur[1]), 1);
        const braid = ls.map((x) => {
            const n = (x.dur[0] * k) / x.dur[1];
            return n === 1 ? x.text : `${x.text}@${n}`;
        });
        const step = /\bstep=(\S+)/.exec(code);
        if (!step)
            continue;
        const value = step[1];
        const finer = /^-?[0-9.]+$/.test(value) ? num(+value * k) : /^(?:&|pulse|beat|[0-9]+[ntm])/.test(value) && !value.startsWith('cycle(') ? `${value}*${k}` : null;
        if (!finer)
            continue;
        const first = tokens[0].span.col - 1;
        const last = tokens.at(-1);
        const end = last.span.col - 1 + last.span.len;
        const tail = code.slice(end).replace(/^(?:\s+_)+/, '');
        const head = code.slice(0, first).replace(/\bstep=\S+/, `step=${finer}`);
        const next = `${head}${braid.join(' ')}${tail}`;
        lines[i] = comment ? `${next}${comment}` : next;
    }
    return lines.join('\n');
}
function chainOf(k) {
    const near = (x) => Math.abs(x - Math.round(x)) < 1e-9;
    if (near(k))
        return Math.round(k) === 1 ? '' : `*${Math.round(k)}`;
    if (near(1 / k))
        return `/${Math.round(1 / k)}`;
    for (let q = 2; q <= 64; q++)
        if (near(k * q))
            return `*${Math.round(k * q)}/${q}`;
    return `*${num(k)}`;
}
function taps(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const lines = text.split('\n');
    for (const d of parse(text).cells) {
        const st = d.step;
        if (st?.kind !== 'tap')
            continue;
        const word = st.tap.written;
        const meter = r.cells.get(st.meter?.name ?? r.mainMeter ?? '')?.meter;
        if (!meter)
            continue;
        const bars = /^([1-9][0-9]*)m$/.exec(word);
        const length = bars ? (+bars[1] * meter.pulses) / meter.unit : noteValue(word);
        if (length === null)
            continue;
        const i = d.span.line - 1;
        const [code, comment] = splitComment(lines[i] ?? '');
        const pattern = new RegExp(`(\\bstep=(?:&[A-Za-z_][A-Za-z0-9_]*:)?)${word.replace('.', '\\.')}(?=[*/\\s]|$)`);
        const next = code.replace(pattern, `$1pulse${chainOf(1 / meter.unit / length)}`);
        if (next !== code)
            lines[i] = comment ? `${next}${comment}` : next;
    }
    return lines.join('\n');
}
function inPlace(text, resolve) {
    const x = expansion(text, { resolve });
    const own = text.split('\n');
    const added = x.text.split('\n').slice(own.length);
    const kept = new Set(x.uses.filter((u) => u.hash === null).map((u) => u.span.line));
    const at = new Map();
    added.forEach((l, k) => {
        const line = x.through(own.length + k + 1)?.line;
        if (line !== undefined)
            at.set(line, [...(at.get(line) ?? []), l]);
    });
    return own
        .flatMap((raw, i) => {
        const code = splitComment(raw)[0];
        const taken = (readUse(code) !== undefined || readFrom(code.trim())?.kind === 'use') && !kept.has(i + 1);
        return taken ? (at.get(i + 1) ?? []) : [raw];
    })
        .join('\n');
}
const repeated = (tok) => {
    const m = /^(.*)!(\d+)$/.exec(tok);
    return m ? Array.from({ length: +m[2] }, () => m[1]).join(' ') : tok;
};
function counts(text) {
    const lines = text.split('\n');
    const read = unitRead(text);
    const edits = [];
    const written = (t) => lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len) ?? '';
    const unit = (t, inside) => {
        if (t.span.col - 1 + t.span.len > (lines[t.span.line - 1]?.length ?? 0))
            return null;
        if (inside && t.atom.kind === 'ref')
            return null;
        let w = written(t);
        if (t.repeat > 1) {
            if (!w.endsWith(`!${t.repeat}`))
                return null;
            w = w.slice(0, -`!${t.repeat}`.length);
        }
        const star = /^([^\s*!@]+)\*([0-9]+)$/.exec(w);
        return { base: star && t.subdivide > 1 && t.atom.kind !== 'ref' ? `[${star[1]}!${star[2]}]` : w, n: t.repeat };
    };
    const walk = (tokens, inside) => {
        for (let i = 0; i < tokens.length;) {
            const first = tokens[i];
            const u = unit(first, inside);
            let j = i + 1;
            let n = u?.n ?? 1;
            if (u)
                for (; j < tokens.length; j++) {
                    const t = tokens[j];
                    const v = unit(t, inside);
                    const prev = tokens[j - 1];
                    const after = t.span.line === prev.span.line && t.span.col >= prev.span.col + prev.span.len;
                    const between = after ? lines[t.span.line - 1].slice(prev.span.col - 1 + prev.span.len, t.span.col - 1) : null;
                    if (!v || v.base !== u.base || between === null || between.trim())
                        break;
                    n += v.n;
                }
            const last = tokens[j - 1];
            const to = u ? `${u.base}${n > 1 ? `!${n}` : ''}` : null;
            const len = last.span.col - 1 + last.span.len - (first.span.col - 1);
            if (to !== null && last.span.line === first.span.line && to !== lines[first.span.line - 1].substr(first.span.col - 1, len))
                edits.push({ line: first.span.line, col: first.span.col, len, to });
            else if (j === i + 1 && first.atom.kind === 'seq')
                for (const layer of first.atom.layers)
                    walk(layer, true);
            i = j;
        }
    };
    const args = new Set(['adsr', 'ratios', 'role', 'style', 'table']);
    for (const d of parse(text).cells)
        if (d.braid.kind === 'list' && !read.has(d.name) && d.cycle === null && !(d.map && args.has(d.map.kind)))
            walk(d.braid.tokens, false);
    edits.sort((a, b) => b.line - a.line || b.col - a.col);
    for (const e of edits) {
        const l = lines[e.line - 1];
        lines[e.line - 1] = l.slice(0, e.col - 1) + e.to + l.slice(e.col - 1 + e.len);
    }
    return lines.join('\n');
}
const unitRead = (text) => new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)\[/g)].map((m) => m[1]));
function chains(code) {
    return code.replace(/(\bstep=(?:&[A-Za-z_][A-Za-z0-9_]*:)?(?:pulse|beat|&[A-Za-z_][A-Za-z0-9_]*|[0-9]+[ntm]\.?))((?:[*/][0-9]+(?:\.[0-9]+)?)+)(?![0-9A-Za-z_.])/g, (_, head, chain) => {
        let k = 1;
        for (const m of chain.matchAll(/([*/])([0-9]+(?:\.[0-9]+)?)/g))
            k = m[1] === '*' ? k * +m[2] : k / +m[2];
        return `${head}${chainOf(k)}`;
    });
}
function copies(text) {
    let now = text;
    for (const d of parse(text).cells) {
        if (!d.base || d.base.pick || d.base.shift)
            continue;
        const own = declWords(now, d.name);
        const base = declWords(now, d.base.name);
        if (!own || !base || own.braid.length || base.attrs.some((a) => a.startsWith('base=')))
            continue;
        const set = new Set(own.attrs.map((a) => a.split('=')[0]));
        const attrs = [...base.attrs.filter((a) => !set.has(a.split('=')[0])), ...own.attrs.filter((a) => !a.startsWith('base='))];
        const i = declLine(now, d.name);
        const lines = now.split('\n');
        const [, comment] = splitComment(lines[i]);
        const next = [...own.head, ...base.braid, ...attrs].join(' ');
        lines[i] = comment ? `${next} ${comment.trim()}` : next;
        now = lines.join('\n');
    }
    return now;
}
function keys(written, options) {
    const text = named(written);
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const lines = text.split('\n');
    const tables = [];
    const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
    const decls = parse(text).cells;
    for (const d of decls) {
        const c = r.cells.get(d.name);
        if (d.braid.kind !== 'scan' || !c?.scan)
            continue;
        const key = d.over ? decls.find((k) => k.name === d.over.name) : undefined;
        const shift = d.over ? (r.cells.get(d.over.name)?.shift ?? 0) : c.shift;
        const i = d.span.line - 1;
        const [code, comment] = splitComment(lines[i] ?? '');
        const call = /\bscale\(([^()]*)\)/.exec(code);
        if (!call || /over=$/.test(code.slice(0, call.index)) || /free\(/.test(call[1]))
            continue;
        const mode = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(call[1])?.[1];
        const held = mode ? decls.find((m) => m.name === mode) : undefined;
        if (held?.braid.kind === 'list' && held.braid.tokens.length > 1)
            continue;
        let at = 0;
        const table = c.scan.steps.slice(0, -1).map((s) => (at += s));
        let name = `_m${tables.length + 1}`;
        while (taken.has(name))
            name = `_m${tables.length + taken.size + 1}`;
        taken.add(name);
        tables.push(`&${name} ${[0, ...table].map(num).join(' ')}`);
        const tonic = key?.tonic ? `, &${key.tonic.name}` : shift ? `, ${num(shift)}` : '';
        const next = code.replace(call[0], `scale(&${name}${tonic})`);
        lines[i] = comment ? `${next}${comment}` : next;
    }
    return tables.length ? `${lines.join('\n').replace(/\s+$/, '')}\n${tables.join('\n')}` : written;
}
function named(text) {
    const keys = [];
    const taken = new Set([...text.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
    const next = codeWise(text, (c) => c.replace(/\bover=scale\(([^()]*)\)/g, (_, args) => {
        let name = `_k${keys.length + 1}`;
        while (taken.has(name))
            name = `_k${keys.length + taken.size + 1}`;
        taken.add(name);
        keys.push(`&${name} scale(${args})`);
        return `over=&${name}`;
    }));
    return keys.length ? `${next.replace(/\s+$/, '')}\n${keys.join('\n')}` : text;
}
const INERT = /^(?:label|show|size|about|title|tier)=/;
function inert(text) {
    let now = text;
    for (const d of parse(text).cells)
        if (isNote(d))
            now = deleteCell(now, d.name);
    return now
        .split('\n')
        .map((raw) => {
        const name = HEAD_NAME.exec(splitComment(raw)[0])?.[1];
        const w = name ? declWords(raw, name) : null;
        if (!w || !w.attrs.some((a) => INERT.test(a)))
            return raw;
        const [code, comment] = splitComment(raw);
        let next = code;
        for (const a of w.attrs.filter((x) => INERT.test(x))) {
            const at = next.indexOf(a);
            if (at > 0)
                next = (next.slice(0, at).trimEnd() + ' ' + next.slice(at + a.length).trimStart()).trimEnd();
        }
        return comment ? `${next} ${comment.trim()}` : next;
    })
        .join('\n');
}
const HEAD_NAME = /^\s*&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
function mixEntries(code, f) {
    let out = '';
    let depth = 0;
    let open = -1;
    for (let i = 0; i < code.length; i++) {
        const ch = code[i];
        if (ch === '[' && depth === 0) {
            open = i;
            depth = 1;
            continue;
        }
        if (open < 0) {
            out += ch;
            continue;
        }
        if (ch === '[' || ch === '(')
            depth++;
        else if (ch === ']' || ch === ')')
            depth--;
        if (depth === 0) {
            const body = code.slice(open + 1, i);
            const entries = [];
            let d = 0;
            let from = 0;
            for (let j = 0; j <= body.length; j++) {
                const c = body[j];
                if (c === '(' || c === '[')
                    d++;
                else if (c === ')' || c === ']')
                    d--;
                if (j === body.length || (c === ',' && d === 0)) {
                    entries.push(body.slice(from, j));
                    from = j + 1;
                }
            }
            const rim = /^(?:\s|\uE000\d+\uE001)*|(?:\s|\uE000\d+\uE001)*$/g;
            out += `[${entries
                .flatMap((e) => {
                if (!e.trim())
                    return [e];
                const [lead = '', tail = ''] = e.match(rim) ?? [];
                const made = f(e.slice(lead.length, e.length - tail.length));
                return made.map((x, k) => (k ? ' ' : lead) + x + (k === made.length - 1 ? tail : ''));
            })
                .join(',')}]`;
            open = -1;
        }
    }
    return open < 0 ? out : code;
}
const factorOf = (name) => new RegExp(`&${name}(?![A-Za-z0-9_\\[:^])`);
function masked(text) {
    const kept = [];
    const hide = (s) => `\uE000${kept.push(s) - 1}\uE001`;
    const code = text
        .split('\n')
        .map((raw) => {
        const [c, comment] = splitComment(raw);
        return c.replace(/"(?:[^"\\]|\\.)*"/g, hide) + (comment ? hide(comment) : '');
    })
        .join('\n');
    return { code, back: (c) => c.replace(/\uE000(\d+)\uE001/g, (_, i) => kept[+i]) };
}
const mixesOf = (text, f) => {
    const m = masked(text);
    return m.back(mixEntries(m.code, f));
};
function onlyInMixes(text, name) {
    const { code } = masked(text);
    const ref = new RegExp(`&${name}(?![A-Za-z0-9_])`, 'g');
    const factor = new RegExp(factorOf(name).source, 'g');
    const own = code.split('\n')[declLine(text, name)] ?? '';
    const head = new RegExp(`^\\s*&${name}(?![A-Za-z0-9_])`).test(own) ? 1 : 0;
    const total = (code.match(ref) ?? []).length - head;
    let seen = 0;
    mixEntries(code, (e) => {
        const n = (e.match(ref) ?? []).length;
        if (n && (e.match(factor) ?? []).length === n)
            seen += n;
        return [e];
    });
    return seen === total;
}
function gates(text, options) {
    const keep = options.keep ?? new Set();
    let now = text;
    for (const d of parse(text).cells)
        if (d.map?.kind === 'role' && !keep.has(d.name))
            now = deleteCell(now, d.name);
    for (const d of parse(now).cells) {
        if (keep.has(d.name))
            continue;
        const words = declWords(now, d.name);
        const play = words?.attrs.find((w) => w.startsWith('play='));
        if (!words || !play || words.attrs.some((a) => !/^(play|level|label|tags)=/.test(a)))
            continue;
        const notes = /^play=&([A-Za-z_][A-Za-z0-9_]*)(?:\^\$(-?[0-9]+))?$/.exec(play);
        if (!notes)
            continue;
        const level = words.attrs.find((w) => w.startsWith('level='))?.slice('level='.length) ?? '';
        const factors = level ? level.split('*') : [];
        if (factors.some((f) => !/^(?:&[A-Za-z_][A-Za-z0-9_]*|-?[0-9]*\.?[0-9]+)$/.test(f)))
            continue;
        const braid = words.braid.join(' ');
        const chord = /^\[((?:&[A-Za-z_][A-Za-z0-9_]*,?\s*)+)\]$/.exec(braid);
        const receivers = chord ? [...chord[1].matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]) : /^&[A-Za-z_][A-Za-z0-9_]*$/.test(braid) ? [braid.slice(1)] : [];
        if (!receivers.length || !onlyInMixes(now, d.name))
            continue;
        const head = notes[2] ? `(&${notes[1]} + ${notes[2]})` : `&${notes[1]}`;
        const product = (r) => [head, ...factors, `&${r}`].join(' * ');
        const next = mixesOf(deleteCell(now, d.name), (e) => {
            if (!factorOf(d.name).test(e))
                return [e];
            if (/\+/.test(e))
                return receivers.length === 1 ? [e.replace(factorOf(d.name), `(${product(receivers[0])})`)] : [e];
            return receivers.map((r) => e.replace(factorOf(d.name), product(r)));
        });
        if (soundsIdentical(now, next, undefined, options))
            now = next;
    }
    return now;
}
function topLevel(text, sep) {
    const parts = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '(' || c === '[')
            depth++;
        else if (c === ')' || c === ']')
            depth--;
        else if (c === sep && depth === 0) {
            parts.push(text.slice(from, i));
            from = i + 1;
        }
    }
    return [...parts, text.slice(from)];
}
function withPitch(entry, x, voice, pitchLike) {
    if (!factorOf(voice).test(entry))
        return entry;
    const factors = topLevel(entry, '*').map((f) => f.trim());
    const first = factors.find((f) => {
        const m = /^&([A-Za-z_][A-Za-z0-9_]*)(?:\[[^\]]*\]|\^\$?-?[0-9]+)*$/.exec(f);
        return !!m && m[1] !== voice && pitchLike(m[1]);
    });
    return (first ? factors.map((f) => (f === first ? `(${f} + &${x})` : f)) : factors.map((f) => (factorOf(voice).test(f) && f === `&${voice}` ? `(&${x} + 0) * ${f}` : f))).join(' * ');
}
function pitches(text) {
    let now = text;
    const decls = parse(text).cells;
    const pitchLike = (name) => {
        const c = decls.find((k) => k.name === name);
        return !!c && !c.gate && !Object.keys(c.params).some((k) => k === 's') && !(c.map && ['amp', 'db', 'lin', 'adsr', 'sample', 'midi'].includes(c.map.kind));
    };
    for (const d of decls) {
        const x = d.pitch;
        if (!x || x.pick || x.shift || declLine(now, x.name) < 0 || !onlyInMixes(now, d.name))
            continue;
        let summed = false;
        mixesOf(now, (e) => {
            if (factorOf(d.name).test(e) && /\+/.test(e))
                summed = true;
            return [e];
        });
        if (summed)
            continue;
        const own = declLine(now, d.name);
        if (own < 0)
            continue;
        const lines = now.split('\n');
        const [code, comment] = splitComment(lines[own]);
        lines[own] = code.replace(new RegExp(`\\s+pitch=&${x.name}(?![A-Za-z0-9_])`), '') + comment;
        now = mixesOf(lines.join('\n'), (e) => [withPitch(e, x.name, d.name, pitchLike)]);
    }
    return now;
}
const LEVEL = ['*', '+', '-', '.', ','];
const played = (m) => {
    const step = m.pulses / (m.unit * m.levels.length);
    return JSON.stringify([m.levels, +step.toFixed(9), m.beats.map((b) => +(b / m.unit).toFixed(9))]);
};
function meters(text, options) {
    const r = compileSource(text, undefined, options);
    if (!r.ok)
        return text;
    const meterOf = (braid) => {
        const c = compileSource(`&m ${braid}`);
        return c.ok ? (c.cells.get('m')?.meter ?? null) : null;
    };
    const asLevels = (m) => {
        const levels = m.levels.map((l) => LEVEL[Math.min(l, LEVEL.length - 1)]).join('');
        const bare = meterOf(`meter("${levels}")`);
        if (bare && played(bare) === played(m))
            return `meter("${levels}")`;
        const value = (m.unit * m.levels.length) / m.pulses;
        if (!Number.isInteger(value))
            return null;
        const valued = meterOf(`meter("${levels}", ${value}n)`);
        return valued && played(valued) === played(m) ? `meter("${levels}", ${value}n)` : null;
    };
    const each = (c) => {
        const name = /^\s*&([A-Za-z_][A-Za-z0-9_]*)/.exec(c)?.[1];
        const meter = name ? r.cells.get(name)?.meter : null;
        if (!meter || meter.written !== 'meter')
            return c;
        return c.replace(/\bmeter\("([^"]*)"(?:,\s*[0-9]+)?\)/, (written, sig) => (/^[*+\-.,:;]+$/.test(sig) ? written : (asLevels(meter) ?? written)));
    };
    return text
        .split('\n')
        .map((raw) => {
        const [code, comment] = splitComment(raw);
        const next = each(code);
        return next === code ? raw : comment ? `${next}${comment}` : next;
    })
        .join('\n');
}
function innermost(written) {
    const text = written.replace(/"(?:[^"\\]|\\.)*"/g, (q) => q.replace(/[^"]/g, ' '));
    for (let i = text.indexOf('&('); i >= 0; i = text.indexOf('&(', i + 1)) {
        let depth = 0;
        for (let j = i + 1; j < text.length; j++) {
            if (text[j] === '(')
                depth++;
            else if (text[j] === ')' && --depth === 0) {
                if (!text.slice(i + 2, j).includes('&('))
                    return { start: i, end: j + 1, body: written.slice(i + 2, j) };
                break;
            }
        }
    }
    return null;
}
function tokenWise(text, f) {
    const lines = text.split('\n');
    const parsed = parse(text);
    const edits = [];
    for (const d of parsed.cells)
        if (d.braid.kind === 'list')
            for (const t of d.braid.tokens) {
                const written = lines[t.span.line - 1]?.substr(t.span.col - 1, t.span.len);
                if (written === undefined)
                    continue;
                const to = f(written, d.name);
                if (to !== written)
                    edits.push({ ...t.span, to });
            }
    edits.sort((a, b) => b.line - a.line || b.col - a.col);
    for (const e of edits) {
        const l = lines[e.line - 1];
        lines[e.line - 1] = l.slice(0, e.col - 1) + e.to + l.slice(e.col - 1 + e.len);
    }
    return lines.join('\n');
}
const sugared = (t) => t.subdivide > 1 || (t.atom.kind === 'seq' && (t.atom.mode === 'alt' || !!t.atom.euclid || t.atom.layers.some((l) => l.some(sugared))));
export const stillWritten = (row, text) => {
    const code = text
        .split('\n')
        .map((l) => splitComment(l)[0].replace(/"(?:[^"\\]|\\.)*"/g, '""'))
        .join('\n');
    return typeof row.test === 'function' ? row.test(code) : row.test.test(code);
};
export const LEFT = [
    {
        key: 'taps',
        rows: '54–56 `step=16n` `8t` `4n.` `1m` on a line that wasn’t rewritten',
        test: /step=(?:&\w+:)?(?:\d+[ntm]\.?)(?![A-Za-z0-9_])/,
        why: 'a tap of a note value is the meter’s pulse with its chain (`pulse*4`), where the line plays the same written so',
    },
    {
        key: 'subsequences',
        rows: '18, 22, 25 `<a b>` `x*n` `x(k,n)` `euclid(k, n)` left as written',
        test: (text) => /\beuclid\(/.test(text) || parse(text).cells.some((d) => d.braid.kind === 'list' && d.braid.tokens.some(sugared)),
        why: 'n of a step within it (`x*n`, which is `[x!n]`), a step a lap (`<a b>`, which is `[a b]/2`), or a euclid, kept where a finer grid would change what the line plays: a line that draws, one spliced or read by its units, a table, a stack, a meter with legato by level',
    },
    {
        key: 'sliders',
        rows: '58–64 a unit in `free(…)`, or a tempo marking, left as written',
        test: /\bfree\((?:-?\d*\.?\d+(?:bpm|hz|min|h|d|wk|k)\b|[a-z]+\))/,
        why: 'a slider whose unit is written after its number, or a marking (free(andante)): its numbers in the core’s, the unit an argument',
    },
    {
        key: 'keys',
        rows: '40 `scale(name)` left as written',
        test: /\bscale\((?!&)/,
        why: 'a key whose mode is a name: written as its table where it can be; a key after over= unnamed, or with a slider for a tonic, stays',
    },
    {
        key: 'meters',
        rows: '42 `meter("sig")` left as written',
        test: /\bmeter\("[^"]*[0-9/][^"]*"/,
        why: 'a signature’s levels are the grouping rule (#17): written out where the piece plays the same so',
    },
    {
        key: 'gates',
        rows: '111–113 `play=` `level=` `[&a, &b]`',
        test: (text) => text.split('\n').some((l) => /\b(?:play|level)=/.test(l) && !/\bat=/.test(l)),
        why: 'a gate is a set of products, each receiver times its notes and levels, written into the card’s mix; one a role reads (a performer’s part), or one over a kit, stays',
    },
    {
        key: 'pitch',
        rows: '88 `pitch=&x`',
        test: /pitch=&[\w(]/,
        why: 'a voice’s pitch= joins every product the voice is in, a sum in each: left where the voice is read but in a mix (a gate, a kit), in a sum, or its pitch written in place',
    },
    {
        key: 'copies',
        rows: '14, 79 `=` `base=`',
        test: /\bbase=/,
        why: 'the base’s braid written over: the parser does it (parser/base.ts), so it is mechanical, but needs the base’s text',
    },
];
