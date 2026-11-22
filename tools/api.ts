/**
 * The API a frontend runs and asks cells with (#724, rung 1 of #713): which entry point each module belongs to, what
 * the root index exports, and what the frontends reach by a module path instead of an entry point (the ledger).
 *
 *   npm run api                         rewrite the generated part of docs/api.md
 *   npm run api -- reach <name> <dir>   measure a frontend checkout and write its ledger entry
 *
 * The plan is the ENTRY_POINTS rules below; nothing here moves code. A module no rule names is `internal`, and the
 * page lists the ones a frontend reaches anyway: that list is the work left. The ledger (`tools/api.ledger.json`) is
 * the symbols each frontend imports at its pin; a test fails when one is no longer exported, so a move of a symbol a
 * frontend uses is noticed in a pull request here, not at the frontend's next typecheck.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The seven entry points, in the order the page lists them, with the layer each belongs to. */
export const ENTRIES = [
  { name: '@yggi/cells', layer: 'language', role: 'compile, plan, window; the shared types' },
  { name: '@yggi/cells/edit', layer: 'language', role: 'edit, patch, capture, vary, shorten, normalise, migrate a text; a piece file' },
  { name: '@yggi/cells/inspect', layer: 'language', role: 'read a compiled piece: its cells, pitches, clocks, values, written graph' },
  { name: '@yggi/cells/midi', layer: 'language', role: 'text to MIDI notes and hits, MIDI files, keys, the performer' },
  { name: '@yggi/cells/time', layer: 'language', role: 'analysis of what plays: scalograms, structure, motifs' },
  { name: '@yggi/cells/repository', layer: 'repository', role: 'query, fit, learn and migrate a layer; a fragment read as cells means it' },
  { name: '@yggi/cells/library', layer: 'library', role: 'the seed, styles, kit, roles, modes, the band; every vocabulary as values' },
] as const;
export type EntryName = (typeof ENTRIES)[number]['name'];
/** `view` leaves for Cell studio (decision 086); `internal` is named by no entry point. */
export type Entry = EntryName | 'view' | 'internal';

/**
 * Module path (under `src/`, no extension) to entry point: the first rule whose `match` fits wins, an exact path or a
 * `prefix/`. The root index keeps re-exporting everything it does today while the entry points are added, so a pin
 * moves when the frontend chooses.
 */
