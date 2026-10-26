# The full chain, fully fragmented: how the repository, the workbench, the conductor, the performer and the Muse are written

Date: 2026-10-26 · Status: open, a proposal measured; its rungs are issues, each waiting on the owner's word where it changes the language · Issue: [#288](https://github.com/yggi/cells/issues/288) · The central roadmap: [#81](https://github.com/yggi/cells/issues/81), [yggi/jambot#358](https://github.com/yggi/jambot/issues/358)

The owner (2026-10-26): "I want to see a few examples for the full chain, how they are actually written, how everything fits together … everything fully fragmented … we should be able to reproduce current jambot behavior, but not limit ourselves to it … we do not have to do everything at once, but we have to think ahead for it, so the shape stands for the features to fill into."
And: "problem: opaque 'use' - one does not know whats 'in it'. idea: python-style named imports."

What this note finds, in one paragraph:
**the chain is fragmented at both ends and flattened in the middle.**
The repository holds fragments with holes, and the performers are gates that use their instruments.
But Jambot's composer reads every fragment into its own notes and states them again, so the text the conductor sends names no fragment, no variation and no hole.
Three things in the language keep a text from staying fragmented:
- a `use` doesn't say what it brings, or when it brings nothing;
- a fragment can't leave a value (a tempo, a tonic) to the text that uses it;
- the pattern fragments carry Jambot's MIDI routing.

Each is an issue below, and none needs a new idea, only the ones already here carried through: holes, tables, operators, names that say what they are.

All measurements are at cells 981ea22 and yggi/jambot 24a528b, compiled with the seed resolver; the probes were scratch runs, not committed, and the two blocks marked `cells` below are compiled by `docs.test.ts`.

## 1. The chain today

| stage | who writes it | what it is today | fragmented? |
|---|---|---|---|
| the repository | cells' seeds, the learned layer, the Muse | 51 fragments: 13 meters, 13 rhythms, 5 bass lines, 5 harmonies, 6 instruments, 5 modes, 4 performers | yes, with holes (decision 047) |
| the workbench | Jambot's composer | its own notes, read from fragments (`repository.ts`, `facet.ts`, `line-repository.ts` in yggi/jambot) | no: a model outside the text |
| what the conductor sends | `sectionAsCells` | a section's text, every line written out, plus a `frame` the feel reads (`contracts/session` v1.3, `section`) | only `use "core kit"` |
| what a performer plays | Jambot's band, Cell studio's follower | events, then MIDI or sound, the feel applied by role (`contracts/feel` v1.1) | the roles read off names |
| what the Muse files | Jambot's Muse | a heard bar as a new line of text, at the section's style point, with who and when | no: recognition (decision 055) is used for the homeostat, not for filing |

What the conductor sends, the Funk preset at seed 1, the section from bar 9 (an excerpt; the whole is 5,863 bytes in 22 lines):

```text
&bar meter("4/4") step=104bpm swing=16n:.6
&key scale(dorian, D)
&harm over=key step=1m [0,2,4] [0,2,4] [0,2,4] [0,2,4] [6,8,10] [6,8,10] [6,8,10] [6,8,10]
&kick step=16n &bd:0:.645049 ~ ~ &bd:0:.437473 ~ ~ ~ ~ ~ ~ &bd:0:.437473 &bd:0:.437473 ~ ~ ~ ~ &bd:0:.645049 … (128 steps)
&hat step=16n &hh:0:.312543 &hh:0:.131192 &oh:0:.2232 ~ … (128 steps)
&drums [&kick, &backbeat, &fill, &ghost, &hat, &euclid]
use "core kit"
&bass over=&harm step=16n legato=.425 3@3 3@7 3 3@5 … 0#@3
&bassLevel map=amp step=16n .547833@3 .386943@7 …
&bassOut play=&bass level=&bassLevel &bassV
&bassV loop=C1
&lead over=key step=16n legato=.4125 ~ 4@5 6@4 8@3 8@2 9 ~ 9@5 11@4 13@3 …
&leadOut play=&lead level=.416889 &leadV
&leadV loop=C4
&out map=midi &leadOut &bassOut &stabOut ~!6 &drums
```

