# A fragment's association in its text: written where a copy doesn't take it, derived as its signature is

Date: 2026-10-31 · Status: open, a proposal for the owner; nothing here is built · Issues: [#405](https://github.com/yggi/cells/pull/405) (the owner: "we can get rid of the duplicate frontmatter, if we can cleanly derive it from the code, just like the signature of a fragment"), [#391](https://github.com/yggi/cells/issues/391), decisions [041](../decisions/041-fragments-by-style.md), [046](../decisions/046-facets-and-co-use.md), [048](../decisions/048-the-learned-layer.md), [063](../decisions/063-the-score-and-the-band.md) §3, [065](../decisions/065-fragments-take-arguments.md)

## Three things, kept apart

| | the **association** | a cell's **`style=`** | the **`&style`** note |
|---|---|---|---|
| says | where the fragment is found in style space | a cell's own style: a value a reader picks (`&cell[artic]`) | the section's style |
| written by | whoever files the fragment | anyone | the composer alone (#405: a fragment that defines it is an error) |
| read by | the repository's query | the compile, through a pick | the instruments, by name |
| today | the frontmatter (`association:`) | the text | the text |

This note proposes moving the first into the text, where the repository reads it as it reads a signature (`signatureOf`), and leaves the other two as they are.

## The probe: the head line is the wrong place

Written on a fragment's head line, an association travels with the fragment (scratch probes, cells at 5937dc3):

| usage | `&key scale(dorian, &tonic) style=…` on the head | on a collection's first line, `&bd … style=…` |
|---|---|---|
| a copy, `&key from x D` | the piece's `&key` has `style=` | |
| attributes before `from` (`&key label="k" from x D`) | kept | |
| a named take, `&bd from kitX` | | the piece's `&bd` has `style=` |
| a named take of another cell, `&sd from kitX` | | none |
| `* from kitX`, and `use * from kitX` | | `&bd` has `style=` |
| `unionOf` (the fit's union on a workbench) | | written into the union |

So a piece that takes `dorian` would claim dorian's place as its own key's style, and a piece filed back into the library (`fileFragment`) would read the library's claim as its own. Which cell of a collection carries it would be arbitrary.

**A line a copy never takes doesn't travel.** The signature is one: `&key from &tonic` compiles to nothing, a copy takes the body (`bodyOf`), and the probe shows nothing carried. But a signature takes no attributes today (`&key from &tonic style=…` is no longer a signature: `signatureOf` is null), and a collection has none.

## The proposal

**A fragment's declaration line** holds its association: the signature for a template, a new `* from` line with no id for a collection (everything here, from this fragment: what `* from x` takes).

```text
# a template: one point (dorian, at two presets)
&key from &tonic style=&deepHouse | &funk
&key scale(dorian, &tonic)

# a collection: the default bass, at the centre, at a quarter of the kit's weight
* from style=&centre * .25
&bassV s=saw loop=C2 lpf=450..900 * &style[artic] lpq=4 env=&(map=adsr .005 .2 .7 .05)

# a performer, at every one of Jambot's eight presets
&bass, &bassOut from (&bassLevel) &bassline style=&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz

# a fragment of two facets: two declaration lines
&key, &bell, &agogo from &tonic style=&(.383 .717 .25 .417) facet=mode
&key, &bell, &agogo from &tonic style=&(.8 .1 .9 .6) facet=rhythm
```

- **`|` is a set: found at each.** On a declaration it can't mean what a cell's `style=` means (one point, `[&a * .8, &b * .2]` a mix of them). `|` reads as Strudel's "one of these", which is what a query finds.
- **`* w` is a point's weight**, 1 where it is left out (162 of the seed's 180 points; 3 at .4, 6 at .25, 9 at .125).
- **A point is a style:** a named one (`&funk`, Jambot's presets, the styles of 063 §3, which are to be fragments of the facet `style`) or an inline one with its axes in the table's order (`&(.383 .717 .25 .417)`).
- **The facet is the seed folder's** (`fragments/modes/` is `mode`): 118 of the 119 seed fragments have one facet, their folder's. A `facet=` is written only where it differs, and where a fragment has two (the bell and scale), one declaration line each.
- **The frontmatter keeps the id**, and `source`, `lifted` and the rest of its metadata. `association:` goes.

**Every seed fragment, written so:** [405-association-in-the-text.declarations.txt](405-association-in-the-text.declarations.txt), generated from today's frontmatter by a scratch script, its presets by name. A performer's line, eight points, is the longest: 135 characters with the presets by name, 197 as numbers. 95 of the 119 have one point.

## How it maps across the usages

| usage | today | with the declaration line |
|---|---|---|
| the repository's query, `createRepository` | reads `Fragment.association`, from the frontmatter | the same, `association` derived from the text (`associationOf(text, folder)`), as `signatureOf` is |
| a copy, `&key from dorian D` | | takes the body: no `style=` reaches the piece (probed for the signature) |
| a named take, `&bd from gm_kit`, and `* from` | | takes the lines, never the declaration (`* from` with no id is no use) |
| `unionOf`, `fitOf`, `holesOf` | | read the body |
| a piece's own `style=` and `&style` | | untouched: a piece is not a fragment until it is filed |
| the learned layer (decision 048) | points added and reweighted per use, the frontend's data | **unchanged:** the text holds the seed's own claim, the layer what was learned; a use never rewrites a text |
| the lockfile's hash (`fragmentHash`, every line's code) | | must not read the declaration's `style=`, or moving a fragment's place warns in every saved piece that plays it, though nothing sounds different (decision 050's E4, "what a hash reads") |
| Shorten's measure (decision 049: names, labels and comments free) | | the declaration is free, as a signature is: it says where the fragment is found, not what it plays |
| Normalise | | writes the declaration in one spelling (named presets where a point is one, a `facet=` only where it differs from the folder) |
| Jambot (`instrumentsAt`, `INSTRUMENT_LINES`, its `mode-repository.ts`) | reads `fragment.association` and lines by voice | reads the derived `association` the same; a line that starts `* from` or a signature is no voice's, and its prefix match (`&leadV `) skips it |
| Cell studio's library, a person's own fragment | a fragment file's frontmatter | the declaration in the text; a file with an `association:` reads for a release, as `use` did (decision 065), and Normalise moves it |

## Open, for the owner

1. **The named presets** need a home the declaration reads: a `styles` collection (`&synthPop map=style …`, the presets of 063 §3), read by the repository when it derives a point. The compile never reads a declaration's `style=`, so it is a reference the repository resolves, not a `from` the piece takes. Or inline points only, longer (197 characters for a performer).
2. **The set `|`:** it is only legal on a declaration. Or a word, `at=` (`&key from &tonic at=&deepHouse | &funk`), which keeps `style=` meaning one point everywhere. The owner asked for `style=`; `at=` is the cleaner split if two meanings of one attribute are a cost.
3. **The hash:** leave the declaration out of E1 now, or wait for E4.
4. **Order:** after #405 lands, a decision (the next number), then one pull request that moves the 119 seeds and the reader, with a test that each derived association equals today's frontmatter.