export const ENTRY_POINTS: readonly { readonly match: string; readonly entry: Entry }[] = [
  // The language's root: compile and play, the types they share.
  ...['compile', 'host', 'keepbeat', 'schedule', 'realize', 'program', 'ast', 'parser/index', 'span', 'styleat', 'render', 'audioexport', 'wavfile'].map(
    (m): { match: string; entry: Entry } => ({ match: `engine/${m}`, entry: '@yggi/cells' }),
  ),
  // `physics` is the engine's playing state; `declare` holds the kit's voices' id; `fills` and `parser/use` read a fill and a `from` line.
  { match: 'engine/physics', entry: '@yggi/cells' },
  { match: 'engine/fills', entry: '@yggi/cells/inspect' },
  { match: 'engine/parser/use', entry: '@yggi/cells/repository' },
  { match: 'engine/compiler/declare', entry: '@yggi/cells/library' },
  // The view moves to Cell studio (decision 086, #731).
  ...['routing', 'live', 'plugins', 'builtinPlugins', 'parser/showMeaning'].map((m): { match: string; entry: Entry } => ({ match: `engine/${m}`, entry: 'view' })),
  // Edit.
  ...['edit', 'patch', 'capture', 'held', 'shorten/', 'normalise/', 'migrate/', 'piecefile', 'literate', 'rewrite', 'outline', 'vary/', 'core/'].map(
    (m): { match: string; entry: Entry } => ({ match: `engine/${m}`, entry: '@yggi/cells/edit' }),
  ),
  // Inspect.
  ...[
    'readers',
    'reads',
    'helix',
    'flatten',
    'clocking',
    'values',
    'valuesum',
    'ids',
    'graph',
    'flows',
    'outs',
    'stats',
    'transform',
    'meter',
    'duration',
    'subseq',
    'series',
    'fm',
    'wave',
    'plays',
    'attributes',
  ].map((m): { match: string; entry: Entry } => ({ match: `engine/${m}`, entry: '@yggi/cells/inspect' })),
  // MIDI, and the folder that writes cells from notes.
  ...['midi', 'midiclock', 'midifile', 'midiimport', 'midiexport', 'miditext', 'keys', 'perform/', 'fold/'].map((m): { match: string; entry: Entry } => ({
    match: `engine/${m}`,
    entry: '@yggi/cells/midi',
  })),
  // Time.
  { match: 'engine/time/', entry: '@yggi/cells/time' },
  // Repository: fragments, their fit and learning, and a fragment read as cells means it (reading/*, ruled 2026-11-16).
  ...['fragments', 'learned', 'fit', 'holes', 'files', 'decompose', 'recognise', 'extract', 'audition', 'catalogue', 'corefragment', 'migratelayer'].map(
    (m): { match: string; entry: Entry } => ({
      match: `repository/${m}`,
      entry: '@yggi/cells/repository',
    }),
  ),
  ...['takein', 'references', 'use', 'renamed', 'reading/'].map((m): { match: string; entry: Entry } => ({ match: `engine/${m}`, entry: '@yggi/cells/repository' })),
  // Library: the seed, styles, the kit and roles, modes, the band.
  ...['library', 'seed', 'styles', 'band'].map((m): { match: string; entry: Entry } => ({ match: `repository/${m}`, entry: '@yggi/cells/library' })),
  ...['style', 'examples', 'tags', 'order', 'dough-params', 'parser/generators'].map((m): { match: string; entry: Entry } => ({
    match: `engine/${m}`,
    entry: '@yggi/cells/library',
  })),
  { match: 'theory/', entry: '@yggi/cells/library' },
];

/**
 * A name placed apart from its module's entry point, by `module:name`: a module the root plans for holds facts about a
 * compiled piece that belong to `inspect`, and the view's names leave for Cell studio (decision 086).
 */
export const SYMBOL_ENTRY: Readonly<Record<string, Entry>> = {
  ...Object.fromEntries(
    ['BODIES', 'DEFAULT_FREQ', 'LABEL_FIELDS', 'ROOT', 'adsrOf', 'isMidiCard', 'keepsTime', 'pickIndices'].map((n) => [`engine/program:${n}`, '@yggi/cells/inspect' as Entry]),
  ),
  ...Object.fromEntries(
    ['engine/helix:positionHue', 'engine/helix:positionOctave', 'engine/helix:freqHue', 'theory/modes:pitchHue', 'engine/parser/index:SHOWS'].map((k) => [k, 'view' as Entry]),
  ),
};

/**
 * What a frontend may reach by a module path on purpose, by module or `module:name`, and why: the view until it moves,
 * and what is not the language's. The page lists them apart from the work left.
 */
export const DEEP_ON_PURPOSE: Readonly<Record<string, string>> = {
  'engine/fiveto12': "a piece's own data, a plugin ultimately; the owner, 2026-11-21",
  'engine/order:ExampleKey': 'the same type as `ExampleKey` of `engine/examples`, which `library` exports',
};

/** The entry point a module (a path under `src/`, no extension) is planned for. */
export function entryOfSymbol(module: string, name: string): Entry {
  return SYMBOL_ENTRY[`${module}:${name}`] ?? entryOf(module);
}

export function entryOf(module: string): Entry {
  for (const { match, entry } of ENTRY_POINTS) if (match.endsWith('/') ? module.startsWith(match) : module === match) return entry;
  return 'internal';
}

/** Every module under `src/engine`, `src/theory` and `src/repository`: no test, no generated file. */
export function modules(root = ROOT): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const item of readdirSync(join(root, 'src', dir), { withFileTypes: true })) {
      const path = `${dir}/${item.name}`;
      if (item.isDirectory()) walk(path);
      else if (/\.ts$/.test(item.name) && !/\.(test|slow\.test|generated|d)\.ts$/.test(item.name)) out.push(path.replace(/\.ts$/, ''));
    }
  };
  for (const dir of ['engine', 'theory', 'repository']) walk(dir);
  return out.sort();
}

