# 062 · Cells renders audio: events in, samples out, in blocks; a parameter means what superdough says, at the level the examples were set by; a mix 24-bit, stems 32-bit float

**Date:** 2026-10-29 · **Status:** accepted (owner, 2026-10-27, on #315: "I think cells should be able to render wav, just as it is able to render MIDI"; "sample rate should be flexible and practical. overridable sane defaults"; "consider multi-track rendering, so mixing, per-voice equalizing can be done as Post-Processing steps"; then "the reference sound is Strudel's superdough"; "a mix is 24-bit PCM, stems are 32-bit float"; and, 2026-10-29: "the superdough-like audio rendering belongs to cells, used by jambot and cell-studio alike"). Then, on this decision's pull request (2026-10-29): "level: we keep cell studios numbers for now. open an issue to evaluate a migration to superdough" (#359), and "one stem per voice as a start is ok, we need both options eventually, so you can do one stem per entry also, if it is a low-risk addition" · Issues: #315, #354, #359, #333, #81, yggi/cell-studio#516, yggi/jambot#358

## Context

cells said what a voice sounds like (`s=saw lpf=900`, Strudel's and dough's words, decision 027) and left the sound to each frontend: Cell studio's Tone.js voices, Jambot's own oscillators.
It rendered a piece to MIDI (`pieceMidi`, `writeMidi`), and not to audio.
So:
- a review heard an example through a scratch checkout of Cell studio driven by Playwright (#305);
- an example's loudness, the `postgain=` the -24 dB convention sets (display.md), was measured only in a browser;
- Jambot had no way to record or stream what a session sounds like.

#315 found what each project needs from a render. The owner ruled that cells renders audio as it renders MIDI, with superdough as the reference sound. Decision 063 (#354) then makes the renderer what every client of a Jambot session plays its band on.

## Decision

### 1. The shape: events in, samples out, in blocks

- **`createRenderer(result, shifts, { sampleRate, tracks, muted })`** takes a compiled piece's voices.
  - `add(events)` gives it the notes of a window: the text's events, or what a performer played.
  - `render(frames)` returns the next frames: a stereo mix, and when asked a stem for each voice, or for each entry of the sound card.
  - An offline render is that loop. A stream is the same calls, window by window. A worklet's quantum, a socket's chunk and a file are all the same thing to it.
- **`pieceAudio(result, shifts, options)`** is `pieceMidi`'s twin. It renders the span every render takes (`spanOf`, #316) and the tail after it, and returns the mix, the stems, the diagnostics and the loudness.
- **`writeWav(channels, sampleRate, format)`** is `writeMidi`'s twin.
- **`loudness(channels)`** gives the RMS and the peak in dB below full scale, as Cell studio measures them.
- **`npm run render -- example:<key>`** writes a WAV in Node, and its stems with `--stems voices` or `--stems entries`.
- **All of it is pure:** typed arrays and arithmetic, no Web Audio. It runs alike in Node, a worker, a worklet and a page.

### 2. Two invariants, tested

- **A render in chunks of any size is the render whole, sample for sample.** So is a stream that adds each window's events as it comes.
  - The filters' coefficients are set every 32 frames, counted from the render's first frame.
  - Nothing depends on where a chunk ends.
- **The stems sum to the mix, to the bit.** The mix is the stems added in the text's order. Asking for stems moves no sample of the mix.
- **It is deterministic.** Noise is seeded and looped from a place keyed on its cell's seed, its voice and its start, as chance is (decision 031), so two renders are bit-identical.

### 3. Defaults, each overridable

| | default | range |
|---|---|---|
| sample rate | 48,000 Hz (cells' `SAMPLE_RATE`) | 8,000 to 192,000 Hz. The caller compiles at the rate it renders, so a cell reading `SAMPLE_RATE` agrees with it |
| a mix's format | 24-bit PCM | 16-bit, or 32-bit float |
| a stem's format | 32-bit float | |
| channels | stereo | |
| span | the one rule (`spanOf`): all of a piece that ends, one cycle of a loop, a tail of 2 s | `seconds`, `from`, `tail` |
| master | the sound card's `postgain=` | none. No limiter: a stem set must sum to the mix, and a limiter is a playback guard |

### 4. What a parameter means: superdough's, written from what it documents

- **Superdough (Strudel's audio engine) is AGPL-3.0, and cells is MIT.** The renderer is written from what superdough documents, never from its code. Superdough may serve as a reference to measure against only in a tool that never ships.
- **`lpf=` and `hpf=` are one biquad each, -12 dB an octave:** superdough's first filter type (`ftype` 12db, 0). Their `lpq=` and `hpq=` are read as Web Audio's biquad reads its Q for a low- or high-pass, in dB. Moving, they ramp as Cell studio's do: a frequency exponentially, a resonance in a line.
- **The waveforms** (`sine`, `tri`, `saw`, `square`) are Web Audio's built-in oscillators' harmonics, band-limited: as many harmonics as fit under the Nyquist frequency, from a table per octave. A voice with no `s=` sounds its braid as its waveform (`wave.ts`).
- **Noise** (`white`, `pink`, `brown`) is Cell studio's seeded noise, lifted.
- **The envelope is cells' own** (sound.md): `map=adsr` where the product or the voice has one, else quick and full (5 ms, 100 ms, 1, 50 ms).

### 5. The level: the scale the examples' `postgain=` were set by, for now

- **A note's peak is .35 times its level,** a noise's 2.8 times that. A voice's sum is taken at .4, then the master.
- **A note's gate is open for 90 % of its length,** a drone's for all of it. It rings out over four release times after the gate.
- **Its place comes from the balance of its two gains,** panned as Web Audio's stereo panner pans a mono note: equal power, the same loudness at every `pan=`.
- **These numbers are Cell studio's** (`src/audio/voice/voice.ts` @ f18aa7a). Kept, an example's `postgain=` keeps its meaning. Moving to superdough's own level and articulation, with every example's `postgain=` rewritten in the same change, is evaluated in #359.
- **Measured over 10 s of each of the 46 examples R1 renders with no diagnostic:**
  - 26 are within 1 dB of Cell studio’s render, 18 within .1 dB;
  - every larger difference has cells' render the quieter one;
  - the differences are Cell studio's two level errors (yggi/cell-studio#516: a zero-attack hit up to 4.7 times its level, and every voice downmixed to mono), its -24 dB low-pass where a resonance is high (`moving`, `prelude`), and decision 039's MIDI-card notes (`midi-out`).
  - Electroswing without its kick is -30.61 dB here and -31.15 dB in Cell studio.

### 6. Stages, and what isn't sounded yet

| stage | sounds | examples rendered with no diagnostic |
|---|---|---|
| **R1** (this decision's first rung) | the waveforms, a braid's own wave, noise; envelopes, volume streams, gain, pan; bends, glides, a pitch's shape; `lpf` and `hpf`, with their resonance, fixed or moving | 47 of 81 |
| **R2** | the echo (`delay=`, fixed or moving, `delaytime=`, `delayfeedback=`) and the reverb (`room=`, fixed or moving), on a voice and on an instrument, and grit (`crush=`, `distort=`) on a voice, built (#452); an instrument's grit and FM (`fm=`, `ratio=`, `index=`), to come | 51 of 83 with the echo, 64 with the reverb, 68 with grit (49 at 10e1aac) |
| **R3** | resonators (`body=` and the rest), sound tapes (`write=` and the rest) | (to measure) |

- **The echo is Cell studio's** (`src/audio/voices.ts`, `voice/voice.ts` @ 420e9d6), as R1's levels are: a voice's sound after its filters, through its send (`delay=`; .3 where it gives only `delaytime=`), into a feedback delay heard wet only (Tone's FeedbackDelay at `wet: 1`); its own at its `delaytime=` and `delayfeedback=` (.35 unless given), else the shared one, 0.375 s at .35, whatever the voice's `delayfeedback=`. An instrument's echo is one for its voices' sum (decision 067): each voice through it sends into it at the end of its chain, which, the echo being linear as a filter is, is the echo of the sum, within float rounding (-140 dB of the flat text written with an echo on each voice). A delay in a cycle is at least 128 frames, as in Web Audio, and is read between two frames where it falls between them.
  - Measured against Cell studio's render (cells v0.17.1, yggi/cell-studio 38fe7a7, 10 s and a 2 s tail at 44.1 kHz): a voice's echo, its own echo at its feedback, its own at the default send, and a moving send are each within 0.25 dB of Cell studio's, average and peak, where the same voice dry is within 0.05 dB.
- **The reverb is Cell studio's in its loudness and its decay,** not its samples: Tone's Reverb at `decay: 2.8, preDelay: .01` convolves with a burst of `Math.random` noise, new each session, so only its statistics are Cell studio's to keep. Its impulse starts 10 ms on and falls with Tone's time constant, ln(3.8) / ln(200) = 0.252 s; Chromium's convolver normalizes it, so its wet energy a channel is 2.81 · 44100² · 10^(−5.8) over the rate (0.196 at 44.1 kHz) whatever the noise. Convolving 2.8 s by sample in plain TypeScript is too slow to render live, so here it is a feedback delay network on each channel (eight lines, a Hadamard mix, each line attenuated by its own length over τ), scaled once to that wet energy, its two sides on their own channels and uncorrelated, as the convolver's two impulses are.
  - Measured against Cell studio's render (the same as the echo's): the wet energy a click adds within 0.04 dB of Cell studio's (+0.77 against +0.81 dB), pink noise's within 0.07 dB; a tone's within Cell studio's own spread from one noise to the next, or 0.2 dB past it (1.4 dB, a sine's, from seed to seed).
- **Grit is Cell studio's, curve for curve:** a voice's notes' sum through `crush=`, then `distort=`, then its filters, as Cell studio's chain has them. `crush=` rounds each sample to 2^(bits − 1) levels a side (1 to 15 bits), `distort=` is Tone's curve, (3 + k) · x · 20° / (π + k · |x|), k = 100 · amount, of 1024 points (Tone's `setMap`); each is read between its points as Web Audio's wave shaper reads a curve. Tone oversamples the distortion twice; here it is read at the render's rate.
  - Measured against Cell studio's render (the same as the echo's): each of a distorted sine, saw and square, a crushed saw and both together within 0.1 dB average; peaks within 0.25 dB but at a heavy distortion, 0.84 dB (`distort=.85`, the oversampling). Where a voice has a resonant low-pass too, the difference is R1's low-pass alone (−0.58 dB with grit and without).
- **A parameter of a later stage is said and left out,** never silently. A diagnostic names the voice and the parameter, once a voice, and the voice is rendered dry.
- **A resonator's notes** are left out, since it has no dry sound. So is a tape.
- **Clock physics** (`motor=`, belts) is time, already in the events.

### 7. What is heard

What realize says is heard: on a sound card, or on a MIDI card alone at its entry's gain ([decision 064](064-what-sounds.md), which amends 019 on this).

### 8. Stems: a voice each, or an entry of the card each

- **`tracks: 'mix'`** is the default: the mix alone.
- **`tracks: 'voices'`** gives a stem for each voice heard, in the order the text defines them, and the mix. It is the mix, sample for sample, and its stems sum to it to the bit.
- **`tracks: 'entries'`** gives a stem for each entry of the sound card, in the card's order, and the mix: each term of the card's mix (`&bassOut`, `&crackle * &vinyl * .04`), at the level the piece mixes it.
  - **Names:** a stem is named by the cells its term names (`crackle*vinyl`), a second of a name `#2`. On a card of two channels it is named by its side too (`pure*organ:left`), and it sounds on that side alone.
  - **A voice heard through several entries** is split between them by the share each gives it, channel by channel, each share through filters of its own. The stems sum to the mix to the bit. That mix differs from the plain mix only by the order of its additions (3 × 10⁻⁸ at most, over the examples measured).
  - **What it needs:** each note's output (`eventsBetween(…, true)`, as `pieceAudio` asks). The compiler records the entry each part of an output comes through (`Output.parts[].entry`). A note with no output goes to a stem `unrouted`, with a diagnostic.
- **An echo's return is a stem of its own** (`echo`, the shared one; `echo:<voice>`, a voice's own), after the voices' or the entries' stems, in the order the echoes are first sent to; the stems still sum to the mix, to the bit. A voice's stem is its dry sound.
- **Still open:** the returns of R2's other shared effects (the reverb), a track each.

## Consequences

- **cells can say how a piece sounds, in Node:**
  - an example's loudness without a browser;
  - a review's preview from `npm run render`;
  - sound-level checks beside S1.
- **No piece changes, and nothing a frontend reads moves.** The new exports are new modules (`render`, `audioexport`, `wavfile`, `noise`).
- **Cell studio** may move its export to `pieceAudio`, its call. Its live voices stay on Tone.js until a worklet runs this renderer.
- **Jambot** plays its band on this renderer through its rig, the band (decision 063, #354).
- **The examples' loudness:**
  - Pieces whose `postgain=` was set against Cell studio's inflated hits sound below -24 dB here: drums, chance, arrangement, metronome, breve, spooky, electroswing (-28.9 dB over its span).
  - Resetting their `postgain=` changes how they sound in Cell studio until yggi/cell-studio#516 is fixed. So it waits for that fix, and is its own change.

## Why not

- **Superdough itself, in cells:** it is AGPL, and it needs Web Audio, which a pure package has no access to.
- **Cell studio's sound as the reference:** it is a frontend's, and it has the two errors above. The owner ruled superdough.
- **Its levels left to each frontend:** an example's `postgain=` would then mean a different loudness in each.