The harmony is the seed `vamp to the seventh`, and the drums are `Funk drums` varied by the ladder, but nothing in the text says so.

## 2. Three probes: how far `use` carries a section today

**A, a section of uses alone, plays nothing.**

```text
use "4/4 leaning on 16n"
use "dorian"
use "vamp to the seventh"
use "Funk drums"
use "core kit"
use "funk bass"
use "bass"
```

Every tapping line fails: "step=16n taps the piece's main meter, and it has none".
The meter fragments hold no tempo, and nothing else can give one.

**B, the same with `&bar` and `&key` written out, compiles with no diagnostic, and two of its seven uses add nothing.**
The piece's own lines win (decision 054), so `use "4/4 leaning on 16n"` and `use "dorian"` bring nothing, and nothing says so.
This is the opaque `use` the owner names: what `use "Funk drums"` brings (eight lines, a MIDI card `&drums` among them) is in no line of the text.

**C, as fragmented as cells allows, compiles clean:**

```cells
use "core kit"
use "Funk drums"
use "vamp to the seventh"
use "bass performer"
use "lead performer"
&bar meter("4/4") step=104bpm swing=16n:.6
&key scale(dorian, D)
&bassline over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~
&bassNext over=&harm[>>] 0
&bassLevel map=amp .55
&call over=key step=8n 4 6 8 ~ 9 8 6 ~
&leadline step=8n &call &call^-2
&leadLevel map=amp .42
&band map=midi &lead &bass
```

