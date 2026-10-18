import { declLine, renameCell } from "../edit.js";
import { soundsIdentical } from "../sameness.js";
const FROM = 'parts';
const TO = 'sections';
export function sections(source, result) {
    if (![...(result.sections?.values() ?? [])].includes(FROM) || declLine(source, TO) >= 0)
        return [];
    const apply = (s) => renameCell(s, FROM, TO);
    const next = apply(source);
    if (next === source || !soundsIdentical(source, next))
        return [];
    const at = declLine(source, FROM);
    return [
        {
            id: `section:${FROM}`,
            tool: 'migrate',
            rule: 'section',
            title: `&${FROM} is a table of sections: call it &${TO}, as "part" is a voice of the band (decision 044)`,
            before: source.split('\n')[at].trim(),
            after: next.split('\n')[at].trim(),
            apply,
        },
    ];
}
