/** Graph ids of cells and the links between them: what the graph, the routing model and `muted` sets share. */
export const cellId = (name: string) => `cell:${name}`;
export const edgeId = (source: string, target: string) => `${source}->${target}`;
/** step= links get their own ids: a cell can be both over= and step= another (`&scale over=&key step={&key}`). */
export const stepEdgeId = (source: string, target: string) => `${source}~>${target}`;
/** A product's junction (docs/notes/nets.md, decision 2): the unnamed node of a mix's entry, by the mix and its place there. */
export const junctionId = (mix: string, entry: number) => `junction:${mix}:${entry}`;
export const isJunction = (id: string) => id.startsWith('junction:');
