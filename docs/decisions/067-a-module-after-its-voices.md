# 067 · An instrument with sound parameters is a module after its voices; the modules are fragments, named in the language's words; a cable patched in opens at zero

**Date:** 2026-11-04 · **Status:** accepted (owner, 2026-11-04: the rule "as proposed"; on a parameter both on an instrument and its voice, "B", in series; on `distort=` and `crush=`, "B", on the instrument's sum; the names "as recommended. our names, lowpass, high pass"; a `vco` "yes, even if it's minimal"; a CV sum "yes"; a cable into a fixed parameter "C now, E later") · Issues: #423, #432, #431, #424–#428, #81 · Note: [modular.md](../notes/modular.md)

*Extends [006](006-mix-algebra.md) (a factor acting on a mix acts on each of its voices) to the sound parameters, and uses [065](065-fragments-take-arguments.md) (a signature) as a module's panel.*

## Context

Cells already plays a modular synthesizer's patch, module by module ([modular.md](../notes/modular.md), probed at 2129a3e): a voice is a VCO, its `lpf=` a VCF, an envelope or an instrument a VCA, a braid turned slowly an LFO, a stepped line quantised by `over=&key` a sequencer; each `* &cell` in a moving parameter is a cable into a CV jack, and the graph's model draws it as one (`Wire.band` `cv`).
One thing doesn't play: a filter after a mix. `&vcf lpf=800 [&saw, &sub]` warns that `lpf=` does nothing, so a patch writes its filter once per oscillator (the reference piece, *Patchbay*).
Both renderers already play one chain per voice cell (grit, filters, pan, gain), which all its notes share.

## Decision

### 1. An instrument with sound parameters is a module after its voices

- **A mix used like a voice may carry sound parameters** (`lpf=` `lpq=` `hpf=` `hpq=` `pan=` `room=` `delay=` `delaytime=` `delayfeedback=` `distort=` `crush=`), each fixed or moving, as a voice's are. Its voices play into it, and it processes their sum: `&vcf lpf=70..4800 * &eg lpq=8 [&saw, &sub * .5]`.
- **In series**: a voice's own parameters act first, then the instrument's. `&saw lpf=3000` in `&vcf lpf=800 [&saw, &sub]` goes through both filters, the sub through 800 Hz alone; a pan on both multiplies; the instrument's sends take what the voice sends on.
- **On the sum**: `distort=` and `crush=` on an instrument act on what its voices play together, as a pedal after a mixer does, so two oscillators meet in it.
- **It nests**: an instrument of an instrument is a module after a module (a VCA after a VCF after a mix).
- **Its envelopes follow its notes** as a voice's do: a moving parameter's envelope (`lpf=… * &eg`) is struck by each note that plays through the instrument, and overlapping notes share the last, as on a voice ([sound.md](../language/sound.md#articulation)).
- **What isn't a processor stays the voice's**: `s=`, `loop=`, `glide=`, `oneshot`, `fm=` on an instrument are an error, as now.

**Why it is the algebra's, not a special case:** a filter, a pan and a send are linear, so filtering the sum is the sum of the filtered, exactly, for one envelope struck by the same notes. `x * (s + t) = x * s + x * t` holds for them as it holds for a pitch and a volume, and a renderer may play them distributed. Grit isn't linear, and is the one place where the sum is not the sum of its parts: that is what a module after a mix is for.

### 2. Built in two rungs

- **First, the linear parameters, distributed** onto each voice's notes (the renderers unchanged: their voices' chains already filter), with a test that the patch plays the flat text's events. A parameter on both instrument and voice, and grit on an instrument, are said ("in series: not rendered yet", "on the sum: not rendered yet") and the voice's own is played: never silently.
- **Then the instrument's own chain** (#432), in cells' renderer and in each frontend's: its voices' sum into grit, filters, pan, gain and sends. Series and grit sound from then on.

### 3. The modules are fragments, named in the language's words

- **A module is a fragment with a signature** (065): its optional parameters its input jacks, each one's line its default, the knob's place when nothing is patched; its main parameter its audio input; its head its output. A cable is an argument: a reference argument is the piece's own cell (065 §5), so a slider on it keeps working through the module.
- **The names are the language's**, as the attributes and the seed library's words are: `osc`, `lowpass`, `highpass`, `amp`, and `lfo` and `sh` (sample and hold), which have no plainer words. One fragment a filter's kind, since a kind is a word and a parameter is a cell. The patch's vocabulary (`vco`, `vcf`, `vca`) is for the repository's association, so a query for a `vcf` finds `lowpass`.
- **`osc` is minimal**: its jacks (`&pitch`, a vibrato's or a drift's input, and `&fm`), its wave and register the head's attributes, `&sub s=square loop=C1 from osc(pitch=&drift)` (065 §4).
- **A CV sum is part of the language**: `lpf=200..3000 * (&a + &b)`, an offset plus a modulation, as a panel mixes its CV inputs (#431).

### 4. A cable patched into a fixed parameter opens at zero

An edit that patches `&lfo` into `lpf=800` writes `lpf=800..800 * &lfo`: the cable is in and its depth is zero, so nothing moves until the range is opened (in the graph, on the jack), as an attenuator turned down. No depth is made up, and the sound doesn't jump.
Once the CV sum is built (§3), the edit writes the panel's own shape, the knob plus an attenuated CV, `lpf=800 + 0..0 * &lfo` (its spelling settled with the sum).

## Why not

- **The voice's parameter wins over the instrument's** (inheritance, as `base=`): an instrument isn't a copy of its voices but what comes after them; `&saw lpf=3000` in `&vcf lpf=800 [&saw, &sub]` wouldn't be filtered by the VCF, and the law of §1 would break.
- **Grit per voice:** it keeps the algebra by definition, but it isn't a pedal after a mixer, and the oscillators never meet in it.
- **Grit refused on an instrument:** the smallest, and it leaves out the most familiar sound of a modular.
- **The patch's names** (`vcf`, `vca`): "voltage controlled" means nothing where everything is controlled by a cell; they stay findable as associations.
- **One filter with a mode:** a mode would be a word, and a parameter is a cell.
- **A cable opening at a depth of its own** (two octaves either way, or the attribute's whole range): a number nobody wrote, and a jump on patching.
- **No `osc`:** a voice is an oscillator already, but a patch drawn as modules wants every module alike, so a minimal one.

## Consequences

- No example's event snapshot moves: no example or seed fragment writes a sound parameter on a mix (searched at 2129a3e).
- A minor version: notes carry `params` from an instrument where they carried none; the changelog says so. The second rung asks each frontend for an instrument's chain (Cell studio: `src/audio/voice/voice.ts`'s chain, once more after its voices), its own issue there.
- The bugs the probes found are fixed on the way: a dropped filter said (#424), a voice in a voice's braid said (#425), an oscillator read as CV (#426), CV at an audio rate (#427), an inline argument (#428).
- The rungs that follow (the fragments in `fragments/modules/`, the reference piece `examples/patchbay.md`, jacks in the graph's model, patching as an edit, Cell studio's module wheel and dragged cables) are in the note.
