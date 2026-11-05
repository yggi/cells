# Modular synthesis in cells: a patch is a piece

Date: 2026-11-04 · Status: a plan, its questions decided (owner, 2026-11-04): [decision 067](../decisions/067-a-module-after-its-voices.md); rungs 1–4 built (#433, #446, #457), 5 and 6 as `engine/patch.ts` (#469: the jacks with the edit, not in the graph's model while #327 is open), 7 and 8 open · Issues: the rule [#423](https://github.com/yggi/cells/issues/423) and its chain [#432](https://github.com/yggi/cells/issues/432), the modules and the piece [#457](https://github.com/yggi/cells/issues/457), the CV sum [#431](https://github.com/yggi/cells/issues/431), the probes' bugs [#424](https://github.com/yggi/cells/issues/424)–[#428](https://github.com/yggi/cells/issues/428), the central roadmap [#81](https://github.com/yggi/cells/issues/81) and its successor [#437](https://github.com/yggi/cells/issues/437); the graph's API [#327](https://github.com/yggi/cells/issues/327) · Probed at 2129a3e with the compiler and the renderer (scripts kept out of the tree; the texts are below)

The question: VCO, VCF, VCA as fragments, CV as edges, a showcase piece, modular wheels with connectors in Cell studio, and patch cables dragged in the graph, all within the paradigms there are.
The answer probed here: **cells is already a modular synthesizer; it is missing one law and a picture.**
A voice is a VCO, its `lpf=` a VCF, its `env=` a VCA; every `* &cell` in a moving parameter is a patch cable into a CV jack, and the graph's model already draws it as one (`Wire.port` the attribute, `Wire.band` `cv`, `engine/graph.ts`; the bands of [nets.md](nets.md) §3).
A fragment's signature (decision 065) is a module's panel: its optional parameters are its input jacks, each default the knob's position when nothing is patched, its main parameter the audio input, and its head the output.
What is missing is that a filter can't stand on its own, after a mix: `lpf=` on a mix does nothing (a warning). With that one law, every module but the oscillator is a fragment, and the whole patch below compiles.

## What a module is in cells, today

| module | in cells today | probed |
|---|---|---|
| VCO | a voice: `&osc s=saw loop=C2`; its `pitch=` the exponential FM input (a vibrato), `fm=` the audio FM input ([physics.md](../language/physics.md#fm)) | plays |
| VCF | a voice's `lpf=` `lpq=` `hpf=` `hpq=`, each moving: `lpf=70..4800 * &eg * &lfo`, the range the knob and the attenuator | plays, on a voice only |
| VCA | an envelope or a level in a product, or an instrument: `&vca [&eg * &level * &in]` (a mix used like a voice, [mix.md](../language/mix.md#instruments)) | plays, nested too |
| EG | a `map=adsr` cell; the seed's [envelopes](../../fragments/expression/02-envelopes.md) | plays |
| LFO | a braid turned slowly, `&lfo map=lin loop=&bar/16 sin(12)` (a bipolar wave, −1 to 1, read as a share from 0 to 1: decision 067 §5); the seed's [vibrato](../../fragments/expression/01-vibrato.md) | plays as CV, into any moving parameter or `pitch=` |
| sequencer | a stepped line, quantised by `over=&key`; a transposer as a coarser pitch held under it, `(&seq + &changes)` | plays |
| sample and hold | a stepped cell, `&sh map=lin step=8n .3 .9 .5 .2`, its values left to chance with `?` | plays |
| clock, divider | a meter and its taps (`step=16n`, `loop=&bar/8`) | plays |
| mixer | a mix, `[&a, &b * .5]` | plays |
| attenuator | a parameter's range, `lpf=lo..hi * &cv` | plays |
| CV mixer (a sum) | none: `lpf=200..3000 * (&a + &b)` is a parse error | open question 4 |

A patch cable is a reference. A cable into a CV jack is `* &cv` on a moving parameter (`engine/attributes.ts` marks each such attribute `moves`); a cable into an audio input is a reference in a mix or a fragment's main argument; a cable from a sequencer is a product's pitch and gate (nets.md: "Melody → voice carries two bands at once: gate and pitch, the way MIDI to CV does").

## The reference piece

A Berlin-school patch, *Patchbay*: two oscillators an octave apart into one resonant low-pass, its cutoff patched from a contour, the accents and a slow LFO, its resonance from a sample and hold, then a VCA, an echo; a sixteen-step sequencer in A minor transposed every two bars; a kick and a hat from a sine and white noise.

### As it must be written today

It compiles with no diagnostic and renders (33 s, dry: the echo is the renderer's stage R2, decision 062).
The VCF and the echo are written twice, once on each oscillator, since a filter belongs to a voice; the VCA is the instrument.

```cells
&bar from meter_4_4 &tempo
&thump, &click from envelopes
&tempo step=free(116bpm, 90..140)
&key scale(minor, &tonic)
&tonic A

&seq over=&key step=16n 0 7 2 7 4 7 2 9 0 7 2 7 4 11 9 7
&changes step=1m/2 0 5 3 -2
&accent map=amp step=16n 1 .4 .6 .4 .9 .4 .6 .4 1 .4 .6 .4 .9 .5 .7 .5
&contour map=adsr .002 .22 .1 .08
&sweep map=lin loop=&bar/16 sin(12)
&jitter step=8n [0|.25|.5|.75|1]
&drift loop=&bar/8 map=lin 0 .12 0
&amp map=adsr .002 .3 .5 .06

&saw s=saw loop=C2 lpf=70..4800 * &contour * &sweep lpq=4..16 * &jitter delay=.3 delaytime=8n. delayfeedback=.45
&sub s=square loop=C1 pitch=&drift lpf=70..4800 * &contour * &sweep lpq=4..16 * &jitter delay=.3 delaytime=8n. delayfeedback=.45
&mono [&amp * &saw, &amp * &sub * .5]

&kick oneshot=1 s=sine loop=A1 pitch=0..30 * &(map=adsr 0 .04 0 0) env=&thump gain=.8
&hat oneshot=1 s=white hpf=7500 env=&click gain=.25
&beat step=16n &kick &hat &hat &hat [&kick,&hat] &hat &hat &hat:0:.5

&out map=sample [(&seq + &changes) * &accent * &mono * .35, &beat]
```

### As a patch, on module fragments

The same piece, each module a line, each cable a reference: `examples/patchbay.md`, on the seed's modules (`fragments/modules/`, #457), playing the same events as the text above (`src/repository/modules.test.ts`).

```text
&sweep loop=&bar/16 from lfo
&jitter from sh
&saw s=saw loop=C2 from osc
&sub s=square loop=C1 from osc(pitch=&drift)
&vcf delay=.3 delaytime=8n. delayfeedback=.45 from lowpass(eg=&contour, cutoff=&sweep, res=&jitter) [&saw, &sub * .5]
&vca from amp(eg=&(map=adsr .002 .3 .5 .06)) &vcf
&out map=sample [(&seq + &changes) * &accent * &vca * .35, &beat]
```

The fragments, as probed (a resolver handed to `compileSource`):

```text
# lowpass: a resonant low-pass; its jacks the contour, the cutoff and the resonance, each a knob at its default
&lowpass from (&cutoff, &res, &eg) &in
&lowpass lpf=70..4800 * &eg * &cutoff lpq=4..16 * &res [&in]
&cutoff map=lin .5
&res map=lin .3
&eg map=adsr 0 0 1 0

# amp: an envelope and a level on what comes in
&amp from (&eg, &level) &in
&amp [&eg * &level * &in]
&eg map=adsr .005 .2 .7 .1
&level map=amp 1
```

`&vcf … from lowpass(…) [&saw, &sub * .5]` takes the echo's attributes on its head (decision 065 §4, as `base=` does), the mix as a new cell for its main argument (§5), and each cable as a reference argument, which is the piece's own cell (§5): a slider on `&sweep` keeps working through the module.
Expanded, it is `&vcf lpf=70..4800 * &contour * &sweep lpq=4..16 * &jitter … [&vcf_in]` with `&vcf_in [&saw, &sub * .5]`: plain cells, so Shorten, Normalise, the folder and MIDI out need nothing new.
**Both spellings must play the same events** (the patch's events with the filter distributed over its voices are the flat text's): that equality is the test rung 4 lands on.

## What the probes found

1. **A sound parameter on a mix does nothing.** `&vcf lpf=… [&saw, &sub]` warns `lpf= acts on a voice`; the VCA (an instrument with an envelope) plays. This is the one gap in the patch.
2. **…and silently, once the mix carries a sound parameter of its own.** `&vcf delay=.3 … from lowpass(…)` (the head given an attribute) compiles with no diagnostic and drops the filter: the events carry no `lpf`. A silent case (a bug to file).
3. **`&vcf lpf=800 &vco`**, a voice's braid naming a voice, compiles with no diagnostic and plays `&vcf` at C4, ignoring `&vco` (a bug to file: say it, or read it as the mix).
4. **An oscillator read as CV is silent CV.** `&lfo s=sine loop=.5` into `lpf=… * &lfo` holds the cutoff at its bottom; `&lfo loop=.5 sin(12)` sweeps it. A patcher reaches for the first. Either `s=` gives a CV cell its wave (an LFO is a VCO turned slowly: one idea, not two), or a diagnostic says to write the braid.
5. **CV at an audio rate is automation, not filter FM.** `lpf=… * &a` with `&a loop=220 sin(12)` expands to some 29 000 characters of points per note; nothing says it. A bound for a diagnostic (a CV faster than this many laps a second: choose it and name it; 30 Hz a guess).
6. **An inline envelope as an argument fails.** `vca(eg=&(map=adsr .002 .3 .5 .06))` errors `map=adsr takes four numbers`; the same as a named cell plays (065 §5–6: a bug to file).
7. **No CV sum.** `* (&a + &b)` is a parse error; products and a range cover offset, attenuation and a VCA on CV.
8. **Cell studio plays a filter per voice** (`src/audio/voice/voice.ts`: notes → grit → filters → pan → gain), as cells' renderer does: one chain per voice cell, which all its notes share (so a chord on one voice meets its distortion together, and overlapping notes share the last filter envelope). Distributing an instrument's filter over its voices needs no change to either audio engine.

## The law: a parameter on an instrument is each of its voices'

Proposed as decision 067 (the next after cells' 066 and Cell studio's 039):

- **A sound parameter on a mix used like a voice is each of its voices', where the voice sets none**, as a pitch or a volume on it already is (`x * (s + t) = x * s + x * t`, [mix.md](../language/mix.md#the-algebra-of-a-mix)).
- **Why it is a law, not a special case:** a filter, a pan and a send are linear, so filtering a sum is the sum of the filtered, exactly, when each voice's filter follows the same envelope from the same note: the patch and the flat text are one sound, not two near ones. `distort=` and `crush=` aren't linear: on an instrument they act per voice, as a polysynth's would (open question 2).
- **Where both set one**, the voice's wins (inheritance, as `base=` and 065 §4 have it), with a warning; two filters in series is a later meaning if a piece asks for it (open question 1).
- **It nests:** a VCA of a VCF of a mix distributes through each.
- **No event snapshot moves:** no example or seed fragment writes a sound parameter on a mix (searched).
- It is a minor version: a frontend sees `params` on notes it played without; the changelog says so.

## The rungs, around the piece

1. **cells: the law** (decision 067): the compiler distributes a mix's sound parameters onto its voices' notes (`paramCells` read through the instrument, `realize.ts`'s `voiceParams`), the warning retires, probe 2 and 3 become diagnostics (#424, #425). Test: the patch's expansion plays the flat text's events.
2. **cells: CV that says what it does** (probes 4–6): `s=` on a cell read as CV, or its diagnostic (#426); the audio-rate bound (#427); the inline argument fixed (#428). And the CV sum (#431).
3. **cells: the modules as fragments**, `fragments/modules/`: `lowpass`, `highpass`, `amp`, `lfo` (`&lfo from (&rate) …`, a sine on `loop=&rate`), `sh` (a stepped, chancy cell on a tap). Each a signature whose optional parameters are its jacks and whose defaults are the knobs; the EGs are the seed's envelopes; and a minimal `osc` (067 §3): `&osc from (&pitch, &fm)`, its wave and register the head's attributes (`&sub s=square loop=C1 from osc(pitch=&drift)`, probed as `vco`: it compiles). The names are 067's; `vcf`, `vca`, `vco` their associations.
4. **cells: the reference piece**, `examples/patchbay.md`, written as the patch, with its card's `postgain=` from a loudness check, its event snapshot taken, and an equality test against the flat text. The tutorial may take it as the tier where an instrument is built from modules.
5. **cells: jacks in the graph's model** (#327's module, the workbench's API): `jacksOf(result, cell)`, each port a cell offers whether patched or not: for a voice its moving attributes (`moves`), `env=`, `pitch=`, `fm=`; for a fragment's use its signature's parameters, each with its band (a reference to a sound is audio, else CV), its default and what is patched there now. Today the model has only wires that are written; a jack is a port with or without one.
6. **cells: patching as an edit** (`engine/edit.ts`, which stays cells' whatever #327 decides): `patch(source, from, cell, port)` and `unpatch(…)`, each one line rewritten. Into a fragment's jack, the argument (`lowpass(cutoff=&lfo)`, removed back to its default); into a moving parameter, a factor (`lpf=70..4800 * &eg` → `… * &eg * &lfo`; into a fixed `lpf=800`, a range of zero width, `lpf=800..800 * &lfo`, the knob plus an attenuated CV once the sum is built: 067 §4); into an audio input, a reference in the mix. Jambot gets them too.
7. **Cell studio: the module wheel, mocked up** (its `gallery` skill: a contact sheet, before anything is built). A `from` line with a signature, today a use's cluster (Cell studio's decision 038), drawn as one wheel: its face the head's own glyph (a filter's response curve, a VCA's level meter, an LFO's wave), its jacks on its rim, inputs below and the output on top as the tower lays sound upward; a patched jack takes its cable in the band's stroke (CV solid, audio a wave: the palette of nets.md §6), an unpatched one is a knob at its default, turnable (it writes the argument). A voice's CV ports are the same jacks on its own wheel.
8. **Cell studio: cables dragged** (after 5–7): drag from a wheel's output to a jack patches (rung 6's edit), the jacks of the band it can take lit while dragging; drag a cable off its jack unpatches; each drag is one line of the text, so the source-of-truth rule holds and undo is the editor's.

Rungs 1–4 are the language's and can land without the frontends; 5 and 6 are its API for them; 7 and 8 are Cell studio's, each its own issue there linking this note.

## The questions, decided

The owner's answers (2026-11-04) are [decision 067](../decisions/067-a-module-after-its-voices.md); where they differ from what this note proposed above, the decision holds.

1. A parameter on both an instrument and its voice: **in series**, the voice's first (067 §1).
2. `distort=` and `crush=` on an instrument: **on the instrument's sum**, a module after its voices with a chain of its own (067 §1–2).
3. An oscillator fragment: **yes, minimal**, named `osc` (067 §3).
4. A CV sum: **yes** (067 §3).
5. The names: **the language's words**, `osc` `lowpass` `highpass` `amp` `lfo` `sh`, one fragment a filter's kind; `vcf` and the like as associations (067 §3).
6. A cable into a fixed parameter: **at zero depth now**, `lpf=800..800 * &lfo`; **the knob plus an attenuated CV** once the sum is built (067 §4).
