import { compileSource } from "./compile.js";
import { voiceGrooves } from "./compiler/declare.js";
import { context } from "./compiler/context.js";
import { SORT_RULES } from "./compiler/sorts.js";
import { parse } from "./parser/index.js";
import { stripComment } from "./parser/scanner.js";
import { DEFAULT_ENV } from "./program.js";
import { CORE, PARAMS } from "./attributes.js";
export const STUBS = new Set([
    ...Object.keys(CORE)
        .filter((k) => CORE[k].stub)
        .map((k) => `attribute ${k}`),
    ...Object.keys(PARAMS)
        .filter((k) => PARAMS[k].stub)
        .map((k) => `parameter ${k}`),
]);
export const PENDING = new Set(['step <a b c>', 'modifier x/n', 'modifier x(k,n,r)', 'parameter beat', 'parameter pulse', 'parameter legato']);
export function formKey(e) {
    if (e.section === 'attribute' || e.section === 'parameter')
        return `${e.section} ${e.form.split('=')[0]}`;
    if (e.section === 'sort')
        return `sort ${e.form}: ${e.means.split(/[(:.]/)[0].trim().toLowerCase()}`;
    return `${e.section} ${e.form.split(' · ')[0]}`;
}
export const TIERS = [
    {
        name: 'Steps and sound',
        concept: 'a voice and the sound card; steps: numbers, rests, holds, repeats, a rate; notes on the cells',
        forms: [
            'line &name …',
            'line &name label="…"',
            'line # …',
            'step n',
            'step ~',
            'modifier x@n',
            'step _',
            'modifier x!n',
            'reference &name',
            'attribute step',
            'attribute loop',
            'attribute map',
            'attribute label',
            'attribute title',
            'attribute tags',
            'attribute about',
            'attribute tier',
            'rate step=r',
            'rate loop=NAME',
            'map map=sample',
            'parameter s',
            'parameter postgain',
            'mix [a, b, …]',
            'mix p * s',
            'mix n',
            'sort signal: a sound parameter',
            'sort pitch: anything else',
        ],
    },
    {
        name: 'Time and voice',
        concept: 'a clock: a bar, its taps (step=4n, step=pulse, step=1m), step=&x, /2 and *2, a tempo marking; a voice: a source and an envelope; filters and effects, a vibrato',
        forms: [
            'generator scan(i …)',
            'rate nbpm',
            'rate step=&x',
            'rate step=&x*n',
            'rate step=16n',
            'rate step=free(r, lo..hi)',
            'free free(marking)',
            'attribute env',
            'reference &( … )',
            'map map=adsr a d s r',
            'attribute pitch',
            'parameter lpf',
            'parameter lpq',
            'parameter hpf',
            'parameter hpq',
            'parameter room',
            'parameter delay',
            'parameter delaytime',
            'parameter delayfeedback',
            'parameter distort',
            'parameter crush',
        ],
    },
    {
        name: 'Melody and harmony',
        concept: 'tables: over=, scale(), shift=; show= and size=; motifs: splicing, reuse, degrees (^n); chords and a progression: accidentals, a sum of pitches',
        forms: [
            'attribute over',
            'attribute shift',
            'attribute show',
            'attribute size',
            'generator scale(name)',
            'step &x',
            'reference &name^n',
            'step [a, b, c]',
            'step n#',
            'mix a + b',
            'mix ( … )',
        ],
    },
    {
        name: 'Rhythm and feel',
        concept: 'meter and feel: a bent bar, gates; drums: a groove of voices, ratchets, a subsequence, euclid, a kit; swing: a swing clock tapped by its pulse, swing= on a meter tapped by name',
        forms: [
            'map map=amp',
            'sort volume: map=amp, map=db or map=adsr',
            'step &voice (stepped)',
            'modifier x*n',
            'step [a b c]',
            'generator euclid(k, n)',
            'sort signal: a pattern read through a kit',
            'line oneshot',
            'modifier &x:0:gain',
            'rate step=pulse',
            'rate step=&m:16n',
            'parameter swing',
            'generator meter("sig")',
        ],
    },
    {
        name: 'Development',
        concept: 'canon: a theme shifted; mirrors: retrograde, slices, picks, transposing, inverse(); variations: a copy changed where it says (base=, =); chance and choice; turning tables: stride=, cycle(&x), the circle of fifths; arrangement: parts as taps of the bar, a selector, laps=, off',
        forms: [
            'parameter gain',
            'reference &name[<<n]',
            'reference &name[i]',
            'reference &name[a:b]',
            'reference &name^$n',
            'reference inverse(&name)',
            'attribute base',
            'step =',
            'modifier x?',
            'step [a|b|c]',
            'attribute chance',
            'attribute seed',
            'attribute stride',
            'rate step=cycle(&x)',
            'generator fifths()',
            'line &parts step=&bar &a &b',
            'attribute laps',
            'line off',
            'line … +',
        ],
    },
    {
        name: 'Sound and tuning',
        concept: 'stereo: pan=; waveforms from braids: audio rates, sin(), ramps, tables, an instrument; moving parameters: a filter that opens, a fade in decibels; tuning: grids; free(): sliders and named choices; meter()',
        forms: [
            'parameter pan',
            'parameter glide',
            'sort wave: a braid turning at an audio rate',
            'generator sin(n)',
            'map map=lin',
            'sort plain: map=lin',
            'map map=&table',
            'rate nhz',
            'rate nk',
            'sort signal: a mix',
            'map map=db',
            'map map=edo',
            'map map=ed(r)',
            'map map=ratios',
            'step n/d',
            'attribute cycle',
            'free free(v, lo..hi)',
            'free free(v, lo..hi, "names")',
            'mix free(v, lo..hi)',
        ],
    },
    {
        name: 'Physics',
        concept: 'FM; a motor; a belt; a resonator; resonators that answer: coupled, excited; a scope',
        forms: [
            'parameter fm',
            'parameter ratio',
            'parameter index',
            'parameter motor',
            'parameter mass',
            'parameter friction',
            'parameter wind',
            'parameter belt',
            'parameter damping',
            'parameter slip',
            'parameter body',
            'parameter ring',
            'parameter hard',
            'parameter board',
            'parameter coupling',
            'parameter couple',
            'parameter excite',
            'parameter scope',
            'parameter fold',
            'parameter bins',
            'parameter channels',
        ],
    },
    {
        name: 'Tape, text and time',
        concept: 'a tape; a sound tape: worn, wandering heads; text: spell(); clock time and a law',
        forms: [
            'parameter write',
            'parameter length',
            'parameter erase',
            'parameter play',
            'parameter at',
            'parameter wow',
            'parameter varispeed',
            'sort signal: a read head of a sound tape',
            'parameter tone',
            'parameter drive',
            'parameter hiss',
            'parameter print',
            'parameter printgap',
            'parameter dropout',
            'parameter wander',
            'parameter wanderhz',
            'generator spell("text", &table, "names")',
            'free free("text")',
            'rate nmin',
            'rate nh',
            'rate nd',
            'rate nwk',
            'parameter anchor',
            'parameter law',
        ],
    },
    {
        name: 'Gates, performing and MIDI',
        concept: 'a gate: a product with a name; a braid left to the performer, recorded from the keys; a MIDI card, its entries channels',
        forms: [
            'gate play=&x',
            'gate level=&a*&b*n',
            'parameter level',
            'gate [&a, &b]',
            'free free(0 2 4 ~ …)',
            'map map=midi',
            'map map=midi(c)',
        ],
    },
];
const TEMPO_MARKINGS = /free\(\s*(largo|larghetto|adagio|andante|moderato|allegro|vivace|presto)\s*\)/;
const UNIT_AFTER = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(bpm|hz|min|wk|h|d|k)\b/;
export function formsUsed(source) {
    const used = new Set();
    const use = (k) => used.add(k);
    const parsed = parse(source);
    const decls = new Map(parsed.cells.map((d) => [d.name, d]));
    const lines = source.split('\n');
    const textOf = (sp) => (lines[sp.line - 1] ?? '').slice(sp.col - 1, sp.col - 1 + sp.len);
    let code = '';
    for (const raw of lines) {
        const line = stripComment(raw);
        if (line !== raw)
            use('line # …');
        if (/[+*,[]\s*$/.test(line))
            use('line … +');
        code += line.replace(/"[^"]*"/g, '""') + '\n';
    }
    if (/(^|\s)_(?=\s|]|$)/m.test(code))
        use('step _');
    if (/(^|\s)=(?=[\s!@]|$)/m.test(code))
        use('step =');
    for (const [word, form] of [
        ['scan', 'scan(i …)'],
        ['euclid', 'euclid(k, n)'],
        ['sin', 'sin(n)'],
        ['saw', 'sin(n)'],
        ['tri', 'sin(n)'],
        ['square', 'sin(n)'],
        ['meter', 'meter("sig")'],
        ['spell', 'spell("text", &table, "names")'],
        ['scale', 'scale(name)'],
        ['fifths', 'fifths()'],
    ])
        if (new RegExp(`\\b${word}\\(`).test(code))
            use(`generator ${form}`);
    if (TEMPO_MARKINGS.test(code))
        use('free free(marking)');
    const compiled = compileSource(source);
    const grooves = voiceGrooves(decls);
    const ctx = context(parsed, DEFAULT_ENV);
    const seen = { decls, rateOf: ctx.rateOf };
    const ref = (r) => {
        use('reference &name');
        if (r.pick?.kind === 'at')
            use('reference &name[i]');
        if (r.pick?.kind === 'slice')
            use('reference &name[a:b]');
        if (r.shift)
            use('reference &name[<<n]');
        if (r.transpose)
            use('reference &name^$n');
        if (r.values?.add)
            use('reference &name^n');
        if (r.values && r.values.mul < 0)
            use('reference inverse(&name)');
    };
    const isMix = (name) => {
        const b = decls.get(name)?.braid;
        return b?.kind === 'list' && b.tokens.length === 1 && b.tokens[0].atom.kind === 'mix';
    };
    const sortOf = (name) => {
        const d = decls.get(name);
        const rule = d ? SORT_RULES.find((r) => r.holds(d, seen)) : undefined;
        if (rule)
            use(formKey({ section: 'sort', form: rule.sort, means: rule.is }));
    };
    const expr = (e) => {
        if (e.k === 'ref') {
            ref(e.ref);
            sortOf(e.ref.name);
        }
        else if (e.k === 'num')
            use('mix n');
        else if (e.k === 'prod') {
            use('mix p * s');
            for (const f of e.factors) {
                if (f.k === 'sum' || f.k === 'prod')
                    use('mix ( … )');
                expr(f);
            }
        }
        else {
            use('mix a + b');
            for (const it of e.items) {
                if (it.e.k === 'sum')
                    use('mix ( … )');
                expr(it.e);
            }
        }
    };
    const token = (t, groove, card) => {
        if (t.repeat > 1)
            use('modifier x!n');
        if (t.subdivide > 1)
            use('modifier x*n');
        if (t.elongate !== 1)
            use('modifier x@n');
        if (t.chance !== undefined)
            use('modifier x?');
        if (t.level !== undefined)
            use('modifier &x:0:gain');
        const a = t.atom;
        if (a.kind === 'note') {
            use('step n');
            if (a.alter)
                use('step n#');
            if (/^-?[0-9.]+\/[0-9]/.test(textOf(t.span)))
                use('step n/d');
        }
        else if (a.kind === 'rest')
            use('step ~');
        else if (a.kind === 'chord') {
            use('step [a, b, c]');
            if (a.alters.some(Boolean))
                use('step n#');
        }
        else if (a.kind === 'choice') {
            use('step [a|b|c]');
            if (a.alters.some(Boolean))
                use('step n#');
        }
        else if (a.kind === 'seq') {
            if (a.mode === 'alt')
                use('step <a b c>');
            else if (a.mode === 'choose')
                use('step [a|b|c]');
            else if (!a.bare)
                use('step [a b c]');
            if (a.slow !== undefined)
                use('modifier x/n');
            if (a.euclid)
                use('modifier x(k,n,r)');
            for (const l of a.layers)
                for (const x of l)
                    token(x, groove, card);
        }
        else if (a.kind === 'ref' && card) {
            ref(a);
            if (!isMix(a.name))
                sortOf(a.name);
        }
        else if (a.kind === 'ref') {
            if (groove && Object.keys(decls.get(a.name)?.params ?? {}).length)
                use('step &voice (stepped)');
            else
                use('step &x');
            ref(a);
        }
        else if (groove) {
            use('step &voice (stepped)');
            for (const e of a.exprs)
                if (e.k === 'ref')
                    ref(e.ref);
        }
        else {
            use('mix [a, b, …]');
            for (const e of a.exprs)
                expr(e);
        }
    };
    for (const d of parsed.cells) {
        const c = compiled.cells.get(d.name);
        use('line &name …');
        if (c?.note)
            use('line &name label="…"');
        if (d.off)
            use('line off');
        if (d.oneshot)
            use('line oneshot');
        if ([...(compiled.taps?.values() ?? [])].includes(d.name))
            use('line &parts step=&bar &a &b');
        if (d.lambda)
            use('reference &( … )');
        if (d.over) {
            use('attribute over');
            ref(d.over);
        }
        if (d.step)
            use(d.step.whole ? 'attribute loop' : 'attribute step');
        if (d.base) {
            use('attribute base');
            ref(d.base);
        }
        for (const [k, v] of [
            ['shift', d.shift],
            ['stride', d.stride],
            ['map', d.map],
            ['show', d.show],
            ['label', d.label],
            ['env', d.env],
            ['pitch', d.pitch ?? d.paramCells?.pitch],
            ['cycle', d.cycle],
            ['size', d.size],
            ['laps', d.laps],
            ['chance', d.chance],
            ['seed', d.seed],
            ['title', d.title],
            ['tags', d.tags],
            ['about', d.about],
            ['tier', d.tier],
        ])
            if (v !== null && v !== undefined)
                use(`attribute ${k}`);
        if (d.env)
            ref(d.env);
        if (d.pitch)
            ref(d.pitch);
        for (const r of d.about ?? [])
            ref(r);
        const gate = typeof d.params.play === 'string' && d.braid.kind === 'list' && d.braid.tokens.length > 0;
        if (gate) {
            use('gate play=&x');
            if (d.paramCells?.level)
                use('gate level=&a*&b*n');
            else if (typeof d.params.level === 'number')
                use('parameter level');
            if (d.braid.kind === 'list' && d.braid.tokens.some((t) => t.atom.kind === 'mix'))
                use('gate [&a, &b]');
        }
        for (const k of [...Object.keys(d.params), ...Object.keys(d.paramCells ?? {}), ...Object.keys(d.paramClocks ?? {})])
            if (k !== 'pitch' && !(gate && (k === 'play' || k === 'level')))
                use(`parameter ${k}`);
        for (const pc of Object.values(d.paramCells ?? {}))
            for (const r of pc.factors)
                ref(r);
        for (const st of Object.values(d.paramClocks ?? {}))
            if (st.kind === 'driven')
                ref(st.driver);
        const st = d.step;
        if (st?.kind === 'rate') {
            use(st.free ? 'rate step=free(r, lo..hi)' : 'rate step=r');
            const unit = st.free ? st.free.unit : UNIT_AFTER.exec(textOf(st.span))?.[1];
            if (unit)
                use(`rate n${unit}`);
        }
        else if (st?.kind === 'env')
            use('rate loop=NAME');
        else if (st?.kind === 'driven') {
            use(st.cycle ? 'rate step=cycle(&x)' : 'rate step=&x');
            if (st.chain.length)
                use('rate step=&x*n');
            ref(st.driver);
        }
        else if (st?.kind === 'tap') {
            use(st.tap.kind === 'pulse' || st.tap.kind === 'beat' ? 'rate step=pulse' : 'rate step=16n');
            if (st.meter)
                (use('rate step=&m:16n'), ref(st.meter));
        }
        const m = d.map;
        if (m?.kind === 'table') {
            use('map map=&table');
            ref(m.table);
        }
        else if (m?.kind === 'edo')
            use(/^ed\(/.test(textOf(m.span)) ? 'map map=ed(r)' : 'map map=edo');
        else if (m?.kind === 'midi')
            use(m.channel === null ? 'map map=midi' : 'map map=midi(c)');
        else if (m)
            use(`map map=${m.kind === 'adsr' ? 'adsr a d s r' : m.kind}`);
        for (const f of d.frees ?? []) {
            if (f.key === 'braid')
                use('free free(0 2 4 ~ …)');
            else if (f.labels)
                use('free free(v, lo..hi, "names")');
            else if (f.text !== undefined)
                use('free free("text")');
            else if (f.key === 'gain')
                use('mix free(v, lo..hi)');
            else if (!TEMPO_MARKINGS.test(textOf(f.span)))
                use('free free(v, lo..hi)');
            if (f.key === 'step' || f.key === 'loop') {
                use('rate step=free(r, lo..hi)');
                if (f.unit)
                    use(`rate n${f.unit}`);
            }
        }
        const groove = !!grooves?.cells.has(d.name);
        if (d.braid.kind === 'list')
            for (const t of d.braid.tokens)
                token(t, groove, d.map?.kind === 'sample' || d.map?.kind === 'midi');
    }
    return used;
}
