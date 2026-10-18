/**
 * YAML, the subset a fragment file's frontmatter is written in (decision 047, #143): parsed here, so cells takes no
 * dependency and stays pure. What a file may say, and what any YAML 1.2 parser reads the same:
 *
 * - **Block maps** (`key: value`, nested by indenting) and **block lists** (`- item`, a map's first entry on the dash
 *   line, or a list indented under its key or level with it). Keys are plain words: not quoted, not a number.
 * - **Scalars:** plain text, `"double"` (JSON's escapes) or `'single'` (`''` a quote) quoted strings, decimal numbers,
 *   `true` `false`, `null` `~`. A timestamp (`2026-10-18T21:00:00Z`) stays the string it is written as.
 * - **Flow** only as a list of scalars, `[a, b]`, and the empty map `{}`.
 *
 * It refuses, naming the line: anchors and aliases (`&a`, `*a`), tags (`!x`), directives and a second document (`%`,
 * `---`, `...`), comments (`#`), block scalars (`|`, `>`), a plain value over two lines, flow beyond `[a, b]` (`{a: 1}`,
 * `[[a]]`), complex keys (`?`), a key given twice, numbers it doesn't read as YAML does (`0x1F`, `0o7`, `.inf`, `.nan`),
 * and tabs in an indent. `writeYaml` writes one canonical form of what `readYaml` reads, so writing what it read gives the
 * same text whenever the text was written that way.
 */
/** A value the subset holds: a scalar, a list, or a map whose keys keep their order. */
export type YamlValue = string | number | boolean | null | readonly YamlValue[] | {
    readonly [key: string]: YamlValue;
};
/** A parsed value and the line it starts on, so a reader can name the line of what it refuses. */
export type YamlNode = {
    readonly kind: 'scalar';
    readonly line: number;
    readonly value: string | number | boolean | null;
} | {
    readonly kind: 'list';
    readonly line: number;
    readonly items: readonly YamlNode[];
} | {
    readonly kind: 'map';
    readonly line: number;
    readonly entries: readonly {
        readonly key: string;
        readonly line: number;
        readonly value: YamlNode;
    }[];
};
/** What is wrong, and on which line of the file. */
export interface YamlProblem {
    readonly line: number;
    readonly message: string;
}
/**
 * The value YAML text holds, as nodes with their lines, or what is wrong with it; the first line of `text` is line
 * `firstLine` of its file. Empty text is the empty map.
 */
export declare function readYaml(text: string, firstLine?: number): {
    node: YamlNode;
} | {
    problems: YamlProblem[];
};
/** A node's value: lists as arrays, maps as objects with their keys in order. */
export declare function yamlValue(node: YamlNode): YamlValue;
/** A map as YAML text in the subset's one canonical form, a line each, ending in a newline (none for the empty map). */
export declare function writeYaml(map: {
    readonly [key: string]: YamlValue;
}): string;
