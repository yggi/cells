/** Graph ids of cells and the links between them: what the graph, the routing model and `muted` sets share. */
export declare const cellId: (name: string) => string;
export declare const edgeId: (source: string, target: string) => string;
/** step= links get their own ids: a cell can be both over= and step= another (`&scale over=&key step={&key}`). */
export declare const stepEdgeId: (source: string, target: string) => string;
/** A parameter's own wire (`delaytime=&bar*4/3`, `map=&curve`): its own id, beside a step= from the same clock, or an env= from the same table. */
export declare const clockTapId: (source: string, target: string, key: string) => string;
/** A product's junction (docs/notes/nets.md, decision 2): the unnamed node of a mix's entry, by the mix and its place there. */
export declare const junctionId: (mix: string, entry: number) => string;
export declare const isJunction: (id: string) => boolean;
