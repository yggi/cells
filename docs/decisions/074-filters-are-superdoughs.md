# 074 · A filter is superdough's: low-pass, high-pass and band-pass in series, `ftype=` their model, a steeper slope two stages; one 12 dB biquad when nothing says otherwise

**Date:** 2026-11-06 · **Status:** accepted (the owner on #509, 2026-11-06: "yes, as suggested") · Issues: #509, yggi/cell-studio#567 · Extends [062](062-cells-renders-audio.md) (§5, what `lpf=` and `hpf=` are) and [067](067-a-module-after-its-voices.md) (a filter on an instrument)

## Context

`lpf=` `lpq=` `hpf=` `hpq=` say a cutoff and a resonance, but not which filter.
[Decision 062](062-cells-renders-audio.md) §5 fixed one for cells' renderer: one biquad each, −12 dB an octave, superdough's first filter type.
Cell studio's voices play another: its low-pass is Tone's `Filter` at `rolloff: -24`, two biquads in series, each at the same Q.
On a resonant patch the two are far apart: the Patchbay patch of `instruments.test.ts` (`lpf=70..4800 * &eg * &lfo lpq=8`) is up to 14.8 dB from `pieceAudio` in Cell studio's 2048-sample blocks, and within 2 dB with `lpf=800` fixed and no resonance (#509).
Neither is wrong while the language doesn't say which it means.

Superdough, the reference sound (062), says it (superdough 1.3.0, `superdough.mjs` and `worklets.mjs`, read):

- **Three filters in series**, in this order: a low-pass (`lpf`, its `resonance`), a high-pass (`hpf`, `hresonance`) and a band-pass (`bpf`, its `bandf` and `bandq`), each a Web Audio biquad at its cutoff and Q.
- **One `ftype` a note**, read by all three: `12db` (0, the default), `ladder` (1) or `24db` (2).
- **`24db` is two identical biquads in series**, the second at the same cutoff and Q as the first.
- **`ladder` is another filter:** an AudioWorklet (`ladder-processor`), nonlinear, with a `drive` (.69 unless given). It is a low-pass; superdough plays it for its high-pass and band-pass too.
- Each filter has an envelope and an LFO of its own (`lpenv`, `lpattack` …, `lprate`, `lpdepth` …).

#509 asked how to say the filter, and offered three spellings: a flat word on the voice, a filter cell (`map=filter`), or suffixes per filter (`lpslope=`, `lpmodel=`).

## Decision

### 1. When nothing says otherwise, a filter is one 12 dB biquad

- **062 §5 stands:** `lpf=` and `hpf=` are one biquad each, −12 dB an octave, read as Web Audio's biquad reads them (a low- or high-pass's Q in dB). This is superdough's `12db`.
- **No text changes meaning, and no event snapshot moves.** Cell studio's 24 dB low-pass is a frontend's departure. It plays one biquad from its issue (yggi/cell-studio#567), which changes how its pieces with a resonant `lpf=` sound, towards what cells' renderer and superdough already play.

### 2. The band-pass joins: `bpf=` and `bpq=`

- **`bpf=`** is a band-pass's centre in Hz; **`bpq=`** its Q, read as Web Audio's band-pass reads its Q: linearly, the centre over the bandwidth, 1 unless given. These are superdough's `bpf`, with its `bandq` given the name `lpq=` and `hpq=` have taught.
- **The three are in series in superdough's order:** low-pass, then high-pass, then band-pass, after a voice's grit (062, R2), as they are now.
- **Each moves as the others do:** `bpf=200..3000 * &eg` glides exponentially in frequency, `bpq=` in a line.
- **Not added:** a notch, a peak, an all-pass. Superdough has none of them.

### 3. `ftype=` says their model: `12db`, `24db`, `ladder`

- **`ftype=`** is superdough's word, on any cell with filters: a voice, or an instrument (067). It is read by each of that cell's own filters, as superdough's is read by all three. It takes the words `12db` (the default), `24db` and `ladder`, and superdough's numbers for them (0, 2 and 1); Normalise writes the word.
- **On an instrument** it is that instrument's filters' model, distributed to its voices with its linear parameters where they set none, as 067 distributes `lpf=`.

### 4. A steeper slope is two stages: `24db` is a word for a composition

- **`ftype=24db` is two identical biquads in series,** each at the cell's cutoff and Q, as superdough's is. That is what [067](067-a-module-after-its-voices.md) already makes of two filters in a row: `&a lpf=800 lpq=8 [&b]` with `&b lpf=800 lpq=8 [&in]` plays `&a ftype=24db lpf=800 lpq=8 [&in]`, sample for sample, and a test says so.
- **The word stays because Strudel pieces write it;** the composition is what it means. The module fragments write a 24 dB filter out as its two stages (`lowpass24`, §6), so the patch shows where its slope comes from.
- **No other slope is a word** (superdough has none). A slope of 36 dB is three stages.

### 5. `ladder` is a model of its own, a low-pass

- **It isn't a composition of biquads:** its resonance self-oscillates and its passband dips as the resonance rises. It is superdough's ladder, ported with a lifted-from line, with its **`drive=`** (.69 unless given), in a rung of its own.
- **It is a low-pass.** Under `ftype=ladder` a cell's `lpf=` plays the ladder, and its `hpf=` and `bpf=` play their 12 dB biquads. Superdough plays its ladder for a high-pass and a band-pass too, which is a low-pass where a high-pass was asked for; cells doesn't follow it there.
- **Until its rung renders it,** a renderer says so, once a cell, and plays the 12 dB biquad in its place, as 062 has a later stage say and leave out.

### 6. Filters to patch are module fragments, not a new kind of cell

- **An instrument (067) already is the filter cell** #509's option 2 asked for: its voices share it, the graph draws it as a module, and its parameters move. A `map=filter` cell would be a second way to say what an instrument says.
- **The catalogue is `fragments/modules/`:** `lowpass` and `highpass` (067) are joined by `bandpass` and `lowpass24` (two stages), and by `ladder` with its rung.
- **No generator:** a generator writes values over time, and a filter processes a sound. Where a generator belongs it already is: the LFO that moves a cutoff (`&lfo loop=.5 sin(12)`, `lpf=… * &lfo`).
- **No per-filter envelope or LFO words** (superdough's `lpenv`, `lprate` …): a moving parameter already is a range times cells (`lpf=110..3800 * &fenv * &lfo`).

## Why

- **Superdough is the reference sound (062):** its vocabulary is cells' (decision 027), so a Strudel piece's filters mean in cells what they mean there, and a renderer that follows it plays what superdough plays.
- **A composition is the more general form.** Two stages in a row are already the language's (067), so 24 dB needs no new meaning, only a word for what exists; a slope superdough doesn't name is a stage more, not a new word.
- **The one model a composition can't make** (the ladder) is a word, as a wave is (`s=saw`), because it is a different sound, not more of one.

**Why not** `map=filter` cells: an instrument is one already (§6).
**Why not** per-filter suffixes (`lpslope=`, `lpmodel=`): a family of attributes per filter for what one `ftype=` says for three, and a third family for the band-pass.
**Why not** Cell studio's 24 dB as the default: it would change how `pieceAudio` plays every example with `lpf=`, away from superdough's default.

## Consequences

- **Rungs, each a pull request** (#509):
  1. this decision;
  2. `bpf=` `bpq=` in the language and the renderer, with the `bandpass` and `lowpass24` fragments;
  3. `ftype=` with `12db` and `24db`, and its test against two stages;
  4. `ladder`, with `drive=`.
- **No example's text or events move.** Rungs 2 and 3 add forms; nothing written today reads differently.
- **Cell studio** plays one biquad a filter (yggi/cell-studio#567), then `bpf=` and `ftype=` at the pin that carries them, or plays cells' renderer (063).
- **Jambot** plays through cells' renderer (063), so it plays each rung at its pin.