/** The names `src/<file>` re-exports, by the module each comes from (`engine/compile`), types included, aliases as written. */
export function exportsOfFile(file: string, root = ROOT, original = false): Map<string, string[]> {
  const text = readFileSync(join(root, 'src', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Map<string, string[]>();
  for (const m of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'\.\/([^']+)'/g)) {
    const names = m[1]
      .split(',')
      .map((n) => n.trim().replace(/^type\s+/, ''))
      .filter(Boolean)
      .map((n) => n.split(/\s+as\s+/)[original ? 0 : 1] ?? n.split(/\s+as\s+/)[0]);
    const module = existsSync(join(root, 'src', `${m[2]}.ts`)) ? m[2] : `${m[2]}/index`;
    out.set(module, [...(out.get(module) ?? []), ...names]);
  }
  return out;
}

/** What one frontend imports from the package: a module path (`.` the root) to its symbols, split into app and tests. */
export interface Reach {
  readonly app: Record<string, string[]>;
  readonly tests: Record<string, string[]>;
}
export interface Ledger {
  readonly [frontend: string]: { readonly repo: string; readonly commit: string; readonly pin: string } & Reach;
}

const IMPORT = /(?:import|export)\s+(?:type\s+)?(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+(\w+))?\s*from\s*['"]@yggi\/cells([^'"]*)['"]/g;

/** The symbols one source file takes from `@yggi/cells[/path]`, by module path (`.` the root, `*` a namespace, `default`). */
export function importsOf(source: string): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const m of source.matchAll(IMPORT)) {
    const module = m[4] === '' ? '.' : m[4].replace(/^\//, '');
    const set = (out[module] ??= new Set());
    for (const part of (m[2] ?? '').split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      if (name) set.add(name);
    }
    if (m[3]) set.add('*');
    if (m[1]) set.add('default');
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

/** The reach of a frontend checkout: every `.ts`, `.js`, `.mjs`, `.tsx` and `.svelte` file outside the build folders. */
export function reachOf(dir: string): Reach {
  const app: Record<string, Set<string>> = {};
  const tests: Record<string, Set<string>> = {};
  const walk = (d: string) => {
    for (const item of readdirSync(d, { withFileTypes: true })) {
      if (item.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'build', '.svelte-kit', '.cache'].includes(item.name)) walk(join(d, item.name));
      } else if (/\.(ts|tsx|js|mjs|svelte)$/.test(item.name)) {
        const rel = relative(dir, join(d, item.name));
        const into = /\.test\.|(^|\/)(tools|e2e|tests?)\//.test(rel) ? tests : app;
        for (const [module, names] of Object.entries(importsOf(readFileSync(join(d, item.name), 'utf8')))) {
          const set = (into[module] ??= new Set());
          for (const n of names) set.add(n);
        }
      }
    }
  };
  walk(dir);
  const sorted = (r: Record<string, Set<string>>) =>
    Object.fromEntries(
      Object.keys(r)
        .sort()
        .map((k) => [k, [...r[k]].sort()]),
    );
  return { app: sorted(app), tests: sorted(tests) };
}

/** The names `src/index.ts` exports, by module. */
export const rootExports = (root = ROOT) => exportsOfFile('index.ts', root);

/** The file of an entry point under `src/`: `@yggi/cells` is `index.ts`, `@yggi/cells/edit` is `edit.ts`. */
export const entryFile = (name: EntryName) => (name === '@yggi/cells' ? 'index.ts' : `${name.replace('@yggi/cells/', '')}.ts`);

/** What an entry point exports today, by module: its file, if it is written yet. */
export const entryExports = (name: EntryName, root = ROOT, original = false) =>
  existsSync(join(root, 'src', entryFile(name))) ? exportsOfFile(entryFile(name), root, original) : new Map<string, string[]>();

export const LEDGER = join(ROOT, 'tools/api.ledger.json');
export const readLedger = (): Ledger => JSON.parse(readFileSync(LEDGER, 'utf8')) as Ledger;

