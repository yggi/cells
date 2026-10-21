export function readUse(code) {
    if (!/^\s*use(?![A-Za-z0-9_])/.test(code))
        return undefined;
    return /^\s*use\s+"([^"]*\S[^"]*)"\s*$/.exec(code)?.[1] ?? null;
}
export const USE_FORM = 'A use line names a fragment by its id, in double quotes, on a line of its own: use "core kit"';
