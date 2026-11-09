// The changelog's entries not yet released, one file each in `changes/`, so that two pull requests never add to the same
// lines: a line under *Unreleased* in CHANGELOG.md conflicted with every other pull request's on GitHub, and the merge
// of main that resolved it meant verify and CI again. Run in the repository's root (`npm run changelog -- <command>`).
//
//   node tools/changelog.mjs check                     # every entry names a known section and has a bullet
//   node tools/changelog.mjs gather <version> [date]   # a release: *Unreleased* and every entry under `## <version> — <date>`
//
// An entry is `changes/<issue-or-slug>.md`: its first line a section heading as the changelog writes it (`### Added`, one
// of SECTIONS), then its bullets as they read in the changelog; it may hold more sections, each filed under its own. `changes/README.md` says so and is no entry. `gather`
// keeps what *Unreleased* holds as it is, adds each entry to its section (the sections in SECTIONS' order, then any
// other heading *Unreleased* has, in its own order), puts them under the new heading, leaves *Unreleased* its pointer
// to `changes/` and deletes the entries it gathered. tools/changelog.test.ts runs it.
// yggi/webmidi and yggi/cell-studio have the same code, lifted from here, SECTIONS aside: a fix here goes to them too.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The sections an entry may name, in the order a release lists them: the one line that differs between the repositories. */
const SECTIONS = ['Added', 'Changed', 'Removed', 'Fixed', 'Repository'];
const DIR = 'changes';
const CHANGELOG = 'CHANGELOG.md';
const POINTER = 'Entries not yet released are in [`changes/`](changes/), one file each; a release gathers them here (`npm run changelog -- gather`).';

const byName = (a, b) => a.localeCompare(b, 'en', { numeric: true });
/** The entries' paths, in the order a release lists them within a section (issue numbers in numeric order). */
const entries = () =>
  (existsSync(DIR)
    ? readdirSync(DIR)
        .filter((f) => f !== 'README.md')
        .sort(byName)
    : []
  ).map((f) => join(DIR, f));

/** Lines with the blank ones at either end taken off. */
const trimmed = (lines) => {
  let [from, to] = [0, lines.length];
  while (from < to && !lines[from].trim()) from++;
  while (to > from && !lines[to - 1].trim()) to--;
  return lines.slice(from, to);
};

/** What is wrong with one entry, as messages naming it; none for a good one. */
function problems(path) {
  if (!path.endsWith('.md')) return [`${path}: an entry is a markdown file, changes/<issue-or-slug>.md`];
  const lines = readFileSync(path, 'utf8').split('\n');
  const heading = /^### (.+?)\s*$/.exec(lines[0]);
  const found = [];
  if (!heading) found.push(`${path}: its first line is no section heading (### ${SECTIONS.join(', ### ')})`);
  else if (!SECTIONS.includes(heading[1])) found.push(`${path}: "### ${heading[1]}" is no section the changelog has (### ${SECTIONS.join(', ### ')})`);
  for (const line of lines.slice(1)) {
    const more = /^### (.+?)\s*$/.exec(line);
    if (more && !SECTIONS.includes(more[1])) found.push(`${path}: "### ${more[1]}" is no section the changelog has (### ${SECTIONS.join(', ### ')})`);
  }
  if (!lines.slice(1).some((line) => /^- \S/.test(line))) found.push(`${path}: no bullet ("- …") under its heading`);
  return found;
}

function check() {
  const found = entries().flatMap(problems);
  for (const p of found) console.error(`changelog: ${p}`);
  return found.length ? 1 : 0;
}

/** Sections as [heading, chunks of lines], from lines that start at a `### ` heading (or hold none). */
function sections(lines) {
  const out = [];
  for (const line of lines) {
    const heading = /^### (.+?)\s*$/.exec(line);
    if (heading) out.push([heading[1], []]);
    else out.at(-1)?.[1].push(line);
  }
  return out.map(([heading, body]) => [heading, [trimmed(body)]]);
}

function gather(version, date) {
  if (!version || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error('changelog: gather <version> [date], the version as the changelog writes its headings, the date as YYYY-MM-DD');
    return 1;
  }
  if (check()) {
    console.error('changelog: nothing gathered, since an entry is malformed');
    return 1;
  }
  const lines = readFileSync(CHANGELOG, 'utf8').split('\n');
  const start = lines.findIndex((line) => /^## Unreleased\s*$/.test(line));
  if (start < 0) {
    console.error(`changelog: ${CHANGELOG} has no "## Unreleased"`);
    return 1;
  }
  let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  if (end < 0) end = lines.length;
  const last = lines[end]?.slice(3) ?? '';
  if (last && /^v\d/.test(last) !== /^v\d/.test(version)) {
    console.error(`changelog: the last release reads "## ${last}": give the version as its heading writes it`);
    return 1;
  }
  if (lines.some((line) => line.startsWith(`## ${version} `) || line === `## ${version}`)) {
    console.error(`changelog: ${CHANGELOG} has "## ${version}" already`);
    return 1;
  }

  // What *Unreleased* holds, its pointer and a line saying nothing changed aside: a preamble, then its sections.
  const held = lines.slice(start + 1, end).filter((line) => line.trim() !== POINTER && !/^Nothing has changed since\b/.test(line));
  const first = held.findIndex((line) => line.startsWith('### '));
  const preamble = trimmed(first < 0 ? held : held.slice(0, first));
  const chunks = new Map();
  for (const [heading, [body]] of sections(first < 0 ? [] : held.slice(first))) if (body.length) chunks.set(heading, [...(chunks.get(heading) ?? []), body]);
  const gathered = entries();
  // (an entry of several sections, `### Added` then `### Changed`, files each part under its own)
  for (const path of gathered)
    for (const [name, [body]] of sections(readFileSync(path, 'utf8').split('\n'))) if (body.length) chunks.set(name, [...(chunks.get(name) ?? []), body]);
  if (!chunks.size && !preamble.length) {
    console.error('changelog: nothing to gather: *Unreleased* is empty and changes/ holds no entry');
    return 1;
  }

  // The changelog's own spacing: a blank line after a section's heading and between its entries, or none.
  const heading = lines.findIndex((line) => line.startsWith('### '));
  const gap = heading >= 0 && lines[heading + 1] === '' ? '\n\n' : '\n';
  const order = [...SECTIONS.filter((s) => chunks.has(s)), ...[...chunks.keys()].filter((s) => !SECTIONS.includes(s))];
  const release = [
    `## ${version} — ${date}`,
    ...(preamble.length ? [preamble.join('\n')] : []),
    ...order.map(
      (s) =>
        `### ${s}${gap}${chunks
          .get(s)
          .map((c) => c.join('\n'))
          .join(gap)}`,
    ),
  ];
  const after = lines.slice(end);
  writeFileSync(CHANGELOG, [...lines.slice(0, start), '## Unreleased', '', POINTER, '', release.join('\n\n'), '', ...after].join('\n'));
  for (const path of gathered) rmSync(path);
  console.log(`changelog: ${gathered.length} entr${gathered.length === 1 ? 'y' : 'ies'} from changes/ and what *Unreleased* held, under "## ${version} — ${date}"`);
  return 0;
}

const [command, ...args] = process.argv.slice(2);
if (command === 'check') process.exitCode = check();
else if (command === 'gather') process.exitCode = gather(args[0], args[1] ?? new Date().toISOString().slice(0, 10));
else {
  console.error('changelog: check | gather <version> [date]');
  process.exitCode = 1;
}