/** The names a module exports (types included), by the TypeScript checker; `.` is the root index. */
export function exportsOfModules(paths: readonly string[], root = ROOT): Map<string, Set<string>> {
  const file = (p: string) => join(root, 'src', p === '.' ? 'index.ts' : `${p}.ts`);
  const found = paths.filter((p) => existsSync(file(p)));
  const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
  const program = ts.createProgram(found.map(file), options);
  const checker = program.getTypeChecker();
  const out = new Map<string, Set<string>>();
  for (const p of found) {
    const source = program.getSourceFile(file(p));
    const symbol = source && checker.getSymbolAtLocation(source);
    out.set(p, new Set(symbol ? checker.getExportsOfModule(symbol).map((s) => s.getName()) : []));
  }
  return out;
}

/** What each frontend's app reaches by a module path: an entry point exports it, it is reached on purpose, or it is work left. */
export function standing(ledger: Ledger = readLedger(), root = ROOT) {
  const have = new Map<string, Set<string>>();
  for (const e of ENTRIES)
    for (const [m, names] of e.name === '@yggi/cells' ? exportsOfFile('index.ts', root, true) : entryExports(e.name, root, true))
      have.set(m, new Set([...(have.get(m) ?? []), ...names]));
  const out: Record<string, { covered: number; onPurpose: [string, string][]; left: string[] }> = {};
  for (const [name, f] of Object.entries(ledger)) {
    const s: { covered: number; onPurpose: [string, string][]; left: string[] } = (out[name] = { covered: 0, onPurpose: [], left: [] });
    for (const [m, names] of Object.entries(f.app)) {
      if (m === '.' || !/^(engine|theory|repository)\//.test(m)) continue;
      for (const n of names) {
        const key = `${m}:${n}`;
        const why = DEEP_ON_PURPOSE[key] ?? DEEP_ON_PURPOSE[m] ?? (entryOfSymbol(m, n) === 'view' ? 'leaves for Cell studio, decision 086' : undefined);
        if (have.get(m)?.has(n) && !why) s.covered++;
        else if (why) s.onPurpose.push([key, why]);
        else s.left.push(key);
      }
    }
  }
  return out;
}

const count = (r: Record<string, string[]>) => Object.values(r).reduce((n, v) => n + v.length, 0);

/** The generated part of docs/api.md: the entry points, what each holds, the root's exports, the frontends' reach. */
export function render(root = ROOT, ledger: Ledger = readLedger()): string {
  const all = modules(root);
  const byEntry = new Map<Entry, string[]>();
  for (const m of all) byEntry.set(entryOf(m), [...(byEntry.get(entryOf(m)) ?? []), m]);
  const exported = rootExports(root);
  const lines: string[] = [];
  const list = (names: readonly string[]) => names.map((n) => `\`${n}\``).join(', ');

  lines.push('### The entry points and their modules', '');
  lines.push('| entry point | layer | what | modules |', '|---|---|---|---|');
  for (const e of ENTRIES) lines.push(`| \`${e.name}\` | ${e.layer} | ${e.role} | ${(byEntry.get(e.name) ?? []).length} |`);
  lines.push(`| (leaves for Cell studio, decision 086) | | the view: drawing only | ${(byEntry.get('view') ?? []).length} |`);
  lines.push(`| (internal) | | named by no entry point | ${(byEntry.get('internal') ?? []).length} |`, '');
  for (const e of ENTRIES) {
    lines.push(`#### \`${e.name}\``, '', `Planned modules: ${list(byEntry.get(e.name) ?? [])}.`, '');
    if (e.name !== '@yggi/cells') {
      const names = [...entryExports(e.name, root)].flatMap(([, n]) => n);
      lines.push(
        names.length ? `Exported by its entry point, \`src/${entryFile(e.name)}\` (${names.length}): ${list([...names].sort())}.` : 'Its entry point is not written yet.',
        '',
      );
    }
    const there = [...exported].filter(([m]) => entryOf(m) === e.name).flatMap(([, n]) => n);
    lines.push(there.length ? `On the root index today (${there.length}): ${list([...there].sort())}.` : 'Nothing on the root index today.', '');
  }
  const stray = [...exported].filter(([m]) => entryOf(m) === 'view' || entryOf(m) === 'internal').flatMap(([m, n]) => n.map((x) => `\`${x}\` (${m})`));
  if (stray.length) lines.push('#### On the root index, planned for no entry point', '', `${stray.join(', ')}.`, '');

  lines.push('### What the frontends reach by a module path', '');
  const state = standing(ledger, root);
  lines.push(
    '| frontend | pin | app: modules / symbols deep | an entry point exports | on purpose | work left | app: symbols from the root | tests and tools: modules / symbols deep |',
    '|---|---|---|---|---|---|---|---|',
  );
  for (const [name, f] of Object.entries(ledger)) {
    const deep = (r: Record<string, string[]>) => Object.fromEntries(Object.entries(r).filter(([m]) => m !== '.'));
    const s = state[name];
    lines.push(
      `| ${name} (\`${f.commit.slice(0, 7)}\`) | ${f.pin} | ${Object.keys(deep(f.app)).length} / ${count(deep(f.app))} | ${s.covered} | ${s.onPurpose.length} | ${s.left.length} | ${f.app['.']?.length ?? 0} | ${Object.keys(deep(f.tests)).length} / ${count(deep(f.tests))} |`,
    );
  }
  lines.push('');
  const purposes = new Map<string, Set<string>>();
  for (const s of Object.values(state))
    for (const [k, why] of s.onPurpose) {
      const [module, name] = k.split(':');
      const key = `${module} (${why})`;
      purposes.set(key, new Set([...(purposes.get(key) ?? []), name]));
    }
  lines.push(
    purposes.size
      ? `Reached by a module path on purpose: ${[...purposes]
          .sort()
          .map(
            ([k, names]) =>
              `${k}: ${[...names]
                .sort()
                .map((n) => `\`${n}\``)
                .join(', ')}`,
          )
          .join('; ')}.`
      : 'Nothing is reached by a module path on purpose.',
    '',
  );
  const left = new Map<string, string[]>();
  for (const [name, s] of Object.entries(state)) for (const k of s.left) left.set(k, [...(left.get(k) ?? []), name]);
  lines.push(
    left.size
      ? `Reached by an app and on no entry point (the work left): ${[...left]
          .sort()
          .map(([k, who]) => `\`${k}\` (${who.join(', ')})`)
          .join(', ')}.`
      : 'Every symbol an app reaches is on an entry point or reached on purpose.',
    '',
  );
  return lines.join('\n');
}

const BEGIN = '<!-- api:begin (generated by `npm run api`; do not edit) -->';
const END = '<!-- api:end -->';

/** `docs/api.md` with its generated part replaced by `generated`. */
export function withGenerated(page: string, generated: string): string {
  const start = page.indexOf(BEGIN);
  const end = page.indexOf(END);
  if (start < 0 || end < start) throw new Error(`docs/api.md needs ${BEGIN} and ${END}`);
  return `${page.slice(0, start)}${BEGIN}\n\n${generated}\n${page.slice(end)}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, name, dir] = process.argv.slice(2);
  if (command === 'reach') {
    if (!name || !dir) throw new Error('usage: npm run api -- reach <name> <checkout dir>');
    const git = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
    const pins = [
      ...readFileSync(join(dir, existsSync(join(dir, 'packages/engine/package.json')) ? 'packages/engine/package.json' : 'package.json'), 'utf8').matchAll(
        /"@yggi\/cells":\s*"[^"#]*#([^"]+)"/g,
      ),
    ];
    const ledger = existsSync(LEDGER) ? readLedger() : {};
    const repo = git('remote', 'get-url', 'origin')
      .replace(/^.*github\.com[/:]/, '')
      .replace(/\.git$/, '');
    writeFileSync(LEDGER, `${JSON.stringify({ ...ledger, [name]: { repo, commit: git('rev-parse', 'HEAD'), pin: pins[0]?.[1] ?? '?', ...reachOf(dir) } })}\n`);
  } else {
    const page = join(ROOT, 'docs/api.md');
    writeFileSync(page, withGenerated(readFileSync(page, 'utf8'), render()));
  }
}