It is 475 bytes, a bar looped where the host wrote eight different ones, so it is not the same music; the size shows what references carry.
What it still writes out, and why:
- the tempo and the tonic, since a fragment can't leave them to the text ([#290](https://github.com/yggi/cells/issues/290));
- the bass line, since the seed's `&bass` is the bass performer's gate and its `&bassOut map=midi(2)` a card of its own ([#285](https://github.com/yggi/cells/issues/285), [#291](https://github.com/yggi/cells/issues/291));
- the composer's phrase, which is its own work and should be.

The drums come in by `use`, but not through a performer: a gate's output names its part, not the drum line's role ([#287](https://github.com/yggi/cells/issues/287)).

## 3. The shape: three times a name or a value is bound

Every open thing in a text is bound at one of three times, by one of three forms, and recorded in one of three places:

| when | who binds | the form | recorded in | in music |
|---|---|---|---|---|
| written | the author | a literal: `4 6 8`, `104bpm`, `D` | the text | through-composed |
| assembled | the composer, the workbench | a hole the text fills by defining the name; `use`, which takes a fragment's lines | the text, and the lockfile for a `use`'s version (054) | arranging, orchestrating: a lead sheet's parts given to players |
| performed | the performer, the conductor's sliders | `free()`, and the feel | a take, kept or not (decision 018); the `played` messages; the Muse | improvising, interpreting |

The concept already says it (owner, 2026-10-17): "the performers play within their `free()`", and the composer finds parts "with more or less generous `free()`".
The table only says where each thing belongs, and two things are in the wrong row today:
- **a tempo and a tonic are the composer's, assembled, but have no hole**: a fragment can only give them as literals (the meters give none, so nothing plays) or as `free()` (the modes' `free(C)`, which is the performer's room, a slider). [#290](https://github.com/yggi/cells/issues/290) makes them holes: `step=&tempo`, `scale(dorian, &tonic)`, defined by the text that uses the fragment. `free()` stays the room within which they move.
- **a card is the performer's output**, but the pattern fragments carry one ([#291](https://github.com/yggi/cells/issues/291)).

Why holes and not parameters (`use "dorian" (tonic=D)`): a hole is a name, which cells already has, which the fit already reads (`holesOf`), and which a text fills the way it fills `&bar` today (#22).
A second way to give a fragment a value would be a second spelling of the same thing.

## 4. Named `use`, the owner's idea, worked out ([#289](https://github.com/yggi/cells/issues/289))

```text
use &bd, &sd, &hh from core_kit      # the named cells, and what they read inside the fragment
use * from core_kit                  # all of it: today's use "core kit"
use &aeolian                         # use &aeolian from aeolian: a fragment whose head is named as it is
```

- **What a named use brings:** the named cells, and the lines they read within the fragment, their closure.
  The closure's other names are the fragment's own helpers (`&bassNext` in `funk bass`): brought, but not the text's to read.
- **What it lets the compiler say**, which it can't today:
  - "the piece's `&bar` wins: `use &bar from …` adds nothing" (probe B, twice);
  - "`&cb` is not in `core_kit`: it defines `&bd`, `&rim`, `&sd` …".
- **A head named for its fragment** serves at once: `&aeolian scale(aeolian, A)` is the first scale, so every `over=key` reads it as the main key (checked).
  So `use &aeolian` is a mode, `use &rising` a motif, and the interface names (`&bar`, `key`, `&harm`, `&bassline` …) are the heads of the facets that fill them.
- **No renaming** (`as`): a kit member's name is its drum note, and a performer's name its role. Renaming waits for the first workbench that needs two fragments' same name (two keys in a modulation, two leads), as 054 ruled for qualified names.
- **Ids become words** (`core_kit`), so a bare id reads as one; most of the seeds' 51 ids have spaces, and some slashes and parentheses (`4/4 leaning on 16n`, `bossa nova clave (one bar)`). #289 chooses between renaming them, with the old ids read for a release, and keeping quoted ids beside bare ones.
- **What it gives the other readers:** Cell studio's cluster of used cells (yggi/cell-studio decision 038) draws what is named; Shorten offers the narrowest named use that holds the lines it replaces; Normalise has one spelling to write.

## 5. One model for every voice: tables, and a gate that plays a part on an instrument

cells already reads everything a note is through a table, and the performer (decision 058) plays a part on an instrument:

| what a note says | its table | written | Strudel's |
|---|---|---|---|
| which sound | a kit: a table of voices, read only to select (decision 029) | `&bd ~ &sd`, or numbers over `&kit` | `s("bd ~ sd")` |
| which pitch | a scale, a chord in force, a grid (`over=key`, `over=&harm`, `map=edo`) | degrees: `0 2 4`, `[0,2,4]` | `n("0 2 4").scale(…)` |
| how loud | a level line (`map=amp`), or a hit's own gain | `&bassLevel map=amp …`, `&sd:0:.5` | `.gain(…)`, `s("sd:0:.5")` |
| where it sounds | the instrument's voice: its register (`&bassV loop=C2`), its sound | the instrument fragment | `.sound(…)` |
| who plays it, and how | the performer: a gate, its name its role, its move, its feel | `&bass play=&bassline^$-12 level=&bassLevel &bassV` | (none: cells' own) |

The voices themselves are one kind, with three ways of sounding, already in `sound.md`:
- **struck** (`oneshot`): a drum, its note never held;
- **one at a time** (`glide=t`): a run of single notes is one note, its envelope once, as a bowed or blown line;
- **as many as written**: each note its own, a chord its notes at once.

A kit is a table of struck voices; a bass is a voice that glides or doesn't; a pad plays chords.
The register is the instrument's, and the move the performer's (058).

What isn't consistent yet, and where it goes:
- **The drums can't be played by a performer** and keep their roles ([#287](https://github.com/yggi/cells/issues/287)): a gate plays one line, and its output names that line.
  The drum lines are the drummer's limbs (kick, backbeat, hat …), which is how drummers and drum notation think; #287's option A, a gate that plays a stack of lines and keeps each line's name, generalises to a pad playing two lines.
- **Levels are Jambot's velocities to six digits** (`&bd:0:.645049` is Jambot's `levelOf(102)`, (102/127)²). A fragment should say *accent*, *ghost*, *normal*; the performer turns that into a velocity, and the feel moves it.
  That is a third table, of levels, read by a level line as a scale is read by a melody (`&kickLevel over=&dynamics 3 ~ ~ 2`). It isn't filed: #287 meets it first, and the owner ruled the per-number gain ad hoc.
- **Voicing is the performer's.** `[0,1,2]` over the chord in force is always root position; a comping player voices a chord close to the one before (voice leading), and the composer gives only the chord.
  Today Jambot spells its secondary dominants inside the stack (Bossa nova's `[2,4#,6,8,10#]`), which works but says *these degrees, raised* where a musician says *V7 of ii*. Not filed: it waits on operators on a harmony (#208).

## 6. Time: meter, rhythm, groove

- **The meter is a fragment** (`&bar meter("4/4") swing=16n:.65`), and swing lives in it (decisions 040, 042): whether the band swings is which meter it plays.
- **A rhythm taps the meter** (`step=16n`), so it fits any meter it can (decision 040): `Funk drums` on 7/8 is refused by the fit, not by a crash.
- **Groove is three things in three places**, as the research on it has them (microtiming per instrument, swing a property of the beat, the pattern the drummer's):
  the pattern (a rhythm fragment), the swing (the meter), and the feel (the performer, `contracts/feel`, per role).
  This is right as it stands; [groove-measure.md](groove-measure.md) measures the swing, the agogic and the accents of each in the Groove MIDI Dataset.
- **What is missing is only the tempo's hole** ([#290](https://github.com/yggi/cells/issues/290)).

## 7. Pitch: key, harmony, motif, phrase, form

The pitched side stops at the bar: modes, harmonies and bass lines are fragments; melodies, phrases and forms aren't.
Jambot's lead is one bar of degrees, filed by the Muse (cells holds no lead seeds: `lead-lines.ts` in yggi/jambot), and each section's lead is written out.

The language already says the levels above the bar: a splice plays its whole line at the splicing braid's rate.
This compiles, and sends the same notes at the same onsets as the two bars written out (MIDI 69 72 76 77 76 72, then 65 69 72 74 72 69):

```cells
&bar meter("4/4") step=104bpm
&key scale(dorian, D)
&call over=key step=8n 4 6 8 ~ 9 8 6 ~
&leadline step=8n &call &call^-2
&leadLevel map=amp .42
use "lead performer"
&out map=midi &lead
```

The answer is an operator on the call: the call two degrees down.
That is call and answer as blues and West African music have it, and developing variation as Schoenberg described it: the material stays one, moved.
The same braid of splices says a sentence (Caplin: an idea, the idea moved, a continuation, `&idea &idea^1 &cont`) and a song form (`&a &a &b &a`), which is the law of recursion: the form that works at the bar is the first candidate at the phrase and the section.
[#294](https://github.com/yggi/cells/issues/294) makes motifs and forms facets: a motif a line over `key`, a form a braid of holes whose answer is an operator on its call.

## 8. What is tied to Jambot

| where | what | why it binds | the issue |
|---|---|---|---|
| `src/engine/program.ts:429` | `ROLES`: drums, bass, pad, stab, lead | the compiler knows Jambot's five parts; `&violin` reads no role | [#292](https://github.com/yggi/cells/issues/292) |
| 19 seed fragments | MIDI cards on Jambot's channels (`midi(10)`, `midi(2)`) | a pattern decides where every text sends it; its names collide with the performers | [#291](https://github.com/yggi/cells/issues/291), [#285](https://github.com/yggi/cells/issues/285) |
| the rhythms' levels | Jambot's velocities to six digits | a fragment speaks in one frontend's numbers | §5, [#287](https://github.com/yggi/cells/issues/287) |
| the harmonies' `cycle=8` | eight bars, Jambot's `SECTION_BARS` | a vamp's length is a section's | not filed: a vamp of 8 bars is a fine fragment; a 12-bar blues will be another |
| Vary's operators | rotate, drop, add; transpose, invert, reverse, bend, trim | chosen for Jambot's ladder | not filed: the set is general; missing, for later, are augmentation and diminution (a motif in longer or shorter notes), sequence (a motif repeated, moved) and fragmentation (its head alone) |
| the drum line names | kick, backbeat, ghost, fill, hat, euclid, clave | Jambot's `DRUM_ROLES`; `euclid` names a technique, not a limb | not filed: they are names, any text may use others; the feel contract says which it plays |

The interface names (`&bar`, `key`, `&harm`: `INTERFACE_NAMES` in `holes.ts`) are not Jambot's: they are what every host gives a fragment, and #289 makes them the heads of the facets that define them.

## 9. The other readers

- **Cell studio** follows a section and draws it: from the text of §1 it draws 22 long lines; from a fragmented text it draws the fragments, each a cluster (decision 038 there), the performers as gates, the holes as what is open.
  The summit's "code and graph following the session" ([yggi/cell-studio#478](https://github.com/yggi/cell-studio/issues/478)) is legible only if the text keeps its structure ([yggi/jambot#498](https://github.com/yggi/jambot/issues/498)).
- **Convert to cells, the folder, Shorten** read a MIDI file into cells (decision 049).
  With named `use` and the performers, the text they write can be fragmented too: a gate per track named by the role guessed (058 §4), and a line equal to a library fragment, or an operator on one, written as its `use` (Shorten's rule, 054's rung 4, carried from kits to every facet by recognition).
  A MIDI file then lands in the repository as fragments, not as one text.
- **The analyzer** (yggi/jambot `packages/analyzer`, MIDI into the step grid) and **the Muse** hear what was played; recognition reads a heard bar as a fragment by one operator (decision 055), so the Muse can file "c1 answered the call two degrees down" as `&call^-2` of its fragment, with who and when, not as a new line ([yggi/jambot#498](https://github.com/yggi/jambot/issues/498), item 3).

## 10. The chain, written: a Funk section, fully fragmented

The forms this would take once #287 and #289–#294 are built; none is built yet, so the blocks are text, not cells.

**The repository**, seven files (one line each, as their facets ask):

```text
# meters/funk_16ths.md        facet meter       head &bar
&bar meter("4/4") step=&tempo swing=16n:.6

# modes/dorian.md             facet mode        head &dorian
&dorian scale(dorian, &tonic)

# harmony/vamp_to_the_seventh.md   facet harmony   head &harm
&harm over=key step=1m cycle=8 [0,2,4]!4 [6,8,10]!4

# rhythms/funk_drums.md       facet rhythm      the drummer's limbs; their voices are holes a kit fills
&kick step=16n &bd ~ ~ &bd ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
&backbeat step=16n ~ ~ ~ ~ &sd ~ ~ ~ ~ ~ ~ ~ &sd ~ ~ ~
&hat step=16n &hh ~ &oh ~ &hh &hh &oh ~ &hh ~ ~ ~ &hh &hh &oh ~
# (its levels as accents over a table of levels, §5; no card, #291)

# bass/funk_bass.md           facet bass        head &bassline
&bassline over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~
&bassNext over=&harm[>>] 0

# motifs/rising.md            facet motif       head &rising
&rising over=key step=8n 4 6 8 ~ 9 8 6 ~

# forms/call_and_answer.md    facet form        head &phrase
&phrase step=8n &call &call^-2
```

and the instruments and performers that exist today (`core kit`, `bass`, `lead`, `bass performer`, `lead performer`), with the drums performer of #287.

**The composer's workbench**, the section as the composer took it: what it asked for by name, and what it wrote itself.

```text
use &bar from funk_16ths
use &dorian
use &harm from vamp_to_the_seventh
use &kick, &backbeat, &hat from funk_drums
use &bassline from funk_bass
use &rising
use &phrase from call_and_answer
use * from core_kit
use &drums from drums_performer
use &bass from bass_performer
use &lead from lead_performer
&tempo step=104bpm
&tonic D
&call step=8n &rising
&leadline step=8n &phrase
&drumlines [&kick, &backbeat, &hat[<<2]]
&bassLevel map=amp .55
&leadLevel map=amp .42
&out map=midi &lead &bass ~!7 &drums
```

- Every name the text reads is defined in it, named by a use, or brought by one; nothing else is open.
- `&hat[<<2]` is the ladder's variation, written as its operator (#293): the composer tired of the hat and turned it two sixteenths.
- `&tempo` and `&tonic` fill the meter's and the mode's holes (#290); the conductor moves them, and `free()` on them would be the room it may move them in.

**What the conductor sends** (`section`, a minor of `contracts/session`: [yggi/jambot#498](https://github.com/yggi/jambot/issues/498)):

```text
{ kind: "section", bar: 9, step: 0,
  text: "<the workbench above>",
  uses: [{ id: "funk_16ths", hash: "e1:…" }, …],      # the lockfile: what each use resolved to (054)
  fragments: { "c1_answer_2026-10-26": "…" },         # the texts a client's seed library doesn't hold: learned, or the Muse's
  frame: { … }, foreseen: [ … ], cut: [] }
```

A client resolves each use from its seed library at its pin, or from `fragments`, and compiles the text the host compiled.

**What a performer plays.** The text compiles to events; `CompileResult.performers` says who plays what:

```text
[{ name: "drums", role: "drums", part: "drumlines", voices: ["kit"] },
 { name: "bass",  role: "bass",  part: "bassline", move: { transpose: -12 }, voices: ["bassV"] },
 { name: "lead",  role: "lead",  part: "leadline", voices: ["leadV"] }]
```

Each performer applies its feel by role (`contracts/feel`: the drums' accents per line, a kick 112 on the downbeat, a hat 78 on a beat, moved by the energy), and its MIDI goes out on the workbench's card.
A person who joins takes a part: the client sends `played` (`contracts/session`), a part's notes as heard.

**What the Muse files.** c1 played the lead's answer as the call three degrees down instead of two.
Recognition reads that bar as `&rising^-3`, by one operator (decision 055), so the Muse files a reference, not a line:

```text
# fragments, learned: c1_answer_2026-10-26     facet form   by: c1, bar 13, 2026-10-26T21:04
&phrase step=8n &call &call^-3
```

associated at the section's style point (decision 048).
Next time the composer asks for a form near that point, it may find c1's answer and play it back: the loop closes, and the player hears the band take up what they played.

## 11. Rungs

Each is an issue, with its bounds as numbers; the order is the shape first, then what fills it.

1. **Named `use`** ([#289](https://github.com/yggi/cells/issues/289)), decision 059 first, an amendment to 054.
2. **No cards in pattern fragments** ([#291](https://github.com/yggi/cells/issues/291)), with the bass seeds' names ([#285](https://github.com/yggi/cells/issues/285)).
3. **Value holes: the tempo and the tonic** ([#290](https://github.com/yggi/cells/issues/290)).
4. **The drums performer** ([#287](https://github.com/yggi/cells/issues/287)): a gate that plays a stack of lines and keeps each line's role, and the levels question with it.
5. **Roles are open names** ([#292](https://github.com/yggi/cells/issues/292)), an amendment to 058, with feel v1.2 (yggi/music-commons#35).
6. **Variations as references** ([#293](https://github.com/yggi/cells/issues/293)).
7. **Motifs and forms** ([#294](https://github.com/yggi/cells/issues/294)).
8. **The section text by reference** ([yggi/jambot#498](https://github.com/yggi/jambot/issues/498)): Jambot's, once 1–4 and 6 exist, with a minor of `contracts/session`.

Not filed, thought ahead: a table of levels (§5), voicing by the performer and chords spelt by function (§5, after #208), augmentation, sequence and fragmentation as operators (§8), Fold writing performers and uses (§9).
