import { splitComment } from "./edit.js";
import { FROM_FORM, isAttribute, readFrom, readUse, topTokens, USE_FORM } from "./parser/use.js";
import { STYLE } from "./style.js";
import { INTERFACE_NAMES } from "./program.js";
export const USE_DEPTH = 8;
const HEAD = /^&([A-Za-z_][A-Za-z0-9_]*)(?=\s|$)/;
const READS = /&([A-Za-z_][A-Za-z0-9_]*)/g;
const CONTINUES = /[+*,[]\s*$/;
function linesOf(text) {
    const out = [];
    let carry = null;
    text.split('\n').forEach((raw, i) => {
        const code = splitComment(raw)[0];
        carry ??= { written: [], code: [], line: i + 1 };
        carry.written.push(raw);
        carry.code.push(code);
        if (CONTINUES.test(code))
            return;
        const whole = carry.code.join(' ').trim().split(/\s+/).join(' ');
        if (whole)
            out.push(lineOf(whole, carry.written.join('\n'), carry.line));
        carry = null;
    });
    return out;
}
function lineOf(code, written = code, line = 0) {
    const use = readUse(code);
    const from = use === undefined ? readFrom(code) : undefined;
    if (use !== undefined || from !== undefined)
        return { name: null, use, from, reads: [], written, code, line };
    const head = HEAD.exec(code);
    const reads = head ? [...new Set([...code.slice(head[0].length).matchAll(READS)].map((m) => m[1]))] : [];
    return { name: head?.[1] ?? null, use, reads, written, code, line };
}
export const hasUse = (text) => /^\s*use(?![A-Za-z0-9_])/m.test(text) || /^\s*(?:\*|&[A-Za-z_][A-Za-z0-9_]*)(?=[\s,]).*\sfrom(?:\s|$)/m.test(text);
export function signatureOf(text) {
    for (const l of linesOf(text))
        if (l.from?.kind === 'signature')
            return l.from;
    return null;
}
export const bodyOf = (text) => text
    .split('\n')
    .filter((raw) => readFrom(splitComment(raw)[0].trim())?.kind !== 'signature')
    .join('\n');
function hash64(s) {
    let a = 0x811c9dc5;
    let b = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        a = Math.imul(a ^ c, 0x01000193);
        b = Math.imul(b ^ c, 0x01000193) ^ (b >>> 15);
    }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
export const fragmentHash = (text) => `e1:${hash64(linesOf(text)
    .map((l) => l.code)
    .join('\n'))}`;
const quoted = (id) => JSON.stringify(id);
const pathOf = (path) => path.map(quoted).join(' → ');
const INTERFACE = new Set(INTERFACE_NAMES.map((n) => n.slice(1)));
function merge(own, used, say, host) {
    const defined = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
    const given = new Map();
    const lines = own.filter((l) => l.name);
    const per = used.map(({ id, names, lines: theirs, resolved, parameters }, i) => {
        const byName = new Map();
        for (const l of theirs)
            if (l.name && !byName.has(l.name))
                byName.set(l.name, l);
        if (names && resolved) {
            const lacking = [...names].filter((n) => !byName.has(n));
            for (const n of lacking)
                say(i, `&${n} is not in ${quoted(id)}: it defines ${[...byName.keys()].map((m) => `&${m}`).join(', ')}`);
        }
        const shadowed = new Set();
        if (!names)
            for (let more = true; more;) {
                more = false;
                for (const n of byName.keys()) {
                    if (defined.has(n) || shadowed.has(n))
                        continue;
                    const readers = theirs.filter((l) => l.name && l.name !== n && l.reads.includes(n));
                    if (readers.length && readers.every((l) => defined.has(l.name) || shadowed.has(l.name))) {
                        shadowed.add(n);
                        more = true;
                    }
                }
            }
        const asked = names ?? new Set([...byName.keys()].filter((n) => !shadowed.has(n)));
        const overrode = [...asked].filter((n) => byName.has(n) && defined.has(n)).map((n) => `&${n}`);
        const take = new Set();
        const clashed = new Set();
        const queue = [...asked].filter((n) => byName.has(n) && !defined.has(n));
        for (let n = queue.shift(); n !== undefined; n = queue.shift()) {
            if (take.has(n))
                continue;
            take.add(n);
            for (const r of byName.get(n).reads) {
                if (!byName.has(r) || take.has(r) || asked.has(r) || clashed.has(r))
                    continue;
                if (!defined.has(r))
                    queue.push(r);
                else if (INTERFACE.has(r) || parameters?.has(r))
                    continue;
                else {
                    clashed.add(r);
                    say(i, `&${r} is ${quoted(id)}'s, read by its &${n}, and ${host}'s too: rename ${host}'s, or name &${r} in the use to override it`);
                }
            }
        }
        if (byName.has(STYLE))
            say(i, `&${STYLE} is the composer's, the section's style: ${quoted(id)} defines it, where a fragment only reads it (the score writes &${STYLE} style=…; a reader with none plays the centre)`);
        const gave = new Set();
        for (const l of theirs) {
            if (!l.name || !take.has(l.name))
                continue;
            if (l.name === STYLE)
                continue;
            const there = given.get(l.name);
            if (there) {
                if (there.id !== id && there.code === l.code)
                    gave.add(`&${l.name}`);
                else if (there.id !== id)
                    say(i, `&${l.name} is defined by ${quoted(there.id)} and by ${quoted(id)}, by different lines: write it in the piece, or drop one use`);
                continue;
            }
            given.set(l.name, { id, code: l.code });
            gave.add(`&${l.name}`);
            lines.push(l);
        }
        const read = overrode.filter((n) => [...take].some((t) => byName.get(t).reads.includes(n.slice(1))));
        return { gave: [...gave], overrode, read };
    });
    return { lines, per };
}
const namesOf = (u) => (u.names ? new Set(u.names.map((n) => n.slice(1))) : null);
const entryOf = (l) => l.use ? { id: l.use.id, names: l.use.names, from: null } : l.from?.kind === 'use' ? { id: l.from.id, names: l.from.names, from: l.from } : null;
const renamed = (code, names) => code.replace(/"[^"]*"|&([A-Za-z_][A-Za-z0-9_]*)/g, (m, n) => (n && names.has(n) ? `&${names.get(n)}` : m));
const keyOf = (attribute) => attribute.slice(0, attribute.indexOf('='));
function withAttributes(code, attributes) {
    const keys = new Set(attributes.map(keyOf));
    const [name, ...rest] = topTokens(code).map((t) => t.text);
    return [name, ...rest.filter((t) => !(isAttribute(t) && keys.has(keyOf(t)))), ...attributes].join(' ');
}
function inherited(name, defaultCode, body) {
    const set = new Set(topTokens(body).flatMap((t) => (isAttribute(t.text) ? [keyOf(t.text)] : [])));
    const kept = topTokens(defaultCode)
        .slice(1)
        .flatMap((t) => (isAttribute(t.text) && !set.has(keyOf(t.text)) ? [t.text] : []));
    return [`&${name}`, ...kept, body].join(' ');
}
const ALONE = new Set(['step', 'loop', 'swing']);
function asCell(body, parameter, lines) {
    if (topTokens(body).some((t) => isAttribute(t.text)))
        return body;
    const keys = new Set();
    let other = false;
    const ref = new RegExp(`&${parameter}(?![A-Za-z0-9_])`);
    for (const l of lines)
        for (const t of topTokens(l.code).slice(1)) {
            if (!ref.test(t.text))
                continue;
            const read = new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)=&${parameter}(?![A-Za-z0-9_])`).exec(t.text);
            if (read)
                keys.add(read[1]);
            else
                other = true;
        }
    const [key] = keys;
    return keys.size === 1 && !other && ALONE.has(key) ? `${key}=${body}` : body;
}
function readsAsValue(code, name) {
    const stack = [];
    const attribute = [false];
    let quoted = false;
    let tokenStart = true;
    for (let i = 0; i < code.length; i++) {
        const c = code[i];
        if (c === '"')
            quoted = !quoted;
        if (quoted || c === '"')
            continue;
        const body = stack.every((k) => k === 'lambda');
        if (/\s/.test(c)) {
            if (body)
                attribute[attribute.length - 1] = false;
            tokenStart = true;
            continue;
        }
        if (tokenStart && body && /^[A-Za-z_][A-Za-z0-9_]*=/.test(code.slice(i)))
            attribute[attribute.length - 1] = true;
        tokenStart = false;
        if (c === '(') {
            const before = code[i - 1] ?? '';
            const kind = before === '&' ? 'lambda' : /[A-Za-z0-9_]/.test(before) ? 'call' : 'group';
            stack.push(kind);
            if (kind === 'lambda') {
                attribute.push(attribute.at(-1));
                tokenStart = true;
            }
            continue;
        }
        if (c === ')') {
            if (stack.pop() === 'lambda')
                attribute.pop();
            continue;
        }
        if (c !== '&')
            continue;
        const m = /^&([A-Za-z_][A-Za-z0-9_]*)/.exec(code.slice(i));
        if (m?.[1] !== name)
            continue;
        const after = code[i + m[0].length];
        if (attribute.some(Boolean) || stack.includes('call') || after === '^' || after === '[')
            return true;
    }
    return false;
}
const sharedLines = (lines) => lines.map((l) => (l.shared ? l : { ...l, shared: true }));
function give(entry, path, text, resolve, say, taken) {
    const { id, from } = entry;
    const signatures = linesOf(text).flatMap((l) => (l.from?.kind === 'signature' ? [l.from] : []));
    if (!from || !signatures.length) {
        if (from && (from.head.length || from.args || from.main !== null))
            say(`${quoted(id)} has no signature, so it takes no arguments: a collection gives the cells it defines by name (${entry.names ? entry.names.join(', ') : '*'} from ${from.id})`);
        const parameters = new Set(signatures.flatMap((g) => [...g.optional, ...(g.main ? [g.main] : [])]).map((n) => n.slice(1)));
        const lines = sharedLines(fragmentLines(path, text, resolve, say));
        return { taken: { id, names: namesOf(entry), lines, resolved: true, ...(parameters.size ? { parameters } : {}) }, copy: [] };
    }
    if (signatures.length > 1)
        say(`${quoted(id)} has ${signatures.length} signatures: a fragment has one (&head from (&optional) &main)`);
    return instantiate(from, id, signatures[0], path, text, resolve, say, taken);
}
function instantiate(from, id, signature, path, text, resolve, say, taken) {
    const full = fragmentLines(path, text, resolve, say);
    const own = full.filter((l) => !l.shared && l.name);
    const shared = full.filter((l) => l.shared && l.name);
    const definesOwn = new Set(own.map((l) => l.name));
    const defines = new Set(full.flatMap((l) => (l.name ? [l.name] : [])));
    const bare = (n) => n.slice(1);
    const heads = signature.names.map(bare);
    const optional = signature.optional.map(bare);
    const main = signature.main ? bare(signature.main) : null;
    for (const h of heads)
        if (!definesOwn.has(h))
            say(`${quoted(id)}'s signature names &${h} its head, and it doesn't define it`);
    for (const o of optional)
        if (!definesOwn.has(o))
            say(`${quoted(id)}'s &${o} is an optional parameter: its line in the fragment is its default, and it has none`);
    if (main && defines.has(main))
        say(`${quoted(id)}'s &${main} is its main parameter: it has no line, the argument is it`);
    const names = new Map();
    if (from.names?.length === 1 && heads.length === 1)
        names.set(heads[0], bare(from.names[0]));
    else
        for (const n of from.names?.map(bare) ?? heads) {
            if (heads.includes(n))
                names.set(n, n);
            else
                say(`&${n} is not a head of ${quoted(id)}: its head${heads.length > 1 ? 's are' : ' is'} ${heads.map((h) => `&${h}`).join(', ')}`);
        }
    const one = names.size === 1;
    const reached = new Set();
    const byName = new Map(full.flatMap((l) => (l.name ? [[l.name, l]] : [])));
    for (const queue = [...names.keys()]; queue.length;) {
        const n = queue.shift();
        if (reached.has(n))
            continue;
        reached.add(n);
        for (const r of byName.get(n)?.reads ?? [])
            if (byName.has(r))
                queue.push(r);
    }
    if (from.head.length && !one)
        say(`The attributes before from are the head's, and this line takes ${names.size} heads from ${quoted(id)}: write them on each head's own line`);
    const args = new Map((from.args ?? []).map((a) => [a.name, a.value]));
    for (const k of args.keys())
        if (!optional.includes(k))
            say(`${quoted(id)} takes no ${k}=: ${optional.length ? `its optional parameters are ${optional.map((o) => `${o}=`).join(', ')}` : 'it has no optional parameters'}`);
    if (main && from.main === null)
        say(`${quoted(id)} needs its main argument, &${main}, after its id: ${from.names?.[0] ?? `&${heads[0]}`} from ${from.id} …`);
    if (!main && from.main !== null)
        say(`${quoted(id)} takes no main argument: its signature has none (&${heads[0]} from ${signature.optional.length ? `(${signature.optional.join(', ')})` : ''})`);
    const BARE = /^&([A-Za-z_][A-Za-z0-9_]*)$/;
    const values = new Map();
    for (const [k, v] of args)
        if (optional.includes(k))
            values.set(k, v);
    if (main && from.main !== null)
        values.set(main, from.main);
    const byReference = new Set();
    for (const [p, v] of values) {
        const ref = BARE.exec(v);
        if (ref) {
            names.set(p, ref[1]);
            byReference.add(p);
        }
    }
    const prefix = names.get(heads[0]) ?? [...names.values()][0] ?? heads[0];
    for (const n of [...names.values()])
        taken.add(n);
    for (const n of [...definesOwn, ...(main ? [main] : [])]) {
        if (names.has(n))
            continue;
        let mine = `${prefix}_${n}`;
        for (let k = 2; taken.has(mine) || defines.has(mine); k++)
            mine = `${prefix}${k}_${n}`;
        taken.add(mine);
        names.set(n, mine);
    }
    const declared = new Set([...defines, ...(main ? [main] : [])]);
    const undeclared = new Set();
    for (const l of own)
        for (const r of l.reads)
            if (!declared.has(r) && !undeclared.has(r) && readsAsValue(l.code, r)) {
                undeclared.add(r);
                say(`${quoted(id)}'s &${l.name} reads &${r}, which it neither defines nor declares: name it in its signature (&${heads[0]} from (&${r}) …), or define it`);
            }
    const copy = [];
    for (const l of own) {
        const p = l.name;
        if (byReference.has(p) || !reached.has(p))
            continue;
        let code = renamed(l.code, names);
        if (values.has(p))
            code = inherited(names.get(p), code, asCell(values.get(p), p, own));
        if (heads.includes(p) && from.head.length && one)
            code = withAttributes(code, from.head);
        copy.push(lineOf(code));
    }
    if (main && from.main !== null && !byReference.has(main))
        copy.push(lineOf(`&${names.get(main)} ${asCell(from.main, main, own)}`));
    const sharing = shared.filter((l) => reached.has(l.name));
    const given = { id, names: new Set(sharing.map((l) => l.name)), lines: sharing, resolved: true };
    return { taken: given, copy, args: Object.fromEntries(values) };
}
function fragmentLines(path, text, resolve, say) {
    const own = linesOf(text);
    const where = ` (in ${pathOf(path)})`;
    const sayHere = (message) => say(`${message}${where}`);
    const taken = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
    const copies = [];
    const used = own.flatMap((l) => {
        if (l.use === null || l.from === null) {
            sayHere(l.use === null ? USE_FORM : FROM_FORM);
            return [];
        }
        const entry = entryOf(l);
        if (!entry)
            return [];
        const { id } = entry;
        const names = namesOf(entry);
        const next = [...path, id];
        if (path.includes(id))
            say(`use ${quoted(id)} is a cycle: ${pathOf(next)}`);
        else if (next.length > USE_DEPTH)
            say(`use ${quoted(id)} nests past ${USE_DEPTH} deep: ${pathOf(next)}`);
        else {
            const theirs = resolve(id);
            if (theirs === null)
                sayHere(`No fragment ${quoted(id)} to use`);
            else {
                const g = give(entry, next, theirs, resolve, say, taken);
                copies.push(...g.copy);
                return [g.taken];
            }
        }
        return [{ id, names, lines: [], resolved: false }];
    });
    return merge([...own, ...copies], used, (_, message) => sayHere(message), quoted(path.at(-1))).lines;
}
export function expansion(text, { resolve, locked = [] } = {}) {
    const own = linesOf(text);
    const uses = own.flatMap((l) => {
        const entry = entryOf(l);
        return entry ? [{ line: l, ...entry }] : [];
    });
    const diagnostics = [];
    const spanOf = (l) => {
        const first = l.written.split('\n')[0] ?? '';
        const col = first.search(/\S/);
        return { line: l.line, col: col + 1, len: first.trimEnd().length - col };
    };
    const hashes = [];
    const copies = [];
    const args = [];
    const taken = new Set(own.flatMap((l) => (l.name ? [l.name] : [])));
    const used = uses.map((u) => {
        const { id } = u;
        const names = namesOf(u);
        const span = spanOf(u.line);
        const say = (message) => diagnostics.push({ severity: 'error', message, span });
        const recorded = locked.find((k) => k.id === id)?.hash;
        const theirs = resolve ? resolve(id, ...(recorded ? [recorded] : [])) : null;
        if (theirs === null) {
            say(resolve ? `No fragment ${quoted(id)} to use` : `No library to use ${quoted(id)} from: compileSource(text, env, { resolve })`);
            hashes.push(null);
            copies.push([]);
            args.push(undefined);
            return { id, names, lines: [], resolved: false };
        }
        const hash = fragmentHash(theirs);
        hashes.push(hash);
        if (recorded && recorded !== hash)
            diagnostics.push({ severity: 'warning', message: `${quoted(id)} has changed since this piece was saved: its current version plays`, span });
        const g = give(u, [id], theirs, resolve, say, taken);
        copies.push(g.copy);
        args.push(g.args);
        return g.taken;
    });
    const merged = merge([...own, ...copies.flat()], used, (i, message) => diagnostics.push({ severity: 'error', message, span: spanOf(uses[i].line) }), 'the piece');
    uses.forEach((u, i) => {
        const { gave, overrode, read } = merged.per[i];
        if (!used[i].resolved || args[i])
            return;
        const warn = (message) => diagnostics.push({ severity: 'warning', message, span: spanOf(u.line) });
        const { id, names } = u;
        const earlier = uses.findIndex((v) => v.id === id && !args[uses.indexOf(v)]);
        if (!gave.length && earlier < i)
            warn(`${quoted(id)} is used already, on line ${uses[earlier].line.line}: this use adds nothing`);
        else if (names)
            for (const n of overrode.filter((o) => !read.includes(o)))
                warn(`The piece defines ${n}, so taking it from ${quoted(id)} adds nothing`);
        else if (!gave.length && overrode.length)
            warn(`The piece defines all ${quoted(id)} gives (${overrode.join(', ')}): this use adds nothing`);
    });
    const head = text.split('\n').length;
    const from = new Map([...copies.flatMap((c, i) => c.map((l) => [l, i])), ...used.flatMap((u, i) => u.lines.map((l) => [l, i]))]);
    const added = merged.lines.filter((l) => from.has(l));
    const through = [];
    for (const l of added)
        for (let k = l.written.split('\n').length; k > 0; k--)
            through.push(spanOf(uses[from.get(l)].line));
    return {
        text: added.length ? [text, ...added.map((l) => l.written)].join('\n') : text,
        uses: uses.map((u, i) => {
            const copied = copies[i].filter((l) => from.get(l) === i && l.name).map((l) => `&${l.name}`);
            const visible = args[i] ? (u.names ?? []).filter((n) => copied.includes(n)) : [];
            return {
                id: u.id,
                names: u.names,
                span: spanOf(u.line),
                hash: hashes[i] ?? null,
                gave: args[i] ? [...new Set([...visible, ...copied, ...merged.per[i].gave])] : merged.per[i].gave,
                overrode: merged.per[i].overrode,
                ...(args[i] ? { args: args[i] } : {}),
            };
        }),
        given: new Set(added.flatMap((l) => (l.name && l.shared ? [l.name] : []))),
        diagnostics,
        through: (line) => (line > head ? (through[line - head - 1] ?? null) : null),
    };
}
export function expand(text, resolve, locked) {
    if (!hasUse(text))
        return text;
    const x = expansion(text, { resolve, ...(locked ? { locked } : {}) });
    const kept = new Set(x.uses.filter((u) => u.hash === null).map((u) => u.span.line));
    const own = text
        .split('\n')
        .filter((raw, i) => (readUse(splitComment(raw)[0]) === undefined && readFrom(splitComment(raw)[0])?.kind !== 'use') || kept.has(i + 1))
        .join('\n');
    const added = x.text.split('\n').slice(text.split('\n').length);
    return [own.replace(/\s+$/, ''), ...added].join('\n') + (text.endsWith('\n') ? '\n' : '');
}
