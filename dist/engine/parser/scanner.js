import { syntax } from "./syntax.js";
import { pitchOfName } from "../../theory/modes.js";
import { parseFree } from "./free.js";
import { BUILT, NUMBER_PLACES } from "./numbers.js";
export const REFERENCE_SYNTAX = [
    syntax('reference', '&name', 'A cell, by name: in a braid (spliced in), after an attribute (over=&scale), in a mix.', ['&theme step=2 &motif 0'], 'cell.md'),
    syntax('reference', '&name[i]', 'One entry of its braid as it is turned now (a fixed reader: it follows shift=), counted from 0; negative from the end (&x[-1] the last). &name[$i]: as written.', ['&tune step=2 &motif[0] &motif[-1] &key[$0]'], 'braid.md'),
    syntax('reference', '&name[a:b] · &name[a:b:s]', 'A slice, Python-style: from a up to b (either may be left out), every s-th; [::-1] backwards (retrograde). As turned; [$a:b] as written.', ['&tune step=2 &motif[1:3] &motif[:-1] &motif[::-1] &motif[::2]'], 'braid.md'),
    syntax('reference', '&name[slot]', "One slot by its name, as its map names them (decision 063): an envelope's attack, decay, sustain, release (map=adsr); a style's axes (map=style). The slot's fixed position, as written: &env[sustain] is &env[$2].", ['&held step=4n &level[sustain] &level[attack]', '&leaning map=lin step=1m &funk[bite] &swing[bite]'], 'style.md'),
    syntax('reference', '&name[<<n] · &name[>>n]', 'Shifted back or forward n places (1 if left out), on top of its own shift=: rotating it, climbing the helix.', ['&canon step=2 &theme[>>4]', '&mode over=&scale[<<] 0 2 4'], 'braid.md'),
    syntax('reference', '&name^n · degree(&name, n)', 'In a braid, moved n steps of the table it is read through (degrees, in a scale; relative): its values plus n, before the table reads them. n may be negative. &name^n is the short form.', ['&tune over=&major step=2 &motif &motif^1 &motif^-2', '&tune over=&major step=2 degree(inverse(&motif), 4)'], 'braid.md'),
    syntax('reference', '&name^$n', 'In a braid, transposed: what it plays, n grid steps up (^$-n down) after its tables (absolute: semitones on the 12).', ['&answer step=2 &subject^$7 &subject^$-12'], 'braid.md'),
    syntax('reference', 'inverse(&name)', 'In a braid, mirrored: its values negated before the table reads them (inversion within the scale, round its first degree). Operations nest: degree(inverse(&x), 4) mirrors round the third degree.', ['&tune over=&major step=2 &motif inverse(&motif) degree(inverse(&motif), 4)'], 'braid.md'),
    syntax('reference', '&( … )', 'An unnamed cell, written where it is used, with attributes and a braid of its own.', ['&lead s=saw loop=C4 env=&(map=adsr .01 .3 .5 .4)'], 'cell.md'),
];
export const IDENT = /[A-Za-z_][A-Za-z0-9_]*/y;
const INT = /-?[0-9]+/y;
const MOVED_RANGE = /-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\.\.-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)\s*\*\s*&/y;
export const NUM = /-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y;
export const MAX_REPS = 4096;
export const MAX_NESTING = 32;
export class LineError extends Error {
    col;
    len;
    constructor(message, col, len = 1) {
        super(message);
        this.col = col;
        this.len = len;
    }
}
export function placeIn(parts, at) {
    let part = parts[0];
    for (const p of parts)
        if (p.start <= at)
            part = p;
    return { line: part.line, col: at - part.start + 1 };
}
export class LineScanner {
    text;
    line;
    offset;
    lambdas;
    parts;
    warnings;
    depth;
    body;
    i = 0;
    frees = [];
    constructor(text, line, offset = 0, lambdas = [], parts = [{ line, start: 0 }], warnings = [], depth = 0, body) {
        this.text = text;
        this.line = line;
        this.offset = offset;
        this.lambdas = lambdas;
        this.parts = parts;
        this.warnings = warnings;
        this.depth = depth;
        this.body = body;
    }
    within(text, start, depth = this.depth) {
        return new LineScanner(text, this.line, this.offset + start, this.lambdas, this.parts, this.warnings, depth, this.body);
    }
    warn(message, start, len) {
        this.warnings.push({ severity: 'warning', message, span: { ...this.place(start), len } });
    }
    place(start) {
        return { ...placeIn(this.parts, start + this.offset), len: Math.max(1, this.i - start) };
    }
    skipSpace() {
        while (this.i < this.text.length && /\s/.test(this.text[this.i]))
            this.i++;
    }
    done() {
        this.skipSpace();
        return this.i >= this.text.length;
    }
    peek() {
        return this.text[this.i] ?? '';
    }
    span(start) {
        return this.place(start);
    }
    fail(message, start = this.i, len = 1) {
        throw new LineError(message, start + this.offset, len);
    }
    match(re) {
        re.lastIndex = this.i;
        const m = re.exec(this.text);
        if (!m)
            return null;
        this.i += m[0].length;
        return m[0];
    }
    ident(what) {
        const id = this.match(IDENT);
        if (id === null)
            this.fail(`Expected ${what}`);
        return id;
    }
    free(place, name = place.name) {
        if (!this.text.startsWith('free(', this.i)) {
            this.refuseCell(place);
            return null;
        }
        const start = this.i;
        if (place.fixed)
            this.fail(`${place.form}: a number, not free(…) — ${place.fixed}`, start, 5);
        const key = place.key ?? 'param';
        const f = parseFree(this, key, !!place.units, { ...(key === 'param' ? { param: name } : {}), ...(place.whole ? { whole: true } : {}) });
        const len = this.i - start;
        if (f.text !== undefined && key !== 'choice')
            this.fail(`free("…") is a text, for spell(…) and meter(…): ${place.form} takes free(v, lo..hi)`, start, len);
        if (place.whole && !place.rounds && ![f.lo, f.hi].every(Number.isInteger))
            this.fail(`${place.form} takes a whole number: free(…)'s range whole — free(${Math.round(f.value)}, ${Math.floor(f.lo)}..${Math.ceil(f.hi)})`, start, len);
        if ((place.min !== undefined && f.lo < place.min) || (place.max !== undefined && f.hi > place.max))
            this.fail(`${place.form}: free(…) moves within ${place.min ?? '…'}..${place.max ?? '…'} — free(${f.value}, ${Math.max(f.lo, place.min ?? f.lo)}..${Math.min(f.hi, place.max ?? f.hi)})`, start, len);
        return f;
    }
    freeNumber(place, name) {
        const f = this.free(place, name);
        return f === null ? null : place.whole ? Math.round(f.value) : f.value;
    }
    refuseCell(place) {
        MOVED_RANGE.lastIndex = this.i;
        const ranged = MOVED_RANGE.test(this.text);
        if (!ranged && (this.peek() !== '&' || place.moves))
            return;
        const len = Math.max(1, /^[^\s,)\]]*/.exec(this.text.slice(this.i))[0].length);
        const how = ranged ? 'a range moved by cells' : 'a cell';
        this.fail(place.cell.startsWith(BUILT)
            ? `${place.form} is read as the piece is built: a number, or free(v, lo..hi), whose slider compiles it again — ${how} moves only a number read while the piece plays (decision 078)`
            : `${place.form} takes a number, or free(v, lo..hi), and ${how} isn't read here: ${place.cell.replace(/^no: /, '')} (decision 078)`, this.i, len);
    }
    int(what, place, name) {
        const f = this.freeNumber(place, name);
        if (f !== null)
            return f;
        const n = this.match(INT);
        if (n === null)
            this.fail(`Expected ${what}`);
        return parseInt(n, 10);
    }
    num(what, place, name) {
        const f = this.freeNumber(place, name);
        if (f !== null)
            return { value: f, alter: 0 };
        const n = this.match(NUM);
        if (n === null)
            this.fail(`Expected ${what}`);
        let value = parseFloat(n);
        if (this.peek() === '/' && /[0-9.]/.test(this.text[this.i + 1] ?? '')) {
            this.i++;
            const d = this.match(NUM);
            if (d === null || !(parseFloat(d) !== 0))
                this.fail('a fraction needs a denominator, like 9/8');
            value /= parseFloat(d);
        }
        let alter = 0;
        while (this.peek() === '#' || this.peek() === 'b')
            alter += this.text[this.i++] === '#' ? 1 : -1;
        return { value, alter };
    }
    noteName() {
        const m = this.match(/[A-G](?:#|b)?(?:-?[0-9]+)?(?![A-Za-z0-9_])/y);
        return m === null ? null : pitchOfName(m);
    }
    expect(ch, what) {
        if (this.peek() !== ch)
            this.fail(`Expected ${what}`);
        this.i++;
    }
    lambda() {
        const open = this.i;
        if (this.depth >= MAX_NESTING)
            this.fail(`Unnamed cells &( … ) nest ${MAX_NESTING} deep at most: name the inner ones (&env …) and refer to them`, open - 1, 2);
        let depth = 0;
        let close = -1;
        for (let k = open; k < this.text.length; k++) {
            if (this.text[k] === '(')
                depth++;
            else if (this.text[k] === ')' && --depth === 0) {
                close = k;
                break;
            }
        }
        if (close < 0)
            this.fail(`')' to close &( … )`, open);
        const name = `λ${this.line}_${open + this.offset}`;
        if (!this.body)
            this.fail('An unnamed cell &( … ) here has no parser for its body', open - 1, 2);
        const inner = this.within(this.text.slice(open + 1, close), open + 1, this.depth + 1);
        const decl = this.body(inner, { name, pick: null, shift: 0, span: { ...placeIn(this.parts, open + this.offset - 1), len: close - open + 2 } });
        this.lambdas.push({ ...decl, lambda: this.text.slice(open + 1, close).trim() });
        this.i = close + 1;
        return name;
    }
    ref(what) {
        const at = this.i;
        this.expect('&', what);
        const name = this.peek() === '(' ? this.lambda() : this.ident('a name after &');
        let pick = null;
        let shift = 0;
        if (this.peek() === '[') {
            this.i++;
            this.skipSpace();
            const dir = this.match(/<<|>>/y);
            if (dir) {
                this.skipSpace();
                const f = this.freeNumber(NUMBER_PLACES.turn);
                const n = f === null ? this.match(/[0-9]+/y) : String(f);
                shift = (dir === '<<' ? -1 : 1) * (n === null ? 1 : parseInt(n, 10));
                this.skipSpace();
                this.expect(']', `']' to close &${name}[${dir}…]`);
                return { name, pick, shift, ...this.transposition(name), span: this.span(at) };
            }
            const slot = this.match(/[a-z][A-Za-z]*(?=\s*\])/y);
            if (slot !== null) {
                this.skipSpace();
                this.expect(']', `']' to close &${name}[${slot}]`);
                return { name, pick, shift, slot, ...this.transposition(name), span: this.span(at) };
            }
            const abs = this.peek() === '$' ? (this.i++, this.skipSpace(), true) : false;
            const $ = abs ? { abs: true } : {};
            const index = () => {
                const f = this.freeNumber(NUMBER_PLACES.pick);
                return f === null ? this.match(INT) : String(f);
            };
            const a = index();
            this.skipSpace();
            if (this.peek() === ':') {
                this.i++;
                this.skipSpace();
                const b = index();
                this.skipSpace();
                let step = null;
                if (this.peek() === ':') {
                    this.i++;
                    this.skipSpace();
                    const at = this.i;
                    const st = index();
                    if (st !== null && parseInt(st, 10) === 0)
                        this.fail('A slice step of 0 never moves', at, st.length);
                    step = st === null ? null : parseInt(st, 10);
                    this.skipSpace();
                }
                pick = { kind: 'slice', from: a === null ? null : parseInt(a, 10), to: b === null ? null : parseInt(b, 10), ...(step !== null ? { step } : {}), ...$ };
            }
            else {
                if (a === null)
                    this.fail(`Expected an index like &${name}[0] (&${name}[$0] as written), or a slice like &${name}[1:]`);
                pick = { kind: 'at', i: parseInt(a, 10), ...$ };
            }
            this.expect(']', `']' to close &${name}[…]`);
        }
        else if ((this.peek() === '+' || this.peek() === '-') && /[0-9]/.test(this.text[this.i + 1] ?? '')) {
            const sign = this.peek();
            const n = /[0-9]+/.exec(this.text.slice(this.i + 1))[0];
            this.fail(`&${name}${sign}${n}: write &${name}^${sign === '-' ? '-' : ''}${n} to move it by its table's steps (in a braid; ^$${sign === '-' ? '-' : ''}${n}: by semitones), &${name} ${sign} ${n} to add pitch (in a mix), &${name}[${sign === '-' ? '<<' : '>>'}${n === '1' ? '' : n}] to shift it, or &${name}[…] to pick from it`, at, this.i - at + 1 + n.length);
        }
        return { name, pick, shift, ...this.transposition(name), span: this.span(at) };
    }
    rejectTap(from) {
        if (this.peek() !== ':')
            return;
        const tap = /^(?:(?:pulse|beat)(?:\*\d+)?|\d+[nt]\.?|\d*m)(?![\w.])/.exec(this.text.slice(this.i + 1));
        if (!tap)
            return;
        const as = this.text.slice(from, this.i + 1 + tap[0].length);
        this.fail(`${as} is a meter's tap, which only step= reads (step=${as}): here it names no cell`, from, as.length);
    }
    cellRef(what, where, tapRead = false) {
        const at = this.i;
        const r = this.ref(what);
        if (!tapRead)
            this.rejectTap(at);
        const caret = this.text.lastIndexOf('^', this.i - 1);
        if (caret >= at && caret > this.text.lastIndexOf(')', this.i - 1))
            this.warn(`${this.text.slice(at, this.i)} ${where}: ^ and ^$ move a cell a braid plays (and base=&cell^n, a copy, and a gate's play=&cell^n); here it is the cell itself, so the move is ignored`, caret, this.i - caret);
        return r;
    }
    transposition(name) {
        if (this.peek() !== '^')
            return {};
        const at = this.i;
        this.i++;
        const abs = this.peek() === '$';
        if (abs)
            this.i++;
        const f = this.freeNumber(NUMBER_PLACES.move);
        const n = f === null ? this.match(/-?[0-9]+/y) : String(f);
        if (n === null)
            this.fail(`&${name}^n moves it n steps of its table (&${name}^1, a degree up), &${name}^$n n semitones (&${name}^$7, &${name}^$-12)`, at, 1);
        if (this.peek() === '.' && /[0-9]/.test(this.text[this.i + 1] ?? ''))
            this.fail(`&${name}${this.text.slice(at, this.i)}…: ^ takes a whole number of steps (&${name}^1, &${name}^$-12)`, at, this.i - at + 1 + /^[0-9]+/.exec(this.text.slice(this.i + 1))[0].length);
        if (this.peek() === '^')
            this.fail(`&${name}${this.text.slice(at, this.i)}^…: one ^ per reference; nest with degree(…): degree(&${name}${this.text.slice(at, this.i)}, n)`, this.i, 1);
        const k = parseInt(n, 10);
        return !k ? {} : abs ? { transpose: k } : { degree: k };
    }
    atBoundary() {
        const c = this.peek();
        return c === '' || /\s/.test(c);
    }
}
export function stripComment(raw) {
    let quoted = false;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === '"')
            quoted = !quoted;
        else if (!quoted && ch === '/' && raw[i + 1] === '/')
            return raw.slice(0, i);
        else if (!quoted && ch === '#' && (i === 0 || /\s/.test(raw[i - 1])))
            return raw.slice(0, i);
    }
    return raw;
}
