/** A rate's units (`84bpm`, `440hz`, `1d` …): read after a number in step=, loop= and a free() rate. */
import { syntax, type Syntax } from './syntax';

/** A rate's units: n of them is n·times/per a second. */
export const RATE_UNITS: Readonly<Record<string, { readonly times: number; readonly per: number; readonly syntax: Syntax }>> = {
  bpm: {
    times: 1,
    per: 60,
    syntax: syntax('rate', 'nbpm', 'n a minute: beats on a meter (its steps, unless beat= or meter(…) say how many make a beat).', ['&bar scan(4 4 4 4) step=84bpm'], 'time.md'),
  },
  hz: { times: 1, per: 1, syntax: syntax('rate', 'nhz', 'n a second (a plain number says the same).', ['&a loop=440hz'], 'time.md') },
  min: { times: 1, per: 60, syntax: syntax('rate', 'nmin', 'n a minute (wall-clock time: loop=1min turns once a minute).', ['&tick scan(1!60) loop=1min'], 'time.md') },
  h: { times: 1, per: 3600, syntax: syntax('rate', 'nh', 'n an hour.', ['&hour scan(1!60) loop=1h'], 'time.md') },
  d: {
    times: 1,
    per: 86400,
    syntax: syntax('rate', 'nd', 'n a day: a day meter, loop=1d (anchor= where it stands when play starts).', ['&day scan(1!24) loop=1d anchor=11.55'], 'time.md'),
  },
  wk: { times: 1, per: 604800, syntax: syntax('rate', 'nwk', 'n a week.', ['&week scan(1!7) loop=1wk'], 'time.md') },
  k: { times: 1000, per: 1, syntax: syntax('rate', 'nk', 'n thousand a second: a sample rate.', ['&out loop=44.1k map=sample &mix'], 'mix.md') },
};
/** The units after a number, longest first: bpm, hz, k. */
export const UNIT = new RegExp(
  Object.keys(RATE_UNITS)
    .sort((a, b) => b.length - a.length)
    .join('|'),
  'y',
);
/** n of a unit, a second. */
export const perSecond = (n: number, unit: string | null | undefined) => {
  const u = unit ? RATE_UNITS[unit] : undefined;
  return u ? (n * u.times) / u.per : n;
};
