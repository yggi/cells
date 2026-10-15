Moved from yggi/cell-studio docs/notes/gate-node.md @ 4036a0b; its issue numbers (#n) are Cell studio's.

# The gate node (a design note for #10)

Date: 2026-10-10 · Status: partly built: the named junction ([mix.md](../language/mix.md): a gate; `trigger=`, `velocity=`, `gate=`, `gain=`, drawn as a wheel, #264), a kit among its receivers and a gate as one MIDI part (#270); still open below: restart or resume, `map=gate`, `value=` and which receiver against what pitch · Issue: [#234](https://github.com/yggi/cell-studio/issues/234) (#10, #29, #208) · Follows [selector-gates.md](https://github.com/yggi/cell-studio/blob/main/docs/notes/selector-gates.md) and [decision 016](../decisions/016-arranging-at-the-input.md)

The owner's sketch of a junction written as a cell (`&leadOut trigger=&tune map=gate gain=.5 velocity=… &lead`) is reviewed in [selector-gates.md](https://github.com/yggi/cell-studio/blob/main/docs/notes/selector-gates.md). The owner, on the review: *only gating notes seems over-specific; a gate can gate anything. Think one-shots like a cadenza, a solo. It might work well together with the selection switch, as an orthogonal force multiplier. How do `&kit` and MIDI out fit in? They will put shape pressure on the gate node.* This note works that through. The spellings are sketches, not decisions.

## A gate gates anything

A gate node multiplies what passes through it by a gate. The gate is a signal: open or closed (or a level between), over time.

- **`gate=`** names it: a cell whose value is the gate (a section's on and off, a solo's span, a duck). Not given: always open.
- **`trigger=`** builds one: each onset opens the gate for its step's length (a note). A note gate is the special case: the gate made from a trigger.
- **The braid is what passes**: the receivers (below). `value=`, `velocity=`, `gain=` say what each event carries.

So the node is not a note-player that can also be muted; it is a gate, and a note is one way to open it.

**Where the two mechanisms may converge.** The section switch (decision 016) masks a *clock* with the selector's pattern: a gate on the sync band. The gate node masks *what a part puts out*: a gate on the audio or event band. One operation, a mask, on two bands: a clock times a gate is a clock (a tap), a sound times a gate is a sound (a VCA), events times a gate are the events let through. That is the product `*` across bands, with the band of a product its operands' (decision 006 already sorts a product's factors by what they are). If it holds, the switch is `gate × clock` and the gate node `gate × output`, and the language has one masking operation, written where it acts.

## Orthogonal: time × output

The switch says whether a part's *time* moves; the gate says whether its *output* passes. Together, four states, each a musical thing:

| tap (time) | gate (output) | what it is |
|---|---|---|
| on | open | it plays |
| off | closed | it waits, silent, in place: the tacet, without writing one |
| on | closed | it counts on in silence: a dropout, a break, a part that comes back mid-phrase (today's selector can only do this one) |
| off | open | its time stands still and it still sounds: a fermata, a held chord, a drone on the last note |

- **A cadenza**: the band's taps off with their gates open (a fermata: the chord held), the soloist's tap on, on a free clock (`step=free(…)`, rubato), its gate opened once (a one-shot: `laps=1` on the soloist), then the band's taps on again. Here the band *resumes* where it stood; it doesn't restart. So restart (decision 016, item 3) wants to be the default, with resume sayable per switch.
- **A solo**: the soloist's gate opens over a section while the others' gates fall to a level (a duck, not a cut): a gate as a level, not only 0 or 1.
- **A break**: the drums' gates closed for two bars while their taps run, so they come back on the beat.

## Kits

Today a kit is three things: a table of voices (`&kit &bd &sd &hh`), a pattern read through it (`&drums over=&kit step=&bar/2 0 2 1 2`), and a product (`[&drums * .6]`); and a fourth spelling, the groove (`&groove step=&bar/4 &bd ~ &hh`, a braid of voices, stepped) ([../language/sound.md](../language/sound.md)).

As a gate node a kit is one node with several receivers: the braid is the kit, `trigger=` the pattern, `value=` picks the member:

```
&drums trigger=&beat map=gate &bd &sd &hh        # &beat's values pick: 0 the kick, 1 the snare …
```

And the groove is the same node with its trigger its own clock and its values its own braid: a clock masked by its rests (decision 016, item 2) whose onsets are voices. So `&groove step=&bar/4 &bd ~ &hh` *is* a gate node already, in its shortest spelling. The kit isn't a third kind of thing; it is a gate node with more than one receiver.

The pressure: a kit's member picked by `value=` and a melody's pitch are both "values", and #29's kits that pass pitch want both at once (which drum, and transposed by the melody). So the node takes two values: which receiver (`value=`, an index) and what pitch (the pitch sum, as a product's `+` terms today). One value suffices for one receiver.

## MIDI out

Today MIDI out is the browser's ([../ui/midi.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/midi.md)): nothing is written into a piece; each voice gets a channel by the order it's declared, a kit's members go to channel 10. #208 proposes a MIDI card in the language (`map=midi`, its entries channels).

As a gate node, a receiver is anything that takes the node's events: a voice renders them as sound, a MIDI channel sends them. The node's output is **events** (an onset, a value, a velocity, a length), and sound is one way to render them:

```
&leadOut trigger=&tune map=gate &lead &synth2      # heard, and sent to whatever &synth2 is: doubling
&synth2 map=midi channel=2                          # a receiver that is a MIDI channel
```

That is the shape pressure: the junction stops being "a product of sounds" and becomes an **event router** whose receivers render. It is MIDI's own cut (note on and off, velocity, channel) and modular's (gate, pitch CV, velocity CV into a voice). A continuous gate on a MIDI receiver is a channel's volume (CC 7) or note-offs at the close; a kit's receivers are a drum channel's keys (the drum maps in `src/midi/drum-presets.ts`).

The rule that nothing in a piece names a device ([../ui/midi.md](https://github.com/yggi/cell-studio/blob/main/docs/ui/midi.md)) stays: a MIDI receiver names a role (`channel=2`, or a name), and this browser maps it to a port, as it maps voices to channels today.

## The node, under that pressure

| port | band | in today's product |
|---|---|---|
| `trigger=` | sync (a clock, or a pattern: a masked clock) | the melody's onsets |
| `gate=` | sync or a level | (new) a section's, a solo's, a duck's gate; open if not given |
| `value=` | CV | the melody's values: a pitch, or which receiver |
| `velocity=` | CV | a level factor |
| `gain=` | a number | a number factor |
| the braid | receivers: voices, a kit, MIDI channels | the voice |
| output | events, rendered by each receiver | sound |

The product stays its anonymous form: `[&tune * &lead * .5]` ≡ `&( trigger=&tune map=gate gain=.5 &lead )`, a cell's `&( … )` (nets decision 2). The groove is its shortest form.

## Open questions

1. **Restart or resume** per switch: restart by default (decision 016), resume for a cadenza's band. Where is it said: on the tap, the selector, or the section?
2. **A gate as 0/1 or a level**: a duck is a level; a gate of 0.3 is a gain. Is `gate=` a level, and `velocity=` and `gain=` then all one family?
3. **`map=gate`** stays, or `trigger=`/`gate=` imply it.
4. **Which receiver and what pitch** (#29 item 3): two values, `value=` an index and the pitch sum.
5. **MIDI receivers in the code** (#208): `map=midi` cells as receivers, roles mapped by the browser.
6. **Does the switch become `gate × clock`** in the spelling, so one masking operation is written everywhere (the convergence), or does the tap keep a spelling of its own?
