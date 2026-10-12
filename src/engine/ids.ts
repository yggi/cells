/** Graph ids of cells and the links between them: what the graph, the routing model and `muted` sets share. */
export const cellId = (name: string) => `cell:${name}`;
export const edgeId = (source: string, target: string) => `${source}->${target}`;
/** step= links get their own ids: a cell can be both over= and step= another (`&scale over=&key step={&key}`). */
export const stepEdgeId = (source: string, target: string) => `${source}~>${target}`;
/** A parameter's own wire (`delaytime=&bar*4/3`, `map=&curve`): its own id, beside a step= from the same clock, or an env= from the same table. */
export const clockTapId = (source: string, target: string, key: string) => `${source}~${key}>${target}`;
/** A product's junction (docs/notes/nets.md, decision 2): the unnamed node of a mix's entry, by the mix and its place there. */
export const junctionId = (mix: string, entry: number) => `junction:${mix}:${entry}`;
export const isJunction = (id: string) => id.startsWith('junction:');
