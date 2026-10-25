import { parseFields } from "./level.js";
import { MAX_NESTING, NUM } from "./scanner.js";
import { parseFree } from "./free.js";
import { syntax } from "./syntax.js";
export const MIX_SYNTAX = [
    syntax('mix', '[a, b, …]', 'A mix: one chord of sounds, each a product or a sum. On the sound card (map=sample), one chord is mono, two are left and right.', ['&mix [&theme * &lead, &bass * 0.5]'], 'mix.md'),
    syntax('mix', 'p * s · v * s', 'A pitch or a volume acting on a sound: the voice is the factor that is a sound, wherever it is written. `*` is commutative and associative; two pitches multiplied add.', ['&mix [&theme * &lead]', '&mix [&lead * &accent * &theme]'], 'mix.md'),
    syntax('mix', 'a + b · a - b', "Pitches add (subtract) in semitones; sounds mix (they can't be subtracted).", ['&mix [(&theme + &vibrato - 12) * &lead]', '&mix [&a * &lead + &b * &organ]'], 'mix.md'),
    syntax('mix', 'n', "A number takes its operator's sort: semitones in a sum (0 changes nothing), a gain in a product (1 changes nothing; a negative gain inverts the phase: * -.5 is half the level, upside down).", ['&mix [(&pedal + 12) * &bass * 0.8]'], 'mix.md'),
    syntax('mix', 'free(v, lo..hi)', 'A gain left to the performer.', ['&mix [&theme * &lead * free(.8, 0..1)]'], 'free.md'),
    syntax('mix', '( … )', "Grouping. By the laws, grouping and order don't change what plays.", ['&mix [&theme * (&lead + &organ) * 0.5]'], 'mix.md'),
];
export const GATE_SYNTAX = [
    syntax('gate', 'play=&x', 'A gate: it plays the notes of &x on the voices in its braid (one voice, a kit, or several), as the product [&x * &voice] does. On a cell with no braid, play= is a read head.', ['&leadOut play=&tune &lead'], 'mix.md'),
    syntax('gate', 'play=&x^$n · play=&x^n', "A gate transposes what it plays, as a braid moves a cell: ^$n n grid steps (semitones on the 12), ^n n degrees of the part's table.", ['&bass play=&bassline^$-12 &bassV', '&lead play=&tune^2 &leadV'], 'mix.md'),
    syntax('gate', '&drums &bass &pad &stab &lead', "A performer's role is its gate's name (decision 058), as a kit member's drum note is its name: a trailing number a copy (&lead2), any other name no role.", ['&bass play=&bassline level=.8 &bassV', '&lead2 play=&answer &bell'], 'mix.md'),
    syntax('gate', 'level=&a*&b*n', 'How loud a gate plays: the product of its level cells and a gain (level=.4 a gain alone).', ['&leadOut play=&tune level=&accent*&duck*.4 &lead'], 'mix.md'),
    syntax('gate', '[&a, &b]', 'A gate plays a chord of voices all at once; several bare voices (&a &b) are a kit, its notes picking one.', ['&leadOut play=&tune [&lead, &bell]'], 'mix.md'),
];
export function isMixChord(text, at) {
    let depth = 0;
    let cells = false;
    const parts = [[]];
    let item = '';
    const end = () => {
        if (item)
            parts[parts.length - 1].push(item);
        item = '';
    };
    for (let i = at; i < text.length; i++) {
        const c = text[i];
        if (c === '&')
            cells = true;
        if (c === '[' || c === '(') {
            if (depth++ === 0)
                continue;
        }
        else if (c === ']' || c === ')') {
            if (--depth === 0)
                break;
        }
        else if (depth === 1 && c === ',') {
            end();
            parts.push([]);
            continue;
        }
        else if (depth === 1 && /\s/.test(c)) {
            end();
            continue;
        }
        item += c;
    }
    end();
    if (!cells)
        return false;
    const operator = (x) => /^[*+(-]|[*+-]$/.test(x);
    return !parts.some((p) => (p.length > 1 && !p.some(operator)) || (p.length === 1 && p[0].startsWith('[')));
}
export function parseMixChord(s) {
    s.i++;
    const exprs = [];
    for (;;) {
        exprs.push(parseExpr(s, 0));
        s.skipSpace();
        if (s.peek() === ',') {
            s.i++;
            continue;
        }
        const next = s.peek();
        if (next === '|')
            s.fail("',' or ']' in the mix: a mix lists its terms with commas ([&a, &b]); a choice [a|b] picks between numbers in a braid (&x [0|2]), not between cells", s.i, 1);
        if (next === '[' || next === '&')
            s.fail("',' or ']' in the mix: a mix lists its terms with commas ([&a, &b]); one term is a product or a sum, its parts joined by * or +", s.i, 1);
        s.expect(']', `',' or ']' in the mix`);
        return { kind: 'mix', exprs };
    }
}
function parseExpr(s, depth) {
    const start = s.i;
    const items = [{ e: parseProduct(s, depth), sign: 1 }];
    for (;;) {
        s.skipSpace();
        const op = s.peek();
        if (op !== '+' && op !== '-')
            break;
        s.i++;
        items.push({ e: parseProduct(s, depth), sign: op === '-' ? -1 : 1 });
    }
    return items.length === 1 ? items[0].e : { k: 'sum', items, span: s.span(start) };
}
function parseProduct(s, depth) {
    s.skipSpace();
    const start = s.i;
    const factors = [parseFactor(s, depth)];
    for (;;) {
        s.skipSpace();
        if (s.peek() !== '*')
            break;
        s.i++;
        factors.push(parseFactor(s, depth));
    }
    return factors.length === 1 ? factors[0] : { k: 'prod', factors, span: s.span(start) };
}
function parseFactor(s, depth) {
    s.skipSpace();
    const start = s.i;
    if (s.peek() === '(') {
        if (depth >= MAX_NESTING)
            s.fail(`Parentheses in a mix nest ${MAX_NESTING} deep at most: name a part (&part [ … ]) and use it`, start);
        s.i++;
        const e = parseExpr(s, depth + 1);
        s.skipSpace();
        s.expect(')', `')' to close the group`);
        return e;
    }
    if (s.peek() === '&') {
        const ref = s.ref('a cell, like &theme');
        const level = parseFields(s);
        return level === undefined ? { k: 'ref', ref } : { k: 'ref', ref, level };
    }
    if (s.text.startsWith('free(', s.i)) {
        const f = parseFree(s, 'gain', false);
        return { k: 'num', value: f.value, span: s.span(start) };
    }
    const n = s.match(NUM);
    if (n !== null)
        return { k: 'num', value: parseFloat(n), span: s.span(start) };
    if (s.match(/gate\(/y))
        s.fail('gate(…) is planned but not built yet: for now a step= term articulates, loop= terms bend', start, 5);
    return s.fail(`Expected a cell, a number or '(' here`);
}
