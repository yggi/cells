import { declLine, declWords, splitComment } from "../edit.js";
import { groupingOf, meterLevels } from "../parser/generators.js";
import { soundsIdentical } from "../sameness.js";
const powerOfTwo = (x) => Number.isInteger(x) && x >= 1 && Number.isInteger(Math.log2(x));
function candidates(braid, n) {
    const meter = /^meter\("([^"]+)"(?:,\s*([1-8]))?\)$/.exec(braid);
    if (meter) {
        const [, sig, written] = meter;
        const sub = Number(written ?? 1);
        const g = groupingOf(sig);
        const out = [];
        if (g && g.pulses % n === 0) {
            const per = g.pulses / n;
            const d = g.unit / per;
            if (powerOfTwo(d))
                out.push({ braid: `meter("${n}/${d}"${sub * per > 1 ? `, ${sub * per}` : ''})` });
        }
        const levels = meterLevels(sig, sub);
        if (levels && levels.length % n === 0 && g && powerOfTwo(g.unit * sub)) {
            const step = levels.length / n;
            const marked = [...levels].map((ch, i) => (i === 0 ? '*' : i % step === 0 ? '+' : ch === ',' ? ',' : '.')).join('');
            out.push({ braid: `meter("${marked}", ${g.unit * sub}n)` });
        }
        return out;
    }
    const scan = /^scan\((.*)\)$/.exec(braid);
    if (scan) {
        const entries = scan[1]
            .trim()
            .split(/\s+/)
            .reduce((a, w) => a + (/!(\d+)$/.exec(w) ? Number(/!(\d+)$/.exec(w)[1]) : 1), 0);
        const per = (4 * entries) / n;
        return powerOfTwo(per) ? [{ pulse: `${per}n` }] : [];
    }
    return [];
}
export function beats(source, result, options = {}) {
    const out = [];
    for (const c of result.cells.values()) {
        const n = c.params.beat;
        const words = typeof n === 'number' && declLine(source, c.name) >= 0 ? declWords(source, c.name) : null;
        if (!words || typeof n !== 'number' || !(n >= 1) || !c.meter)
            continue;
        for (const k of candidates(words.braid.join(' '), Math.round(n))) {
            const braid = words.braid.join(' ');
            const apply = (s) => {
                const i = declLine(s, c.name);
                if (i < 0)
                    return s;
                const lines = s.split('\n');
                const [code, comment] = splitComment(lines[i]);
                let next = k.braid ? code.replace(braid, k.braid) : code;
                next = next.replace(/(\s)beat=\S+/, k.pulse ? `$1pulse=${k.pulse}` : '');
                lines[i] = next + comment;
                return lines.join('\n');
            };
            const next = apply(source);
            if (next === source || !soundsIdentical(source, next, undefined, options))
                continue;
            const at = declLine(source, c.name);
            out.push({
                id: `beats:${c.name}`,
                tool: 'migrate',
                rule: 'beats',
                title: `beat= is retired: &${c.name} counts its beats as ${k.braid ?? `pulse=${k.pulse}`} does (#502)`,
                before: source.split('\n')[at].trim(),
                after: next.split('\n')[at].trim(),
                apply,
            });
            break;
        }
    }
    return out;
}
