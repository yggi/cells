export function parseFields(s) {
    if (s.peek() !== ':')
        return undefined;
    s.rejectTap(s.text.slice(0, s.i).search(/&[^\s:,[\]()*+&]*$/));
    s.i++;
    const at = s.i;
    const n = s.match(/[0-9]+/y);
    if (n === null)
        return s.fail('A hit is &bd:n:gain, its number first: &bd:0:.3', at, 1);
    if (parseInt(n, 10) !== 0)
        s.fail(`&bd:${n} would be a pitched hit, ${n} up its table: not yet (write &bd:0:gain)`, at, n.length);
    if (s.peek() !== ':')
        return undefined;
    s.i++;
    const g = s.i;
    const gain = s.match(/[0-9]*\.[0-9]+|[0-9]+/y);
    if (gain === null)
        return s.fail('A hit’s gain: a number, &bd:0:.3 (1 as it is)', g, 1);
    return parseFloat(gain);
}
export function parseGain(s) {
    s.i++;
    const g = s.i;
    const gain = s.match(/[0-9]*\.[0-9]+|[0-9]+/y);
    if (gain === null)
        return s.fail('A number’s gain: 2:.4 (1 as it is)', g, 1);
    return parseFloat(gain);
}
