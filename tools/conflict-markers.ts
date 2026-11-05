// Lifted from yggi/webmidi tools/conflict-markers.ts @ 06a4ea8.
// No tracked file keeps a line git's merge left as a conflict marker (yggi/webmidi#44): Prettier formats one in markdown as ordinary
// text and the docs test reads only links and the index, so a merge resolved by hand could push `<<<<<<<` into
// CHANGELOG.md. A marker in code fails the typecheck already; this covers the rest. Run by its test, in `npm run verify`
// and in the docs check (`npm run verify:docs`).

/** A line git writes at a conflict: seven `<`, `=` or `>`, alone or followed by a space (a branch's name). */
const MARKER = /^(<{7}|={7}|>{7})( |$)/;

/**
 * The 1-based lines of `text` that are conflict markers. A run of `=` under a line of text is a setext heading's
 * underline, not a marker, unless the text is a marker's own `<<<<<<<` line; a `=======` after a blank line, or first, is
 * a marker.
 */
export function markers(text: string): number[] {
  const lines = text.split('\n');
  return lines.flatMap((line, i) => {
    if (!MARKER.test(line)) return [];
    if (line.startsWith('=')) {
      const above = lines[i - 1];
      if (above !== undefined && above.trim() !== '' && !MARKER.test(above)) {
        // an underline, unless a `<<<<<<<` opened a conflict above it with no `>>>>>>>` since
        const last = (open: RegExp) => lines.slice(0, i).reduce((at, l, j) => (open.test(l) ? j : at), -1);
        const opened = last(/^<{7}( |$)/);
        if (opened === -1 || last(/^>{7}( |$)/) > opened) return [];
      }
    }
    return [i + 1];
  });
}
