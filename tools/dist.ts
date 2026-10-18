// Writes dist/: src/ as JavaScript Node can run from a frontend's node_modules (yggi/cells#11). Node won't strip types in a
// dependency, and the source's relative imports have no extensions (`./engine/compile`), which Node's resolver doesn't
// complete. TypeScript's own transpiler removes the types (parameter properties included); a transformer then spells each
// relative import with the file it names (`./engine/compile.js`, `./theory/index.js`). `exports` sends a bundler (the
// `module` condition) to the source and Node (the `default`) to dist/. `npm run dist` writes it; a test fails when it is
// stale and installs the packed package to run it.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const DIST = 'dist';

const isSource = (f: string) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts');
const isFile = (p: string) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : isSource(f) ? [join(dir, f)] : []));

/** The specifier Node resolves to the same file as a bundler does the one written: `./a` → `./a.js`, `./b` (a folder) → `./b/index.js`. */
function spelled(from: string, specifier: string): string {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return specifier;
  const target = join(dirname(from), specifier);
  if (isFile(`${target}.ts`)) return `${specifier}.js`;
  if (isFile(join(target, 'index.ts'))) return `${specifier}/index.js`;
  if (specifier.endsWith('.ts') && isFile(target)) return specifier.replace(/\.ts$/, '.js');
  throw new Error(`${from}: nothing at ${specifier}`);
}

const rewriteImports =
  (file: string): ts.TransformerFactory<ts.SourceFile> =>
  (context) =>
  (root) => {
    const f = context.factory;
    const visit = (node: ts.Node): ts.Node => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const specifier = f.createStringLiteral(spelled(file, node.moduleSpecifier.text));
        return ts.isImportDeclaration(node)
          ? f.updateImportDeclaration(node, node.modifiers, node.importClause, specifier, node.attributes)
          : f.updateExportDeclaration(node, node.modifiers, node.isTypeOnly, node.exportClause, specifier, node.attributes);
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
        return f.updateCallExpression(node, node.expression, node.typeArguments, [f.createStringLiteral(spelled(file, node.arguments[0].text)), ...node.arguments.slice(1)]);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root, visit) as ts.SourceFile;
  };

/** Every file of dist/, by path under it and its text, from `src`. */
export function distFiles(src = 'src'): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of walk(src)) {
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true, isolatedModules: true, removeComments: true },
      transformers: { after: [rewriteImports(file)] },
    });
    out.set(relative(src, file).replace(/\.ts$/, '.js'), outputText);
  }
  return out;
}

export function writeDist(dir = DIST, src = 'src'): void {
  rmSync(dir, { recursive: true, force: true });
  for (const [path, text] of distFiles(src)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeDist();
