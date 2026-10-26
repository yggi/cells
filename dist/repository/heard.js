const DRUMS = /^\s*&((?:groove|percussion|agogo)\d*)(?=\s|$)/gm;
export function heard(text) {
    const defines = (name) => new RegExp(`^\\s*&${name}(?=\\s|$)`, 'm').test(text);
    const drums = [...text.matchAll(DRUMS)].map((m) => `&${m[1]}`);
    return [...(drums.length ? [`&drumCard map=midi(10) [${drums.join(', ')}]`] : []), ...(defines('bassline') ? ['&bassCard map=midi(2) [&bassline * &bassV]'] : [])].join('\n');
}
