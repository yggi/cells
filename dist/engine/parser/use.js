const NAME = '&[A-Za-z_][A-Za-z0-9_]*';
const ID = '([A-Za-z_][A-Za-z0-9_]*|"[^"]*\\S[^"]*")';
const QUOTED = /^\s*use\s+"([^"]*\S[^"]*)"\s*$/;
const ALL = new RegExp(`^\\s*use\\s+\\*\\s+from\\s+${ID}\\s*$`);
const NAMED = new RegExp(`^\\s*use\\s+(${NAME}(?:\\s*,\\s*${NAME})*)\\s+from\\s+${ID}\\s*$`);
const SHORT = new RegExp(`^\\s*use\\s+&([A-Za-z_][A-Za-z0-9_]*)\\s*$`);
const idOf = (written) => (written.startsWith('"') ? written.slice(1, -1) : written);
export const isWordId = (id) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(id);
export function readUse(code) {
    if (!/^\s*use(?![A-Za-z0-9_])/.test(code))
        return undefined;
    const quoted = QUOTED.exec(code);
    if (quoted)
        return { id: quoted[1], names: null, form: 'quoted' };
    const all = ALL.exec(code);
    if (all)
        return { id: idOf(all[1]), names: null, form: 'all' };
    const named = NAMED.exec(code);
    if (named)
        return { id: idOf(named[2]), names: [...new Set(named[1].split(',').map((n) => n.trim()))], form: 'named' };
    const short = SHORT.exec(code);
    if (short)
        return { id: short[1], names: [`&${short[1]}`], form: 'short' };
    return null;
}
export function writeUse({ id, names }) {
    const from = isWordId(id) ? id : JSON.stringify(id);
    if (!names)
        return `use * from ${from}`;
    if (names.length === 1 && names[0] === `&${id}`)
        return `use &${id}`;
    return `use ${names.join(', ')} from ${from}`;
}
export const USE_FORM = 'A use line says what it takes from which fragment: use &bd, &sd from gm_kit, use * from gm_kit, or use &aeolian (from aeolian); an id of more than a word in double quotes: use * from "harmonic minor"';
export const useQuoted = (id) => `use "${id}" is the old way: write ${writeUse({ id, names: null })} (or name what it takes: use &a, &b from …)`;
