---
name: coverage
description: Place a fragment in style space, or change how a query measures, by first measuring what each style of `styles` finds, facet by facet, before and after - ties broken by id, misses past Jambot's 0.3, firsts that co-use can swap - with `npm run coverage` and a placement tried from a JSON file before any point is written. Use when writing or moving a fragment's association points, placing a new facet (forms, sections) by idiom, filling #540's coverage gaps, weighing a change to the query's distance (#644's reach), or answering "what does style X find?".
---

# Coverage: what each style finds, before a point is written

The tool is `tools/coverage.ts`, its test `tools/coverage.test.ts` (in `npm run verify`). It ranks the library's fragments of a facet at each style of `styles` as a query with nothing chosen and no layer does (the test holds it to `query` itself), and prints either a table (a style per row, a facet per column, the first's distance) or the first `k` per style.
It was the probe of #371 and #644 (`docs/notes/644-reach-in-a-query.md`).

## 1. Measure what is there

```sh
npm run coverage                                  # every facet: the first's distance, = where the second ties it
npm run coverage -- --facet form --k 3            # the first three forms at each style
npm run coverage -- --facet meter --between       # and at the point halfway between each pair of styles
npm run coverage -- --styles kinderlied,funk --facet form,motif
```

Read three things off it:
- **A tie (`=`):** a query breaks it by id, so the first is the id's, not the style's (#371). A placement should leave none at a style.
- **A miss:** a first past 0.3 is Jambot's `MISS_DISTANCE`, where its own generator plays instead (#540's coverage bound).
- **A near tie:** first two within 0.01 (`CO_USE_PULL` × `CO_USE_REACH`) can be swapped by use. Count them with `--json` (below).

## 2. Try a placement before writing it

Write the points as JSON, in your scratchpad, each fragment's id to the points that replace its points of that facet:

```json
{
  "AABA": [{ "point": { "sync": 0.45, "harm": 0.85, "bite": 0.4 }, "facet": "form" }],
  "period": [{ "point": { "sync": 0.15, "harm": 0.4 }, "reach": { "sync": 0.15 }, "facet": "form", "weight": 0.5 }]
}
```

```sh
npm run coverage -- --facet form --k 3 --place $S/forms.json
npm run coverage -- --between --facet form --k 2 --place $S/forms.json --json > $S/forms-found.json
```

- Run it without `--place` too: the pull request names each style whose first changes, as #540 asks ("every repository query in Jambot's tests returns the same fragments … except where a filled gap is the point").
- Place by the facet's idiom (the owner, 2026-11-09: "form follows idiom. same for sections"), and say in the pull request where each idiom sits.
- A placement that changes what a preset finds changes how Jambot plays it: that is "stop, push back, recommend" (AGENTS.md), with the table in the pull request.
- Then write the points into the fragment's file, `npm run fragments`, and check the tool prints what the placement did.

## 3. A change to how a query measures

`--distance` measures the same library another way, for a decision before the query changes (`tools/coverage.ts`'s header says each):
- `today` is the query's;
- `window` and `hinge` read a point's `reach` (#644);
- `whole` counts an axis a point leaves out as a reach of the whole axis.

Compare the counts (ties, near ties, firsts at 0, misses) over the styles and `--between`, as `docs/notes/644-reach-in-a-query.md` does. Lock-in (`lockin.slow.test.ts`) and Jambot's experiments are measured apart: this tool knows nothing of use or a layer.

## Don't

- Don't quote a number measured on a branch without its commit: the axes moved in #624, and every point with them.
- Don't add a mode to the tool for one probe and leave it unused: a mode stays only while a note or an issue weighs it.
