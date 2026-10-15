// Lets Node run cells' TypeScript source in this repository: `node --experimental-transform-types --import
// ./tools/node-ts.mjs …`. The source imports without extensions (`./engine/compile`), as a bundler resolves them, and
// Node's own resolver wants the file's name; this hook tries `<name>.ts`, then `<name>/index.ts`, for a relative import
// from a `.ts` file. Transform, not strip: the source has parameter properties (`readonly col: number` in a
// constructor), which strip-only mode refuses. A tool or a probe that runs the language then needs no vitest
// (tools/pianoroll.ts; the review skill's probe). Inside a frontend's node_modules Node still refuses to strip types
// (yggi/cells#11): this is for the repository's own tools only.
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (relative && context.parentURL?.endsWith('.ts') && !/\.[cm]?[jt]s$/.test(specifier)) {
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context);
        } catch {
          // not this one: try the next
        }
      }
    }
    return nextResolve(specifier, context);
  },
});
