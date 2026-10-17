export const SECTIONS = {
    line: 'Lines',
    step: 'Steps',
    modifier: 'Modifiers',
    reference: 'References',
    generator: 'Generators',
    free: 'free(): left to the performer',
    rate: 'step= and loop=',
    map: 'map=',
    attribute: 'Attributes',
    parameter: 'Parameters',
    sort: 'Sorts: what a cell is in a mix',
    mix: 'Mixes',
    gate: 'Gates: a product with a name',
};
export const syntax = (section, form, means, examples, doc) => ({ section, form, means, examples, doc });
