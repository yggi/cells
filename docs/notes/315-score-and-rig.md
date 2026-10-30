# The score and the rig: what the conductor sends, what a client plays it on, and cells rendering the sound for both

Date: 2026-10-29 · Status: decided in [063](../decisions/063-the-score-and-the-band.md) (the owner's rulings of 2026-10-29 and 2026-10-30, §8 and #354), where the rig is the band (`band`); nothing here is built · Issues: [#315](https://github.com/yggi/cells/issues/315), [#354](https://github.com/yggi/cells/issues/354), [#333](https://github.com/yggi/cells/issues/333), [#81](https://github.com/yggi/cells/issues/81), [yggi/jambot#358](https://github.com/yggi/jambot/issues/358), [yggi/jambot#498](https://github.com/yggi/jambot/issues/498), [yggi/jambot#490](https://github.com/yggi/jambot/issues/490), [yggi/cell-studio#478](https://github.com/yggi/cell-studio/issues/478)

The owner (2026-10-29), on going ahead with #315:
- "jambot putting everything on a single midi card [is] an ad-hoc solution, not a proper one. let's look at a proper wire format for jambot, between host and client (and also internally, which should be a one host - one client setup); from the perspective of cells; in the triangle with cell-studio (as a streaming client to jambot and full frontend for cell-studio)."
- "the superdough-like audio rendering belongs to cells, used by jambot and cell-studio alike."
- "jambot conductor sends a 'score' to 'performer-roles', its up to the client how to fill them, by default with a default performer, exercising their free()doms in alignment with the current style vector, playing/gating an instrument/voice. (side effect: this opens sound design within jambot)"
- "in cell-studio, it should look like a 'full' stack, sliders/fields for the performers free(), default instruments pulled in via 'use'. → they should be overridable, so I can tweak instruments for a running session from jambot in cell-studio, persistent across sections, saved as a local override/variation of a default voice."

Read at cells 6fe981e, yggi/jambot f2bff23, yggi/cell-studio f18aa7a (all three on cells v0.11.2).

## 1. What travels today

**Jambot's session contract** (`contracts/session` v1.3, protocol 16; yggi/jambot `packages/session/src/protocol.ts`) carries one piece of music twice:

| message | what it is | who reads it |
|---|---|---|
| `bar` (every bar, a beat ahead) | a `WrittenBar`: Jambot's whole bar environment (seed, plan with its fragments' names, style vector, swing, `barEnergy`, chords, the Muse's offer) and the written notes, each with its part and role | Jambot's client rebuilds the bar from it; both clients take the feel's frame from it (`frameOf` in yggi/cell-studio `src/session/feel.ts`) |
| `section` (about four bars ahead, again on a change) | a cells text, every line written out (2.6 to 6.3 KB), `frame`, a digest per bar (`foreseen`) | both clients compile it; Jambot's `Shadow` lays cells' events where the digest agrees, and the band's own events in a gap |
| `played` (client to host) | a person's notes in a bar, per part | the host's Muse |

**The section text is a whole rig, flattened** (`sectionAsCells`, yggi/jambot `packages/score/src/section-text.ts`):
- the composer's lines (meter, key, harmony, drum lines, bass, pad, stab, lead), levels baked in as Jambot's velocities to six digits;
- the performers' gates (`&bassOut play=&bass level=&bassLevel &bassV`);
- voices that only hold a register (`&bassV loop=C1`, no `s=`);
- **one MIDI card whose positions are Jambot's channels**: `&out map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drums`. Pad and stab can't be told apart on it.

So what the conductor composed, who plays it, on what, and where it goes out are one text, and the last three are Jambot's own choices written into it.

**What each client does with it:**
- **Jambot** (host, client and solo) plays the text's events through `performStated` (its performer: velocity and length licences, own accents, keyed draws), then its own synth (`apps/web/src/audio/voices.ts`, `drums.ts`, a `Timbre` from the style: `timbreOf`) or MIDI out by role (lead 1, bass 2, pad and stab 3, drums 10). Solo mode serialises nothing: the host path and the client path are two paths.
- **Cell studio** re-implements Jambot's performer from the feel contract (`src/session/perform.ts`, `feel.ts`), reads each event's role from cells' `performers`, finds the channel from the MIDI card, and, to be heard at all, sounds a MIDI-card-only note at its entry's gain on Tone.js voices (its decision 039, the language's side #333). The followed piece is read-only.
- **cells** sounds nothing: an event names its voice, and each frontend decides what `s=saw lpf=900` sounds like (#315; decision 057).

Three synths (Jambot's oscillators, Cell studio's Tone.js voices, none in cells), two performers (Jambot's, Cell studio's copy), and a routing written into the score.

## 2. The split: the score is the conductor's, the rig is the client's

The chain already has the right parts. Decisions 058 and 061 made the performer a gate with a role, 054 and 059 made instruments fragments taken by `use`, 060 and #290 made values holes; [288-full-chain.md](288-full-chain.md) §3 says when each thing is bound (written, assembled, performed). What is missing is drawing the line through the text where the wire runs:

| | the **score** (the conductor's) | the **rig** (each client's) |
|---|---|---|
| what | meter, tempo, key, harmony; a part per role (`&bassline`, `&leadline`, the drum lines); the band (who plays when, 061 §2); the style vector over the bars | performers (gates, by role), the instruments they play (voices, kits), the cards: a sound card, a MIDI card, both |
| who writes it | Jambot's composer, a section at a time | a default from cells' library; overridden by whoever plays it |
| travels | yes, every section | no: local, persistent across sections |
| binds | written and assembled | performed |
| holes it leaves | the performers (by role) | the parts (by their interface names) |

**The union is `use`, as it is.** A section's score ends with one line naming the rig by an id the client resolves:

```text
# the score, as the conductor sends it (sketch)
&bar meter("4/4") step=&tempo swing=16n:.6
&tempo step=104bpm
&key scale(dorian, &tonic)
&tonic D
use &harm from vamp_to_the_seventh
use &kick, &backbeat, &hat from funk_drums
&bassline over=&harm step=16n 0 ~ ~ 0 ~ ~ 0 0 ~ ~ 0 0 ~ &bassNext &bassNext ~
&bassNext over=&harm[>>] 0
&leadline step=8n &call &call^-2
# section starting between 'funk' (80%) and 'bossa nova'
&style map=style step=1m &(.3 .45 .55 .55 .3) &(.31 .46 .54 .58 .3) … (a vector a bar, the section's length)
# section ending between 'bossa nova' (56%) and 'funk'
use * from band
```

```text
# a rig: the default one, the fragment `band` in cells' library (sketch)
&band &drums &bass &lead
use &drums from drums_performer
use &bass, &bassV from bass_performer
use &lead, &leadV from lead_performer
use * from gm_kit
&bassV s=saw loop=C2 lpf=300..1200 * <the style's artic> env=&(map=adsr .005 .2 .6 .1)
&out map=sample postgain=.8 [&drumsOut, &bassOut * .9, &leadOut * .7]
&midi map=midi &leadOut &bassOut [&padOut, &stabOut] ~!6 &drumsOut
```

**Probed at 6fe981e, with no change to the language** (a scratch run, not committed): a score of `&bar`, `&tempo`, `&key`, `&tonic`, `&bassline`, `&bassLevel`, `&artic` and `use * from rig`, compiled with a resolver that answers `rig` (the id before the owner named it `band`) with a four-line rig (`use &bassOut, &bass, &bassV from "bass performer"`, its own `&bassV s=saw loop=C2 lpf=300..1200 * &artic`, a sound card, a MIDI card with the bass on 2), and the seeds for every other id.
It compiles with no diagnostic; `performers` is `bassOut`, role `bass`, part `bassline`, moved -12; the first event is on `bassV` at 36.7 Hz (D1), heard at .9 on both channels, sent on channel 2, with `lpf` moving.

- **The resolver is the slot.** `use * from band` is the same text on every client, so `foreseen`'s digests still hold, and each client's resolver answers `band` with its own. Its head is `&band`, decision 061's table of the performers, so a score's selector over the band (`&form over=&band …`) reads the rig's players: who plays when is the score's, who they are the rig's. Nothing new in the language: a hole filled by resolution (054's resolver) where 060 fills a value hole by definition.
- **An override is a line of the rig, and the rig's lines win** over what it uses (054 §2). "Tweak the bass for this session" is the rig's own `&bassV …` line; it outlives every section because the score never defines `&bassV`, and it is saved as the rig's file, a local variation of the default, with the default's id and hash in its lockfile (054 §3).
- **The style vector reaches the sound through the text** (the owner's ruling, §8): one cell, `&style map=style`, stepped with the bar (`step=1m`) for the section's length, each step an inline cell holding that bar's vector, `&(.3 .45 .55 .55 .3)`; a comment before it and after it names the style in words, where the section starts and where it ends (`# section starting between 'funk' (80%) and 'bossa nova'`).
  - `map=style` is new (today `map=` refuses it, checked at 6fe981e); a braid of inline cells stepped by the bar already parses.
  - An instrument and a performer read an axis as any moving parameter reads a cell ([sound.md](../language/sound.md): "a range times cells"), so Jambot's `timbreOf` becomes lines of its default instruments, and a saved session replays its style.
  - The tempo stays `&tempo`, not an axis of the vector (ruled, §8).
  - Where the axes live and how the style is written were reopened by the owner the same day: §8's second round.
  - Open for 063: where the axes' names and order are stated (the vector is positional), and how a line reads one axis (`&style` picked by name or by index, against the pick `&t[i]` that today picks a step).
- **The routing is the rig's.** Jambot's channel map is its default rig's MIDI card; a person with a fifth synth gives the stab channel 4 in their rig (`&midi map=midi &leadOut &bassOut &padOut &stabOut ~!5 &drumsOut`). The single MIDI card of the section text goes, and with it the reason #333 was found (a section silent on a MIDI card alone). #333's ruling stands for every other text.
- **Open for decision 063:** a rig with no performer for a part the score writes (played as written on the built-in card, with a warning?), and a score that leaves out a part the rig's performer plays (today an undefined name; a silent performer, as a band's selector mutes one, 061 §2, would let a rig outlive sections that drop a role).

## 3. The performer's freedoms

The owner's "default performer, exercising their free()doms in alignment with the current style vector" has two halves, and they land in different places:

- **What a text can already say: knobs.** `free(default, lo..hi)` on a performer's gate or its instrument's voice (`level=free(.8, 0..1)`, `lpf=free(900, 200..4000)`) is a slider in Cell studio today (`FreeControl.svelte`), held until Keep. In a rig, Keep writes the rig, not the score.
- **What no text says: the feel.** Jambot's performer (`packages/engine/src/performer.ts`: base dynamics, the written accent, the licence of velocity and length from keyed draws, its own accents, all scaled by `feelOf(swing, entropy, artic)`) is code, specified by the hub's `contracts/feel`, and implemented twice (Jambot, Cell studio's copy). The hub's rule moves code into the core "when its second consumer needs it": Cell studio is that consumer already.

**Proposed:** the feel moves into cells as the default performer's code, lifted from Jambot's `performer.ts` with the feel contract's vectors run here, applied to a performer's events after `realize` (`perform(events, performers, frame)`). Its widths (the licence's, the own accents') become the performer's freedoms: attributes on the gate whose values may be `free(…)` and whose defaults read the style axes. That is a new attribute on a gate, so a decision, and the first question below.

## 4. The sound: cells renders, everyone plays it

#315's rulings stand (the reference sound is superdough; a mix is 24-bit PCM, stems 32-bit float; events in, samples out, in blocks; a render in chunks is the render whole). What the split adds:

- **The renderer's input is the rig's voices and the performed events.** The same blocks run offline (WAV, stems, Node, CI) and live (an AudioWorklet in Cell studio and in Jambot, the root node). One sound for a section on both clients, given the same rig.
- **Superdough is AGPL-3.0; cells, Jambot and Cell studio are MIT.** The renderer is written from superdough's documented behaviour, not its code (Jambot's ruling on #107: "dough's message format, rendered by Jambot's own synth, not dough's AGPL code", cells decision 038). Superdough can be the oracle only as a dev-only tool that never ships, as Jambot keeps `@strudel/mini` behind its license gate.
- **Jambot's sound design opens by itself:** its synth becomes cells' renderer on Jambot's default rig, so a voice is a line of text, editable as Cell studio edits it.
- **Time is absolute** (Jambot's spirit): a worklet renders what was laid ahead and never waits for a compile. Cell studio's 2 s lay-ahead (yggi/cell-studio#514) is the measure a section switch must meet with a rig expanded into each score.

## 5. One host, one client, inside Jambot too

With the rig local, a client is: the score messages in, the resolver answering `band`, compile, perform, render or send MIDI. Jambot's solo mode becomes its host and one client in one page, joined by a loopback transport that passes the same messages without a socket. Then there is one path to test (the contract's vectors), and the `bar` message's written notes, which exist for the band's fallback in a gap, can go once the score covers every bar.

**The wire, then** (a major of `contracts/session`, ruled; yggi/music-commons):
- `score` (in place of `section`): the score's text, its uses' lockfile, the texts a client's library lacks (yggi/jambot#498's two asks), `foreseen`, `cut`;
- `conduct` (in place of `bar`): per bar, its start on the host's clock and the conductor's gestures a text can't hold ahead (the seed, the Muse's offer); the style vector moves into the score's `&style`;
- `played`, `ping`/`pong`, the lobby's messages: unchanged;
- a rig never travels (ruled): the host may name the default it plays (an id and a hash), so a client playing the default sounds and sends what the host does; a client that overrides plays its own, by design.

## 6. Cell studio: the full stack, the score read-only

A followed session opens as two texts: the score, read-only, swapped each section, and the rig, editable, the default to begin with. The graph draws both; the rig's performers and instruments are its clusters of used cells (Cell studio's decision 038), their `free(…)` sliders live. An edit of a used instrument already writes its line into the text (`withUsedLine`, Cell studio `src/compile.ts`); here it writes the rig. The rig is saved in the browser and as a file (yggi/cell-studio#455's fragment store), its lockfile naming the default it varies.

## 7. The rungs

Each is an issue with its bounds as numbers; the order is the shape first. The shape rungs (1, 2) are decisions; nothing is built before the owner rules on them.

1. **Decision 062, cells renders audio** (#315 as ruled): the API, the defaults, the two invariants, the stages R1 to R3, the AGPL line.
2. **Decision 063, the score and the rig** ([#354](https://github.com/yggi/cells/issues/354); this note, as ruled): the split of §2, `use * from band` resolved by the client, `&style map=style`, the performer's freedoms as attributes on the gate (§3), the open points of §2.
3. **#333, amending 019** (ruled): a MIDI-card-only note is heard. Small, and independent of the rest.
4. **R1, the renderer** (#315 rung 3, bounds as there: the 44 R1 examples in Node with no diagnostic, chunks equal the whole, stems sum to the mix, electroswing within 1 dB of Cell studio's -24.10 dB), with `npm run render`.
5. **The default rig as fragments**: sounding instruments (`bass`, `keys`, `pad`, `lead` gain `s=` and filters reading the style axes, from Jambot's `voices.ts` and `timbreOf`), the performers' cards, and `band`, the default rig holding Jambot's five roles, its sound card and its MIDI card on channels 1, 2, 3, 10. Bound: a Jambot section played on it sends E35's corpus's MIDI (channel, note, velocity, onset, end) unchanged.
6. **The default performer in cells** (§3): the feel lifted from Jambot, feel v1.2's vectors run here. Bound: the same E35 corpus at seed 1 gives Jambot's velocities and lengths, 0 mismatched.
7. **Jambot** (its issues): the section text as a score (no gates, no voices, no card; yggi/jambot#490 and #498 meet here), the default rig resolved, solo as a loopback client, its synth replaced by cells' renderer in a worklet (after R2), `contracts/session` 2.0 with yggi/music-commons.
8. **Cell studio** (its issues): the follower plays score plus rig through cells' performer (its copy of the feel deleted), the rig editable and saved, its sliders; then its audio onto cells' renderer, parity measured per example against Tone.js.
9. **R2, R3** (#315 rung 4): the effects, then resonators and tapes.

Rungs 3 to 6 are cells', and 4 to 6 can run side by side once 1 and 2 are ruled.

## 8. The owner's rulings (2026-10-29)

1. **The feel is cells' code**: the default performer lives in cells, its widths attributes on the gate (§3). "agreed"
2. **The style vector is in the score**: "a &style-cell, stepped with the bar, length of the section, one lambda-cell with a style-vector per bar, plus a comment at the start and end with a human readable style name":

   ```text
   #section starting between 'funk' (80%) and 'bossa nova'
   &style map=style &(0.1 0.2 0.3) ...
   #section ending between 'bossa nova' (56%) and 'funk'
   ```

3. **A major of `contracts/session`**: `score` and `conduct` in place of `section` and `bar`.
4. **A rig never travels.**
5. **The rig's id is `band`.**

### The second round (the owner, later on 2026-10-29): the style's form reopened

- **The axes may move to cells**, Jambot consuming them, not owning them. Positional was "my first instinct for a short form. open to suggestions."
- **Per bar, or a start and an end?** "do we really need style per bar or can we simplify to start and end, linear interpolation in between if needed?"
- **Is `&style` the right idea?** "it is not audible, more like a label or a scope", for instance `&about style=[...] label="Jambot Session 'Mellow Pool' - … - Section 1 (Intro) - Bars 1 to 8 - close to 'Funk' - A minor - 120 BPM"`.
- **Each axis an attribute?** "it would make it very powerful, everything could declare a style-association or -wish" (`&about style['articulation']=0.7`, the syntax to be discussed), at the cost of a longer list of attributes.
- **Reading an axis is reading an envelope's value:** "how would one access the individual values of an ADSR-envelope? that would be the same."
- **Ruled:** `&tempo` stays independent, and a tempo may itself be a style-associated fragment (`use &tempo from adagio`, then the piece's `&tempo free(…)`); `&band` stays.

The options and a recommendation are on [#354](https://github.com/yggi/cells/issues/354); this round's answer is decision 063's.

Left for decision 063 ([#354](https://github.com/yggi/cells/issues/354)): the style's form (above), how a line reads one axis, and the two edges of §2 (a part with no performer, a performer with no part).
