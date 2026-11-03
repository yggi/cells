# A fragment's association in its text: written where a copy doesn't take it, derived as its signature is

Date: 2026-10-31 · Status: open, a proposal; the owner's answers of 2026-10-31 folded in; nothing here is built · Issues: [#405](https://github.com/yggi/cells/pull/405) (the owner: "we can get rid of the duplicate frontmatter, if we can cleanly derive it from the code, just like the signature of a fragment"), [#413](https://github.com/yggi/cells/pull/413) (the presets' styles), [#391](https://github.com/yggi/cells/issues/391), decisions [041](../decisions/041-fragments-by-style.md), [046](../decisions/046-facets-and-co-use.md), [048](../decisions/048-the-learned-layer.md), [050](../decisions/050-the-equalities.md), [063](../decisions/063-the-score-and-the-band.md) §3, [065](../decisions/065-fragments-take-arguments.md)

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
# a template: dorian, at two presets
&key from &tonic style=(&deepHouse | &funk)
&key scale(dorian, &tonic)

# a collection: the default bass, at the centre, at a quarter of the kit's weight
* from style=(&centre * .25)
&bassV s=saw loop=C2 lpf=450..900 * &style[artic] lpq=4 env=&(map=adsr .005 .2 .7 .05)

# a performer, at every one of Jambot's eight presets
&bass, &bassOut from (&bassLevel) &bassline style=(&synthPop | &techno | &deepHouse | &ambient | &lofi | &funk | &bossaNova | &swingJazz)

# one point: no set needed
&bar from (&swing) &tempo style=&lofi

# a fragment of two facets: two declaration lines
&key, &bell, &agogo from &tonic style=&(.383 .717 .25 .417) facet=mode
&key, &bell, &agogo from &tonic style=&(.8 .1 .9 .6) facet=rhythm
```

- **A point is a named style of `styles`** (the owner: "styles collection of all named vectors. this is the source of jambots style presets"; built on #413: `fragments/styles/01-styles.md`, `&synthPop` … `&spooky`), or an inline one, its axes in the table's order (`&(.383 .717 .25 .417)`). The repository resolves the names against `styles` when it derives a point; the compile never reads a declaration's `style=`, so the declaration takes nothing from `styles` into a piece. `&centre` joins the collection (every axis at .5, the language's `CENTRE`), for the instruments and the band.
- **`style=(a | b)` is a set: found at each** (the owner's spelling). The parentheses mark it apart from a mix (`[&a * .8, &b * .2]`, one point between them) and a range (`&a..&b`, one point moving). `(…)` is already an attribute's list (`about=(&fenv &accent)`), and `|` inside it reads as Strudel's "one of these", which is what a query finds.
- **`* w` is a point's weight**, 1 where it is left out (162 of the seed's 180 points; 3 at .4, 6 at .25, 9 at .125).
- **The facet is the seed folder's** (`fragments/modes/` is `mode`): 118 of the 119 seed fragments have one facet, their folder's. A `facet=` is written only where it differs, and where a fragment has two (the bell and scale), one declaration line each.
- **The frontmatter keeps the id**, and `source`, `lifted` and the rest of its metadata. `association:` goes.

**Every seed fragment, written so:** [405-association-in-the-text.declarations.txt](405-association-in-the-text.declarations.txt), generated from the frontmatter by a scratch script, its presets by name (the listing's sets are written without the parentheses, as the note first proposed). A performer's line, eight points, is the longest: 135 characters with the presets by name, 197 as numbers. 95 of the 119 have one point.

## `style=( … )` or another word

The other spelling keeps `style=` meaning one point and gives the set a word of its own. Weighed:

| | `style=(&a \| &b)` | a word of its own |
|---|---|---|
| the word | taken: one attribute for "where in style space" | `at=` is taken (a read head's place on its tape, `at=4n`); `near=`, `found=` free |
| on a declaration | the association, a set | the association, a set |
| on a cell | a cell's style; a set on a cell could be its association too: one meaning, "where this belongs", for a fragment and a cell alike (063's "association or wish") | `style=` stays one point; the set exists on declarations only |
| a pick, `&cell[artic]`, of a set | an error to say ("a set has no one value: pick from one of its styles") | can't happen |
| on `&style` | a set is an error: the section's style is one point | can't happen |
| what is new | one form, a set, and two errors | one attribute, and its own list form |

**Recommendation: `style=( … )`, as the owner suggests.** One attribute says where a thing belongs in style space, whether it is a fragment's declaration or a cell; the parentheses make a set as visible as a range's `..` and a mix's `[ ]`; and the two errors are where a set is read as one point (a pick, the section's style). `at=` would collide with the read head, and a fresh word splits 063's ruling ("Any other cell may carry `style=` as its association or wish") into two attributes for one idea.

## What the hash is for

**Today** `fragmentHash` is `e1:` and a hash of every line's code (decision 050's E1, its rung written first): the signature, every name and every attribute. A lockfile records it per `from`, and a recorded hash the library no longer gives plays the current version with a warning. Decision 050 says the repository's identity is E2 now and E4 "once the hash is built".

**What it is used for**, and what each use needs it to notice:

| use | the question | must change on | must not change on |
|---|---|---|---|
| a piece's lockfile (054 §3) | does the fragment still give this piece what it gave? | anything audible; anything the piece names or binds: the cells a `from` line takes by name, a template's keywords and its heads, an interface name it reads | layout, comments, prose; the declaration's association; Normalise's respellings; a private name renamed |
| the learned layer's identity (048, `sameText`) | is a filed text a held fragment? | the same | the same |
| a band named by id and hash (063 §1) | which default does the host play? | the same | the same |

**The owner's point, checked: a template's private names no longer matter.** Since decision 065 a copy renames every name it doesn't give (`&key_tonic`), so no piece can see or bind one: renaming it changes nothing a piece plays or names. Five kinds of name are still the piece's, and renaming one does change what a piece gets:

1. **A collection's cells:** a piece takes `&bd from gm_kit` by name, and `&bd`'s General MIDI note is read off its name (`gmDrumNote`).
2. **A template's optional parameters:** their names are its keywords (`"4/4 swung on 8n"(swing=…)`).
3. **A template's heads, where it has several:** taken by their names (`&bass, &bassOut from "bass performer" &line`). One head takes the name the piece gives it, and is free.
4. **The interface names it reads** (`&key`, `&harm`, `&style` …), and a name read as a sound (`&bd` in a groove: the kit's vocabulary, read by name).
5. **Under the old `use`:** a template's lines are taken as they are and its parameters read by name, so its private names are visible. `use` retires with decision 065; until it does, a private rename can break an old piece.

**So the hash should read the fragment as a piece receives it:** E3 (its body normalised: Normalise's respellings promise S1), its private names numbered in declaration order, its interface kept by name (1 to 4), and its declaration's association left out. That is E2 corrected and E3, and it differs from E2 as built (`canonicalText`) in one place: E2 numbers *every* own name, a collection's cells too, so two kits with their drums named differently would be one fragment, though a piece that takes `&bd` from one can't take it from the other. It is not E4 yet (stated defaults dropped, #49), and needs nothing from it.

**What it gives:** a seed's association moved, its prose rewritten, a private cell renamed or a line respelled by Normalise warn no saved piece; a sound changed, a kit's drum renamed or a keyword renamed do. The cost: a new rung (`e2:`), every recorded `e1:` hash in the examples' lockfiles rewritten once, and the learned layer's `sameText` moved to it.

## How it maps across the usages

| usage | today | with the declaration line |
|---|---|---|
| the repository's query, `createRepository` | reads `Fragment.association`, from the frontmatter | the same, `association` derived from the text (`associationOf(text, folder, styles)`), as `signatureOf` is |
| a copy, `&key from dorian D` | | takes the body: no `style=` reaches the piece (probed for the signature) |
| a named take, `&bd from gm_kit`, and `* from` | | takes the lines, never the declaration (`* from` with no id is no use) |
| `unionOf`, `fitOf`, `holesOf` | | read the body |
| a piece's own `style=` and `&style` | | untouched: a piece is not a fragment until it is filed |
| the learned layer (decision 048) | points added and reweighted per use, the frontend's data | **unchanged:** the text holds the seed's own claim, the layer what was learned; a use never rewrites a text |
| the lockfile's hash | every line's code (E1) | the declaration out, as a piece receives the fragment (above) |
| Shorten's measure (decision 049: names, labels and comments free) | | the declaration is free, as a signature is: it says where the fragment is found, not what it plays |
| Normalise | | writes the declaration in one spelling (named presets where a point is one, a `facet=` only where it differs from the folder) |
| Jambot (`instrumentsAt`, `INSTRUMENT_LINES`, its `mode-repository.ts`, its preset table) | reads `fragment.association` and lines by voice; owns its presets | reads the derived `association` the same; a line that starts `* from` or a signature is no voice's, and its prefix match (`&leadV `) skips it; its presets come from `styles` (yggi/jambot#531) |
| Cell studio's library, a person's own fragment | a fragment file's frontmatter | the declaration in the text; a file with an `association:` reads for a release, as `use` did (decision 065), and Normalise moves it |

## Open, for the owner

1. ~~The named presets~~: `styles`, the source of Jambot's presets (answered; #413 builds the collection, `&centre` to add).
2. **The spelling:** `style=( … )` recommended above; and whether a set on a cell (not a declaration) is allowed, as its association, or an error until something reads it.
3. **The hash:** the rung above, `e2:`, built with this change or before it.
4. **Order:** after #405 lands, a decision (the next number), then one pull request that moves the 119 seeds, the reader and the hash, with a test that each derived association equals today's frontmatter.
