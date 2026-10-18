export const pickLabel = (p) => {
    if (!p)
        return '';
    const $ = p.abs ? '$' : '';
    return p.kind === 'at' ? `[${$}${p.i}]` : `[${$}${p.from ?? ''}:${p.to ?? ''}${p.step ? `:${p.step}` : ''}]`;
};
export const shiftLabel = (shift) => (shift === 0 ? '' : `[${shift < 0 ? '<<' : '>>'}${Math.abs(shift) === 1 ? '' : Math.abs(shift)}]`);
export const refLabel = (r) => (pickLabel(r.pick) || shiftLabel(r.shift)) + (r.degree ? `^${r.degree}` : '') + (r.transpose ? `^$${r.transpose}` : '');
export const isNote = (d) => !!(d.label || d.title) &&
    d.braid.kind === 'blank' &&
    d.over === null &&
    d.step === null &&
    d.map === null &&
    d.cycle === null &&
    d.shift === null &&
    d.stride === null &&
    !d.off &&
    !d.frees?.length &&
    !d.env &&
    !d.pitch &&
    Object.keys(d.params).length === 0;
