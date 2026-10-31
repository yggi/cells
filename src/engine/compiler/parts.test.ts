// Where a score and its band don't meet (decision 063 §4, #390 step 3): silence, said as an info and never an error. A
// part no performer plays is silent; a part a gate plays and no line writes rests; a tacet says nothing; a typo is an error.
import { describe, expect, it } from 'vitest';
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { eventsBetween, plan } from '../realize';

const bar = '&bar meter("4/4") step=120bpm';
const said = (lines: string[]) => compileSource(lines.join('\n')).diagnostics.map((d) => `${d.severity}: ${d.message}`);

describe('where a score and its band don’t meet', () => {
  it('a part the score writes with no performer to play it: 0 errors, 1 info naming it; nothing said of a fragment alone, which has no performer', () => {
    expect(said([bar, '&bassline step=4n 0 2']).filter((d) => d.startsWith('info'))).toEqual([]);
    // (nor of what a score offers its band, the harmony, unread)
    expect(
      said([bar, '&key scale(minor, D)', '&harm over=&key step=1m [0,2,4]', '&tune step=4n 0', '&v s=saw loop=C4', '&tuneOut play=&tune &v', '&out map=sample [&tuneOut]']),
    ).toEqual([]);
    const r = compileSource([bar, '&bassline step=4n 0 2', '&tune step=4n 4 5', '&v s=saw loop=C4', '&tuneOut play=&tune &v', '&out map=sample [&tuneOut]'].join('\n'));
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => `${d.severity}: ${d.message}`)).toEqual(['info: &bassline is written and nothing plays or reads it: it is silent (a part no performer plays)']);
  });

  it('a band’s own player whose part no line writes: 0 errors, 1 info, and it plays nothing', () => {
    const text = [bar, '&leadline step=4n 0 2', '&leadV s=saw loop=C4', '&leadOut play=&leadline &leadV', '&lead2 play=&lead2line &leadV', '&out map=sample [&leadOut, &lead2]'];
    const r = compileSource(text.join('\n'));
    expect(r.ok).toBe(true);
    expect(r.diagnostics.map((d) => `${d.severity}: ${d.message}`)).toEqual(['info: &lead2 plays &lead2line, which no line writes: it rests']);
    const events = eventsBetween(plan(r, codeShifts(r)), 0, 4, true);
    expect(events.length).toBeGreaterThan(0);
    expect(events.filter((e) => e.output?.includes('lead2line'))).toEqual([]);
    // (declared nowhere all the same: a hole of the piece, as a fragment's part is)
    expect(r.unknown.map((u) => u.name)).toEqual(['lead2line']);
  });

  it('a tacet, a performer’s part written as a rest: nothing said', () => {
    expect(said([bar, '&leadline step=1m ~', '&leadV s=saw loop=C4', '&leadOut play=&leadline &leadV', '&out map=sample [&leadOut]'])).toEqual([]);
  });

  it('is shown firing: a line of rests that is no performer’s part still warns, and a name read anywhere else and declared nowhere is still an error', () => {
    expect(said([bar, '&mel step=1m ~', '&v s=saw loop=C4', '&out map=sample [&mel * &v]'])).toEqual(['warning: &mel plays only rests (~): nothing sounds on &v']);
    expect(said([bar, '&tune step=4n &tunee', '&v s=saw', '&out map=sample [&tune * &v]'])).toEqual(['error: Unknown cell &tunee']);
  });

  it('a line read by another, or a clock, is no part left unplayed', () => {
    expect(said([bar, '&motif step=4n 0 2', '&tune step=4n &motif 4', '&v s=saw loop=C4', '&tuneOut play=&tune &v', '&out map=sample [&tuneOut]'])).toEqual([]);
    expect(said([bar, '&sweep step=1m 0 1', '&v s=saw loop=C4 lpf=200..2000 * &sweep', '&tune step=4n 0', '&tuneOut play=&tune &v', '&out map=sample [&tuneOut]'])).toEqual([]);
  });
});
