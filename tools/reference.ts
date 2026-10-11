/**
 * docs/language/reference.md, generated from the parser's own tables (src/engine/parser/): every
 * form it reads, what it means, an example. Its test (src/engine/parser/reference.test.ts) keeps
 * the committed page current and parses every example; record it with
 * UPDATE_REFERENCE=1 npx vitest run src/engine/parser/reference.test.ts
 */
import { CORE, PARAMS, rolesText, type Attribute } from '../src/engine/attributes';
import { BODIES } from '../src/engine/program';
import { DOUGH_ALIASES, DOUGH_SOURCES } from '../src/engine/dough-params';
import { CHANCE_SYNTAX, MODIFIERS, STEP_SYNTAX } from '../src/engine/parser/braid';
import { KEYS, LINE_SYNTAX, SHOWS, SHOW_CONVENTIONS } from '../src/engine/parser/cell';
import { BUILTIN_PLUGINS } from '../src/engine/builtinPlugins';
import { FREE_SYNTAX } from '../src/engine/parser/free';
import { GENERATORS } from '../src/engine/parser/generators';
import { GATE_SYNTAX, MIX_SYNTAX } from '../src/engine/parser/mix';
import { REFERENCE_SYNTAX } from '../src/engine/parser/scanner';
import { SECTIONS, syntax, type Section, type Syntax } from '../src/engine/parser/syntax';
import { MAP_KINDS, MAP_SYNTAX, RATE_UNITS, STEP_SYNTAX as RATE_SYNTAX } from '../src/engine/parser/values';
import { SHOW_MEANING } from '../src/layout/show';
import { SORT_SYNTAX } from '../src/engine/compiler/sorts';

const sentence = (s: string) => s[0].toUpperCase() + s.slice(1) + (/[.)]$/.test(s) ? '' : '.');
const meaning = (a: Attribute) => sentence(`${a.help}${a.on ? ` — on ${rolesText(a.on)}` : ''}${a.voice ? '; it makes the cell a voice' : ''}`);

/** A parameter's forms, from what it takes. */
function paramForm(key: string, a: Attribute): string {
  if (a.value === 'cell') return `${key}=&cell`;
  if (a.value === 'word') {
    const words = key === 's' ? Object.keys(DOUGH_SOURCES) : key === 'body' ? Object.keys(BODIES) : key === 'board' ? ['none', ...Object.keys(BODIES)] : null;
    return `${key}=${words ? words.join('|') : 'word'}`;
  }
  return [`${key}=n`, `${key}=free(n, lo..hi)`, ...(a.moves ? [`${key}=&x`, `${key}=lo..hi * &a * &b`] : []), ...(a.clock ? [`${key}=&clock/n`] : [])].join(' · ');
}

/** Every entry the parser declares, in reference order. */
export function entries(): Syntax[] {
  const attribute = (key: keyof typeof CORE): Syntax => {
    const a = CORE[key];
    return syntax('attribute', KEYS[key].form, meaning(a), KEYS[key].examples, a.doc);
  };
  const parameter = ([key, a]: [string, Attribute]): Syntax => syntax('parameter', paramForm(key, a), meaning(a), [], a.doc);
  return [
    ...LINE_SYNTAX,
    ...STEP_SYNTAX,
    ...Object.values(MODIFIERS).map((m) => m.syntax),
    CHANCE_SYNTAX,
    ...REFERENCE_SYNTAX,
    ...Object.values(GENERATORS).map((g) => g.syntax),
    ...FREE_SYNTAX,
    ...RATE_SYNTAX,
    ...Object.values(RATE_UNITS).map((u) => u.syntax),
    ...Object.values(MAP_KINDS),
    ...MAP_SYNTAX,
    ...(Object.keys(CORE) as (keyof typeof CORE)[]).map(attribute),
    ...Object.entries(PARAMS)
      .filter(([, a]) => !a.old)
      .map(parameter),
    ...SORT_SYNTAX,
    ...MIX_SYNTAX,
    ...GATE_SYNTAX,
  ];
}

const code = (s: string) => (s.includes('`') ? `\`\` ${s} \`\`` : `\`${s}\``);
/** A form's alternatives (a · b) as code each. */
const forms = (f: string) => f.split(' · ').map(code).join(' · ');

/** The page. */
export function renderReference(): string {
  const all = entries();
  const out = [
    '# Syntax reference',
    '',
    "Every form the parser reads, what it means and an example: generated from the parser's own tables (`src/engine/parser/`, with `src/engine/attributes.ts`), so it says what the parser does. The topic pages explain at length; each entry links its page. Don't edit this page: change the tables and record it with `UPDATE_REFERENCE=1 npx vitest run src/engine/parser/reference.test.ts`. Every example here is parsed by that test.",
    '',
    (Object.keys(SECTIONS) as Section[])
      .map(
        (s) =>
          `[${SECTIONS[s]}](#${SECTIONS[s]
            .toLowerCase()
            .replace(/[^a-z0-9 =-]/g, '')
            .replace(/[ =]/g, '-')})`,
      )
      .join(' · '),
  ];
  for (const section of Object.keys(SECTIONS) as Section[]) {
    out.push('', `## ${SECTIONS[section]}`, '');
    if (section === 'attribute')
      out.push(
        `An attribute is \`key=value\`, anywhere on a cell's line, each at most once (\`step=\` and \`loop=\` are one setting). What the values of \`step=\`, \`loop=\` and \`map=\` can be is above. \`show=\` takes one of: ${SHOWS.map((k) => `\`${k}\` (${SHOW_MEANING[k]})`).join(', ')}, or a plugin ([plugins.md](plugins.md)): ${BUILTIN_PLUGINS.map((p) => `\`${p.name}\` (built in: ${p.meaning})`).join(', ')}, or one the piece carries; ${Object.entries(
          SHOW_CONVENTIONS,
        )
          .map(([k, cs]) => `\`${k}:\` ${cs.map(code).join(', ')}`)
          .join('; ')}.`,
        '',
      );
    if (section === 'parameter')
      out.push(
        `Parameters belong to voices (the sound ones keep dough's names) and to physical cells. A word where a number belongs, or a parameter on a cell where it does nothing, is a warning. Dough's other names aren't read: writing one is an error that names ours (${Object.entries(
          DOUGH_ALIASES,
        )
          .map(([k, v]) => `\`${k}\` → \`${v}\``)
          .join(', ')}).`,
        '',
      );
    if (section === 'sort')
      out.push(
        'Every cell has a sort, decided by its own line, never by where it is written in a mix; the first rule that holds decides (`src/engine/compiler/sorts.ts`). How the sorts combine with `+` and `*` is on [mix.md](mix.md#the-algebra-of-a-mix).',
        '',
      );
    for (const e of all.filter((x) => x.section === section)) {
      const ex = e.examples.length ? ` ${e.examples.map(code).join(' · ')}` : '';
      out.push(`- ${forms(e.form)}: ${e.means} [→](${e.doc})${ex}`);
    }
  }
  return out.join('\n') + '\n';
}
