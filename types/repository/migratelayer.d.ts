import { type LearnedLayer } from './fragments';
/**
 * A layer's bass lines and progressions with the signature they are stated with since cells v0.21.0 (#562), for one filed
 * before: identity keeps the names a signature declares, so a line heard again is known as the one filed only once both
 * are templates. A layer with none to sign is returned as it is.
 */
export declare function signedLayer(layer: LearnedLayer): LearnedLayer;
/**
 * A layer's points written on the style axes before cells v0.23.0, `sync harm artic energy`, on the axes now, as Migrate
 * moved the library's (`newPoint`, its rule `axes`, decision 076): `bite` the articulation, energy dropped, and a tonal
 * facet's `mood` read where the old point sits. A layer kept since is the layer itself.
 */
export declare function axedLayer(layer: LearnedLayer): LearnedLayer;
/**
 * A layer's grooves with each line's drum role written as a value (`&kick role=kick …`), as a groove is stated since
 * cells v0.24.0 (decision 075), for one filed before: identity reads the text, so a groove heard again is known as the one
 * filed only once both write it. A layer with none to write is returned as it is.
 */
export declare function roledLayer(layer: LearnedLayer): LearnedLayer;
/**
 * The seed motifs cells v0.25.0 moved (decision 082, #642), each old id and the id it has now: Kinderlieder's six tunes,
 * the parts of its document (`MOVED`), and `waltz` and `korobeiniki`, renamed with their heads (`waltzBar`,
 * `korobeinikiBar`) since their old ids are examples' keys (one namespace).
 */
export declare const MOVED_IDS: ReadonlyMap<string, string>;
/**
 * A text filed over a moved motif as it reads now: a take of one of Kinderlieder's tunes as its document's part (Migrate's
 * rule `moved`: `&twinkle from twinkle &key` → `&twinkle from kinderlied &key`), and one of a motif renamed by its new id,
 * under the name the text reads it by (`&waltz from waltz &key` → `&waltz=waltzBar from waltzBar &key`), so the lines that
 * read it are as written.
 */
export declare function movedText(text: string): string;
/**
 * A layer kept before cells v0.25.0, with the motifs it moved written as they are now (`MOVED_IDS`, `movedText`): the ids
 * in its points, its pairs and a filed line's `varies` chain, and the texts it filed over them. A layer that names none
 * is the layer itself.
 */
export declare function movedLayer(layer: LearnedLayer): LearnedLayer;
/**
 * A learned layer as the language writes it now, from any layer version a frontend has kept: `renamedLayer`, `signedLayer`,
 * `axedLayer`, `roledLayer`, `movedLayer`, in the order the forms were retired. Each step leaves a layer that needs
 * nothing as it is, so a layer kept at this version is returned as it is (`===`).
 */
export declare function migrateLayer(layer: LearnedLayer): LearnedLayer;
