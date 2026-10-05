export interface Preset {
  /** Its title, description and tags are in its source: the first note with a title= (its card). */
  readonly source: string;
  /**
   * A fixed layout: where named cells sit, in columns (x) and rows (y, 0 at the
   * top: the sound card), pinned when the example loads. Cells not listed are
   * placed by the physics.
   */
  readonly layout?: Readonly<Record<string, readonly [number, number]>>;
}

/**
 * Examples, from one feature at a time (key and mode, rhythm, motifs, a
 * turning table, canon, sound, stereo) to the full pieces.
 */
export const PRESETS = {
  metronome: {
    source: `&about title="Metronome: any meter" tags="electronic, basics, rhythm" label="A bar and the clicks it plays. Choose the time signature and the grid — a click on every beat, eighth, sixteenth or triplet — the tempo and the swing. The bar's own steps carry their levels (the downbeat, the beats, the subdivisions): the clicks read them through a kit."
# The bar is a meter: meter(signature, steps a beat) writes it as levels — 0 the downbeat (*),
# 1 a beat (+), 2 a half (-), 3 a subdivision (.), 4 finer (,). Its bpm counts beats, however fine
# its steps. Read through &clicks (a drum kit), each level has its own sound: kick, snare, tom, hats.
&bar meter(free(2, 0..7, "2/4 3/4 4/4 5/4 6/8 7/8 9/8 12/8"), free(0, 0..3, "1 2 3 4")) step=free(100bpm, 40..208) swing=free(.5, .5...75) over=&clicks label="**{tempo}** beats a minute"
&clicks &down &beatc &half &sub &fine
&down s=sine loop=A1 penv=24 pdec=.04 env=&(map=adsr 0 .28 0 .05)
&beatc s=white hpf=1400 env=&(map=adsr 0 .09 0 .04)
&half s=sine loop=E3 penv=12 pdec=.05 env=&(map=adsr 0 .12 0 .04)
&sub s=white hpf=7000 env=&(map=adsr 0 .035 0 .02)
&fine s=white hpf=9500 env=&(map=adsr 0 .012 0 .008)
&mix level=-4.5 loop=SAMPLE_RATE map=sample [&bar * .8]`,
  },
  transpose: {
    source: `&piece title="Key and mode: one theme, two wheels" tags="classical, basics, modal, diatonic, harmony" label="One theme, read through a mode and a key: turn either, and the theme follows."
# The mechanism on its own: a theme read through two wheels.
# Tap &key or &mode and turn it — the theme follows at the next note.
&bar scan(27 23 26 24) step=free(96bpm, 60..160)

&key label="key: **{tonic}**" shift=free(0, -6..6)             # the 12: turning it (or its slider) transposes
&mode label="**{mode}** on {tonic}: {notes}" over=&key scan(2 2 1 2 2 2 1) shift=free(0, 0..6)   # C Ionian: turning it walks the modes
&theme label="the theme: {notes}" over=&mode step=&bar 0 2 4 7 4 2 0@2

&flute s=tri loop=C4 room=.3 env=&(map=adsr .02 .3 .5 .3)
&mix level=6.5 loop=SAMPLE_RATE map=sample [&theme * &flute]`,
  },
  rhythm: {
    source: `&piece title="Meter and rhythm: the tresillo" tags="world, basics, rhythm" label="The tresillo over a meter of its own, with hats, triplets and chords on the beat."
# A meter is a scan: the intervals between its beats, adding up to the bar.
# scan(27 23 26 24): beats at 0 27 50 76 % — the first long, the third leaning.
&bar scan(27 23 26 24) step=free(100bpm, 70..140)             # 4/4, bent
&tresillo label="tresillo: **x..x..x.**" scan(3 3 2) step=75bpm               # x..x..x. — its lap (8) is its bar

# volumes (map=amp) as gates: their steps start the notes, their values set the level
&kick map=amp step=&tresillo 1
&hats map=amp step=&bar/2 1 .3 .6 .3                # eighths, accented on the beat
&shake label="triplets: three against two" map=amp step=&bar*2/3 .5 .2 .2               # triplets: three per two beats
&chord label="chords: {notes}" over=scale(0,2) step=&bar*2 [0,2,4] [-2,0,2]

# each voice with its envelope (env=, map=adsr: attack decay sustain release)
&bd s=sine loop=A1 penv=24 pdec=.05 env=&(map=adsr 0 .3 0 .05)
&hh s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&sh s=white hpf=4000 env=&(map=adsr 0 .02 0 .02)
&keys s=saw loop=C4 lpf=900 env=&(map=adsr .02 .4 .3 .3)
&mix level=3 loop=SAMPLE_RATE map=sample [&kick * &bd, &hats * &hh * 0.4, &shake * &sh * 0.3, &chord * &keys * 0.5]`,
  },
  twinkle: {
    source: `&piece title="Motifs and reuse: Twinkle Twinkle" tags="classical, folk, basics, diatonic, motifs" label="Twinkle Twinkle from three motifs, one of them read a step up the scale, in solfège."
# Three motifs make the whole tune. The middle line is &down again,
# read through the scale shifted up a step (&scale[>>]).
&bar scan(27 23 26 24) step=free(96bpm, 60..160)
&scale label="**{mode}** on {tonic}" over=scale(0,5)                 # C major, as a table we can shift

&up label="*twinkle twinkle, little star*" 0 0 4 4 5 5 4@2                    # twin-kle twin-kle lit-tle star
&down label="*how I wonder what you are*" 3 3 2 2 1 1 0@2                  # how I won-der what you are
&mid label="*up above the world so high*" over=&scale[>>] &down             # up a-bove the world so high
&tune over=&scale step=&bar show=do &up &down &mid &mid &up &down    # show=do: in solfège, motifs and all

&bu 0 0 3 0
&bd 3 0 4 0
&bm over=&scale[>>] &bu                # the bass reuses the same trick
&roots over=&scale step=&bar*2 &bu &bd &bm!2 &bu &bd

&lead s=tri loop=C5 env=&(map=adsr .01 .3 .4 .3)
&bass s=sine loop=C3 env=&(map=adsr .005 .5 .5 .1)
&mix level=4 loop=SAMPLE_RATE map=sample [&tune * &lead, &roots * &bass * 0.8]`,
  },
  fifths: {
    source: `&piece title="A table that turns: the circle of fifths" tags="classical, basics, tonal, chromatic, harmony" label="A key that turns a fifth each pass: round the circle of fifths and home."
# &key turns once per pass of &tune, a fifth at a time (stride=7): C G D A E …
# Turning climbs, like every shift — cycle=12 makes it come round the circle.
&bar scan(27 23 26 24) step=free(110bpm, 80..160)
&key label="key: **{tonic}** — a fifth up each pass" step=cycle(&tune) stride=7 cycle=12
&tune over=&key step=&bar 0 4 7 12 7 4 0@2     # chromatic numbers: a major arpeggio

&pluck s=tri loop=C4 env=&(map=adsr .01 .4 .3 .3)
&mix level=7.5 loop=SAMPLE_RATE map=sample [&tune * &pluck]`,
  },
  canon: {
    source: `&piece title="Canon: Frère Jacques" tags="classical, folk, diatonic, canon" label="Frère Jacques as a round: four voices, each a bar behind the last."
# "Are you sleeping, Brother John?" as a round. One theme made of four
# two-bar units; each voice reads it one unit later: &john[<<] is the theme
# shifted back one unit, two bars behind.
&bar scan(3 3 3 3) step=free(120bpm, 80..160)
&a 0@2 1@2 2@2 0@2                     # are you sleep-ing
&b 2@2 3@2 4@4                         # bro-ther John
&c 4 5 4 3 2@2 0@2                     # morn-ing bells are ring-ing
&d 0@2 -3@2 0@4                        # ding, dang, dong
&john over=scale(0,5) step=&bar/2 &a!2 &b!2 &c!2 &d!2      # C Ionian

&v1 s=tri loop=C5 env=&(map=adsr .005 .3 .5 .2)
&v2 s=square loop=C4 lpf=1800 env=&(map=adsr .005 .3 .4 .1)
&v3 s=saw loop=C4 lpf=1200 env=&(map=adsr .005 .3 .4 .1)
&v4 s=sine loop=C3 env=&(map=adsr .005 .4 .6 .1)

&left  [&john * &v1 * 0.6, &john[<<] * &v2 * 0.4, &john[<<2] * &v3 * 0.1, &john[<<3] * &v4 * 0.8]
&right [&john * &v1 * 0.6, &john[<<] * &v2 * 0.1, &john[<<2] * &v3 * 0.4, &john[<<3] * &v4 * 0.8]
&out level=2.5 loop=SAMPLE_RATE map=sample &left &right`,
  },
  waveforms: {
    source: `&piece title="Sound: voices, waveforms, envelopes" tags="electronic, basics, sound" label="Voices made of braids: square, triangle, saw and sine, with envelopes and a vibrato."
# A voice is a cell looped at audio rate: one turn of its braid is one cycle
# of its waveform. Its pitch and its volume are cells too.
&bar scan(27 23 26 24) step=free(100bpm, 70..140)
&tune over=scale(0,5) step=&bar/2 0 2 4 7 4 2 0 ~ 4 5 7 9 7 5 4 ~
&roots over=scale(0,5) step=&bar*4 0 3 4 0

&square label="square: two values, held" loop=C4 0 1                          # held, lerped to −1…1: a square
&tri label="triangle: the same, ramped" loop=C4 map=lin 0 1                     # the same two values, ramped: a triangle
&sine label="sine: sin(12)" loop=C4 sin(12)                        # one cycle of a sine in 12 steps
&saw label="saw: 0…11, ramped" loop=C2 map=lin env=&(map=adsr .04 .3 .6 .5)   # no braid: 0…11 of the grid, ramped: a saw — with its envelope

&vibrato label="vibrato: ±0.3, gliding" map=lin loop=6 0 .3 0 -.3 0         # a pitch, added, gliding
&pluck label="a volume, per note" map=lin loop=&tune 1 .4 0             # a volume, one shape per note of &tune

# an instrument: a mix used like a voice — the saw, and a sine an octave below
&bass [&saw, &(loop=C1 sin(12)) * 0.6]

&mix loop=SAMPLE_RATE map=sample [(&tune + &vibrato) * &pluck * &square,   # try &tri or &sine
                                  &roots * &bass]`,
  },
  stereo: {
    source: `&piece title="Stereo: Mary Had a Little Lamb" tags="world, folk, basics, pentatonic, stereo" label="Mary Had a Little Lamb across two channels: a mix for each side."
# The sound card's two channels are two mixes: the same voices, balanced
# differently left and right.
&bar scan(27 23 26 24) step=free(andante)   # a tempo marking: 76–108 bpm
&high label="*Mary had a little lamb*" over=scale(0,5) step=&bar 2 1 0 1 2 2 2@2
&low over=scale(0,5) step=&bar*2 0 3 4 0

&bell s=sine loop=C5 env=&(map=adsr .01 .6 .2 .6)
&cello s=saw loop=C3 lpf=900 env=&(map=adsr .03 .4 .6 .4)
&left label="left"  [&high * &bell, &low * &cello * 0.3]
&right label="right" [&high * &bell * 0.3, &low * &cello]
&out level=1.5 loop=SAMPLE_RATE map=sample &left &right`,
  },
  lullaby: {
    source: `&piece title="Lullaby: Brahms, Wiegenlied" tags="classical, Brahms, tonal, diatonic" label="Brahms' lullaby on a music box, its notes ringing on."
# Brahms, Wiegenlied (1868). A music box over a slow 3/4. The second phrase is
# the first read a step lower (&scale[<<]): a sequence, as Brahms wrote it.
&bar scan(28 37 35) step=free(56bpm, 40..72)
&scale over=scale(0,5)                       # C major, as a table we can shift

&rock 4@3 2 2@2 4@3 2 4@2                    # lul-la-by and good night
&rise 7@2 6@3 5 5@2 4@2 1 2                  # with ro-ses be-dight
&sink over=&scale[<<] &rock                  # the first phrase, a step down
&turn 6@2 5 4@2 6 7@4 0 0
&high 7@3 5 3@2 4@3 2 0@2                    # sung twice
&home 3@2 2@2 1@2 0@4 2 2                    # … and the next pickup
&song over=&scale step=&bar/2 &rock &rise &sink &turn &high 3@2 4@2 5@2 4@4 0 0 &high &home

&roots over=&scale step=&bar*3 0!3 4!4 0 3 0 4 0 3 0 4 0

&ring map=lin loop=&song 1 .35 .1           # each note rings and fades away: a ramped volume
&box s=sine loop=C5 room=.5 env=&(map=adsr .005 .1 1 .9)
&low s=tri loop=C3 env=&(map=adsr .05 .6 .4 .6)
&mix level=7.5 loop=SAMPLE_RATE map=sample [&song * &ring * &box, &roots * &low * 0.5]
&roll scope=waterfall label="a piano roll: the tune above, its roots below" &song &roots`,
  },
  jazz: {
    source: `&piece title="Swing blues: 12 bars in C" tags="jazz, blues, rhythm" label="A 12-bar blues with swung eighths (the swing a slider): the blues scale and the minor pentatonic as scans."
# A 12-bar blues in C, swung. The eighths are a meter of their own: long, short —
# their ratio is free (1 straight, 2 the triplet swing, 3 hard). Two scales, both scans:
# the blues scale for the riff, the minor pentatonic for the turnaround.
&bar scan(1 1 1 1) step=free(132bpm, 80..220)
&swing scan(free(2, 1..3) 1) step=&bar/2               # two eighths a beat: long : short

&blues scan(3 2 1 1 3 2)                               # C Eb F F# G Bb
&penta scan(3 2 2 3 2)                                 # C Eb F G Bb
&changes loop=&bar*48 0 0 0 0 5 5 0 0 7 5 0 7          # I I I I · IV IV I I · V IV I V, a bar each

&riff 0 1 2 3 4 ~ 5 4 ~ ~ 2 1 0 ~@3                    # two bars — it stays put over the IV, as a blues riff does
&turn over=&penta 3 ~ 4 3 2 1 0 ~ 2 ~@3 1 0 ~ ~ 0 ~ 1 2 3 ~ 5 ~ 4 3 2 1 0@4
&lick over=&blues step=&swing &riff!4 &turn

&walk step=&bar 0 4 7 10                               # root, 3rd, 5th, flat 7th — moved by the changes
&comp step=&swing ~@3 [4,10] ~@3 [4,10]                # shells (3rd and 7th) on the and of 2 and 4
&ride map=amp step=&swing .9 ~ .6 .5 .9 ~ .6 .5        # ding, ding-a ding, ding-a

&horn s=saw loop=C4 lpf=1600 room=.3 env=&(map=adsr .02 .15 .6 .12)
&bass s=tri loop=C2 env=&(map=adsr .005 .25 .5 .1)
&keys s=sine loop=C4 env=&(map=adsr .005 .3 .2 .2)
&cym s=white hpf=8000 env=&(map=adsr 0 .12 0 .05)

&mix level=5 loop=SAMPLE_RATE map=sample [&lick * &horn * .5,
                                  (&walk + &changes) * &bass * .8,
                                  (&comp + &changes) * &keys * .35,
                                  &ride * &cym * .25]`,
  },
  five: {
    source: `&piece title="Five: an original tune in 5/4" tags="jazz, modal, rhythm" label="An original tune in 5/4, felt as 3 + 2, after the groove of Take Five."
# Five: an original tune in 5/4, the bar felt as 3 + 2 — after the groove of Take Five.
# It builds on the blues: the same swing meter, the minor pentatonic (here on Eb).
&bar scan(1 1 1 1 1) step=free(172bpm, 120..220)    # five beats
&swing scan(free(2, 1..3) 1) step=&bar/2           # swung eighths, as in the blues: ratio free
&penta scan(3 2 2 3 2)                             # Eb Gb Ab Bb Db (the voices sit on Eb)
&harmony loop=&bar*5 0 0 0 -5 -5                   # 3 + 2: the minor chord for three beats, the minor fifth for two

&call 4 3 2@2 0 ~ 1 2 ~@2                          # one bar of swung eighths
&answer over=&penta[>>] &call                      # … answered a step up the scale
&tune over=&penta step=&swing &call &answer &call 4 ~ 3 2 0@6

&walk step=&bar 0 3 7 -5 -2                        # a bass that walks the 3 + 2
&comp step=&swing [0,3,7]@3!2 [0,3,10]@3 [0,3,10]
&ride map=amp step=&swing .9 ~ .6 .5 .9 ~ .6 .5 .8 .4
&rim map=amp step=&bar ~ ~ .7 ~ .5                 # a click on 3 and 5: the seams of 3 + 2

&horn s=saw loop=Eb4 lpf=1400 room=.3 env=&(map=adsr .02 .15 .6 .15)
&piano s=tri loop=Eb4 env=&(map=adsr .005 .35 .15 .2)
&bass s=tri loop=Eb2 env=&(map=adsr .005 .3 .5 .1)
&cym s=white hpf=8000 env=&(map=adsr 0 .12 0 .05)
&click s=white hpf=3000 env=&(map=adsr 0 .03 0 .02)

&mix level=4 loop=SAMPLE_RATE map=sample [&tune * &horn * .45,
                                  &walk * &bass * .8,
                                  (&comp + &harmony) * &piano * .3,
                                  &ride * &cym * .22,
                                  &rim * &click * .3]`,
  },
  waltz: {
    source: `&piece title="Viennese waltz: oom-pah-pah" tags="classical, tonal, rhythm" label="A waltz in G: oom on one, pah-pah on two and three, a flute above."
# scan(28 37 35) pulls beat 2 early: short – long – long
&bar scan(28 37 35) step=free(168bpm, 140..200)
&tune over=scale(7,5) step=&bar 2 4 7 7@2 6 5@2 4 1@3 1 4 6 6@2 5 4@2 1 0@3    # G major

# oom-pah-pah: motifs with no over= read through whoever plays them
&I 0 ~ ~
&V -3 ~ ~
&oom over=scale(7,5) step=&bar &I!3 &V!4 &I
&i ~ [0,2,4]!2
&v ~ [-3,-1,1]!2
&pah over=scale(7,5) step=&bar &i!3 &v!4 &i

&flute s=tri loop=C4 room=.4 env=&(map=adsr .03 .2 .6 .3)
&tuba s=sine loop=C2 env=&(map=adsr .005 .4 0 .1)
&strings s=square loop=C4 lpf=1200 room=.5 env=&(map=adsr .02 .15 .3 .2)
&mix level=2 loop=SAMPLE_RATE map=sample [&tune * &flute, &oom * &tuba, &pah * &strings * free(.4, 0..1)]
&oompah scope=spectrum label="oom-pah: the bass and the chords, one tonal spectrum" &oom &pah`,
  },
  sailor: {
    source: `&piece title="Drunken Sailor: D Dorian, with a kit" tags="world, folk, modal, rhythm" label="Drunken Sailor in D Dorian, with a fiddle, a bass and a drum kit."
# D Dorian. The second line is the first, read one step lower (&lead[<<]).
&bar scan(3 3 3 3) step=free(112bpm, 90..140)
&lead over=scale(2,3)

&m1 4!4
&m2 4 4 0 2
&m3 3 2 0 0
&m4 0@2!2
&A over=&lead &m1 &m2
&B over=&lead[<<] &m1 &m2
&C over=&lead &m3 &m4
&tune step=&bar/2 &A &B &A &C

&b over=&lead 4@2!4 3@2!4
&bassline step=&bar/2 &b!2
&drums over=&kit step=&bar/2 0 2 1 2!4     # read through the kit: 0 kick, 1 snare, 2 hat

&fiddle s=saw loop=C5 lpf=3000 env=&(map=adsr .01 .15 .5 .1)
&bass s=square loop=C2 lpf=600 env=&(map=adsr .005 .25 0 .05)
&bd s=sine loop=A1 penv=24 pdec=.05 env=&(map=adsr 0 .3 0 .05)
&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .04)
&hh s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&kit &bd &sd &hh
&mix loop=SAMPLE_RATE map=sample [&tune * &fiddle * 0.6, &bassline * &bass * 0.8, &drums * 0.6]`,
  },
  royal: {
    source: `&piece title="Royal theme: all keys and modes" tags="classical, Bach, modal, chromatic, harmony" label="Bach's royal theme through every key in fifths, then every mode."
# Bach's royal theme. Every pass of &theme moves &key a fifth (C G D A …);
# every full circle of &key (12 passes) moves &scale one degree.
&bar scan(27 23 26 24) step=free(84bpm, 60..120)               # the clock: 4/4, bent * . + .
&key step=cycle(&theme) stride=7 cycle=12   # the 12, a fifth per pass, round the circle
&scale over=&key scan(2 1 2 2 1 2 2) step=cycle(&key) cycle=7   # Aeolian, a degree per circle, all seven

&theme over=&scale step=&bar 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2
&pedal over=&scale step=&bar*2 0              # one note every two beats

# voices: loop= is pitch 0 (turns per second); sound in dough notation
&lead s=saw loop=C4 lpf=2200 lpq=2 room=.3 env=&(map=adsr .01 .3 .4 .4) pitch=&(map=lin loop=5 0 .15 0 -.15 0)
&bass s=tri loop=C2 env=&(map=adsr .01 .5 .5 .3)

&mix level=8 loop=SAMPLE_RATE map=sample [&theme * &lead * 0.6, &pedal * &bass * 0.7]         # the sound card: two channels, the same mix`,
  },
  pertonos: {
    source: `&piece title="Canon per tonos: rising a tone a pass" tags="classical, Bach, tonal, canon" label="A canon on the royal theme that rises a whole tone each pass, as in the Musical Offering."
# After Bach, Musical Offering: "Ascendenteque Modulatione ascendat Gloria Regis".
# The royal theme on top; below it a canon at the fifth, one bar apart;
# and every pass the whole piece rises a whole tone: C D E F# G# A# …
# (Bach's design; the inner voices here are written for this example.)
&bar scan(27 23 26 24) step=free(72bpm, 56..92)
&key step=cycle(&theme) stride=2 cycle=24      # a whole tone per pass: up two octaves, then round
&scale over=&key scan(2 1 2 2 1 2 2)                  # C minor (Aeolian); 6# is the leading tone

&theme over=&scale step=&bar 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2

# the canon: five one-bar motifs, written in place; the cello reads them a bar later (&alto[<<])
&alto over=&scale step=&bar &(4 4 7 7) &(7!4) &(8 4 7 5) &(8 7 5# 3) &(8 4 8 8)

&reed s=saw loop=C4 lpf=2600 lpq=1 room=.35 env=&(map=adsr .03 .4 .6 .3) pitch=&(map=lin loop=5 0 .12 0 -.12 0)
&viola loop=C3 lpf=1400 room=.3 env=&(map=adsr .02 .3 .5 .25) 0 1
&cello s=tri loop=C2 env=&(map=adsr .01 .5 .6 .3)

# stereo: two mixes for the two channels of the sound card
&left  [&theme * &reed * 0.45, &alto * &viola * 0.3, (&alto[<<] - 7) * &cello * 0.35]
&right [&theme * &reed * 0.25, &alto * &viola * 0.12, (&alto[<<] - 7) * &cello * 0.9]
&out level=2.5 loop=SAMPLE_RATE map=sample &left &right      # the cello a bar behind, a fifth below`,
  },
  ricercar: {
    source: `&guide title="Ricercar: a study in counterpoint" tags="classical, Bach, tonal, counterpoint" label="**A study in counterpoint** on the King's theme, from strict to free — a pass each: 1 the theme alone · 2 note against note, above · 3 note against note, below · 4 two against one · 5 four against one · 6 free, in three voices. On every note of the theme the voices agree (consonances only); between, a dissonance only passes, by step."

&bar scan(27 23 26 24) step=free(66bpm, 40..96) laps=30          # thirty bars: six passes of the theme, then it ends
&theme over=&scale step=&bar label="the King's theme" 0@2 2@2 4@2 5@2 6#@2 ~ 7 6# 6 5# 5 4@2 ~@2
&scale over=&key scan(2 1 2 2 1 2 2)                   # … read in C minor,
&key step=cycle(&theme) stride=free(0, 0..7) cycle=24 label="per tonos · in **{tonic}**"   # raise stride: a key higher each pass

# the counterpoints, in semitones over the key (they transpose with the theme), in eighths
&first over=&key label="1 : 1 above — *first species*" 24@4 22@4 19@4 17@4 20@4 ~@2 19@2 20@2 22@2 24@2 20@2 22@4 ~@4
&under over=&key label="1 : 1 below — the bass" -12@4 -13@4 -12@4 -19@4 -17@4 ~@2 -19@2 -16@2 -17@2 -15@2 -13@2 -12@4 ~@4
&second over=&key label="2 : 1 — *second species*" 19@2 17@2 19@2 20@2 19@2 17@2 15@2 17@2 19@2 21@2 ~@2 19@2 20@2 19@2 21@2 17@2 15@2 14@2 ~@4
&third over=&key label="4 : 1 — *third species*" 19 17 19 20 19 17 19 21 19 20 19 21 23 21 22 24 23 21 22 20 ~@2 19 21 23 21 19 17 21 24 23 21 22 20 22 19 ~@4
&florid over=&key label="free, over the bass" 19 17 19 20 19 17 19 20 19 21 22 24 17 20 22 24 23 24 26 23 ~@2 21 24 23 21 19 22 24 22 20 22 24 22 20 19 ~@4

&upper step=&bar/2 ~@40 &first ~@40 &second &third &florid    # a pass each: alone · above · (below) · 2:1 · 4:1 · free
&lower step=&bar/2 ~@80 &under ~@80 &under                     # the bass: in pass 3, and again under the free line

&organ loop=C4 map=lin 0 1 env=&(map=adsr .03 .25 .7 .6)        # one pipe, one breath: the theme
&flute s=sine loop=C4 env=&(map=adsr .03 .1 .8 .2) pitch=&(map=lin loop=5 0 .08 0 -.08 0)
&bourdon s=tri loop=C4 lpf=900 env=&(map=adsr .02 .15 .8 .3)

&out level=10 loop=SAMPLE_RATE map=sample [&theme * &organ * .5, &upper * &flute * .45, &lower * &bourdon * .3] [
                                  &theme * &organ * .5, &upper * &flute * .25, &lower * &bourdon * .5]`,
  },
  korobeiniki: {
    source: `# Korobeiniki — the Russian folk song a famous puzzle game made its own — as a
# 1980s console would play it: pulse waves are braids, the bass a stepped triangle,
# chords are arpeggios too fast to hear apart. In the game's form: the song (A),
# then a slower middle section (B, our own), then the song again — and round.
&about title="8-bit: Korobeiniki, in Tetris form" tags="world, electronic, folk, tonal, 8-bit, arrangement" label="**Korobeiniki**, in the form of the puzzle game's music: A · A · B · B · A, and round again. A is the folk song; B, slower, in half notes, is our own. &tetris picks the parts, eight bars a step."
&bar scan(1 1 1 1) step=free(144bpm, 100..200)

&a tags="lead" 7@2 2 3 5@2 3 2 0@2 0 3 7@2 5 3                 # in A minor (A = 0); two bars
&b tags="lead" 2@3 3 5@2 7@2
&end tags="lead" 3@2 0@2 0@2 ~@2                               # … closes both halves
&c tags="lead" ~ 5@2 8 12@2 10 8 7@3 3 7@2 5 3
&d tags="lead" 2@2 2 3 5@2 7@2
&tune tags="lead" step=&bar/2 &a &b &end &c &d &end
&changes tags="harmony" loop=&bar*32 0 0 -5 0 5 0 -5 0             # Am Am E Am Dm Am E Am — a bar each

&octaves tags="bass" step=&bar/2 0 12 0 12 0 12 0 12           # the bass jumps octaves, as they did
&hold tags="harmony" step=&bar*4 0                                # one chord a bar …
&hats tags="drums" map=amp step=&bar/2 .5 .15 1 .15 .5 .15 1 .15

&pulse tags="lead" loop=A4 0 0 0 1 env=&(map=adsr .002 .05 .8 .05)              # a 25% pulse: the lead
&tri tags="bass" loop=A2 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 15 14 13 12 11 10 9 8 7 6 5 4 3 2 1 0   # a stepped triangle
&square tags="harmony" loop=A3 0 1 pitch=&(loop=20 0 3 7) env=&(map=adsr .002 .1 .7 .1)   # … arpeggiated, 60 notes a second
&noise tags="drums" s=white hpf=5000 env=&(map=adsr 0 .05 0 .02)

# B: half notes over Am and Em — our own (the game's middle section is its composer's)
&chorale tags="lead" step=&bar*2 3 2 0 -2 0 2 3 2 0 3 7 5 3 2 0@2
&changesB tags="harmony" loop=&bar*32 0 -5 0 -5 0 -5 0 0                  # Am Em Am Em Am Em Am Am
&pulse50 tags="lead" loop=A4 0 1 env=&(map=adsr .01 .1 .8 .2)              # a 50% pulse, softer: for B

# the parts, and the selector that plays them: eight bars a step, A A B B A, round again
&leadA tags="lead" [&tune * &pulse * .3]
&leadB tags="lead" [&chorale * &pulse50 * .28]
&bassA tags="bass" [(&octaves + &changes) * &tri * .6]
&bassB tags="bass" [(&octaves + &changesB) * &tri * .6]
&chordsA tags="harmony" [(&hold + &changes) * &square * .12]
&chordsB tags="harmony" [(&hold + &changesB) * &square * .12]
&drums tags="drums" [&hats * &noise * .2]
&parts &leadA &leadB &bassA &bassB &chordsA &chordsB &drums
&tetris over=&parts step=&bar*32 label="A · A · B · B · A" [0,2] [0,2,4,6] [1,3,5] [1,3,5,6] [0,2,4,6]

&out level=5 loop=SAMPLE_RATE map=sample &tetris`,
  },
  coltrane: {
    source: `&piece title="Coltrane changes: keys a major third apart" tags="jazz, Coltrane, chromatic, tonal, harmony" label="The changes of Giant Steps: three keys a major third apart, B, G and E♭, with a line of our own over them."
# The changes of Giant Steps: three keys a major third apart — B, G, Eb — round
# the octave. The key turns down a major third each bar (stride=-4); the line plays
# 1-2-3-5 in it, then the dominant of the next key. The line is our own.
&bar scan(1 1 1 1) step=free(220bpm, 140..320)
&swing scan(free(2, 1..3) 1) step=&bar/2
&key shift=-1 step=&bar*4 stride=-4 cycle=12             # B, then G, then Eb, then B …

&line over=&key step=&swing 0 2 4 7 3 7 10 13           # 1 2 3 5 · the next key's V7: 1 3 5 b7
&walk over=&key step=&bar 0 4 3 10                       # root, third · the V7's root, its fifth
&comp over=&key step=&bar*2 [4,11] [7,13]                # the maj7 shell · the V7 shell
&ride map=amp step=&swing .9 ~ .6 .5 .9 ~ .6 .5

&sax s=saw loop=C4 lpf=1800 room=.25 env=&(map=adsr .02 .12 .6 .1)
&bass s=tri loop=C2 env=&(map=adsr .005 .25 .5 .1)
&keys s=sine loop=C4 env=&(map=adsr .005 .3 .3 .2)
&cym s=white hpf=8000 env=&(map=adsr 0 .12 0 .05)

&mix level=3.5 loop=SAMPLE_RATE map=sample [&line * &sax * .4, &walk * &bass * .8, &comp * &keys * .3, &ride * &cym * .22]`,
  },
  bossa: {
    source: `&piece title="Bossa nova: the clave" tags="world, jazz, tonal, rhythm" label="A bossa nova whose guitar strums on the clave's five strokes, over Dm9 and G13."
# Bossa nova. The clave is a meter: five strokes over a bar of sixteenths,
# scan(3 3 4 3 3) — x..x..x...x..x.. — and the guitar strums on its strokes.
&bar scan(1 1 1 1) step=free(128bpm, 90..170)
&clave scan(3 3 4 3 3) step=&bar*4/5                  # five strokes a bar
&dorian scan(2 1 2 2 2 1 2)                            # D Dorian (the voices sit on D)

&rim map=amp step=&clave 1 .8 .9 1 .8
&strum step=&clave [3,7,10,14] [3,7,10,14] [3,7,10,14] [3,9,14] [3,9,14]   # Dm9 · G13, on the clave
&bassline step=&bar 0 7 -7 0                           # root and fifth: D A under Dm9, G D under G13
&shaker map=amp step=&bar/4 .5 .2 .3 .2
&melody over=&dorian step=&bar/2 4@3 3 2@2 ~@2 0 1 2@3 ~@3

&guitar s=tri loop=D3 lpf=2200 env=&(map=adsr .003 .5 .15 .3)
&bass s=sine loop=D2 env=&(map=adsr .01 .4 .5 .2)
&flute s=sine loop=D4 env=&(map=adsr .06 .2 .7 .4) pitch=&(map=lin loop=5 0 .1 0 -.1 0)
&click s=white hpf=2500 env=&(map=adsr 0 .03 0 .02)
&shh s=white hpf=6000 env=&(map=adsr 0 .03 0 .02)

&mix level=4 loop=SAMPLE_RATE map=sample [&strum * &guitar * .25, &bassline * &bass * .7, &melody * &flute * .4,
                                  &rim * &click * .3, &shaker * &shh * .12]`,
  },
  bell: {
    source: `# The West African standard bell pattern — seven strokes over twelve pulses,
# x.x.xx.x.x.x — has the same intervals as the major scale: 2 2 1 2 2 2 1.
# So one cell is both: the melody steps with the bell, and reads it as its scale.
&beat scan(1 1 1 1) step=free(100bpm, 70..140)       # four dotted-quarter beats: 12/8
&bell label="**{mode}** · x.x.xx.x.x.x" scan(2 2 1 2 2 2 1) step=&beat*4/7             # seven strokes a bar, over the twelve pulses
&why title="Bell and scale: 12/8, one scan for both" tags="world, basics, diatonic, rhythm" label="The bell, x.x.xx.x.x.x, has the major scale's intervals: 2 2 1 2 2 2 1. One scan is both — the melody steps with it, and reads it as its scale."

&strokes map=amp step=&bell 1 .5 .7 .5 .6 .5 .7      # the bell, as a rhythm
&song over=&bell step=&bell 4 4 5 4 2 1 0 2 2 1 2 0 ~ ~    # … and as a scale: C major
&drum map=amp step=&beat 1 .5 .8 .5                  # the low drum on the beats
&pulse map=amp step=&beat/3 .5 .2 .3                 # the twelve pulses

&gankogui s=square loop=C6 lpf=4000 env=&(map=adsr 0 .08 0 .05)
&voice s=tri loop=C4 env=&(map=adsr .02 .2 .6 .2)
&dundun s=sine loop=C2 penv=12 pdec=.04 env=&(map=adsr 0 .25 0 .1)
&shekere s=white hpf=6000 env=&(map=adsr 0 .03 0 .02)

&mix level=2 loop=SAMPLE_RATE map=sample [&strokes * &gankogui * .25, &song * &voice * .45,
                                  &drum * &dundun * .7, &pulse * &shekere * .15]`,
  },
  prelude: {
    source: `&piece title="Bach, Prelude in C: for Wendy" tags="classical, electronic, Bach, Wendy Carlos, tonal" label="Bach's Prelude in C (bars 1–19) as one figure reading a table of chords, on an old-school synthesizer."
# J. S. Bach, Prelude in C major (Well-Tempered Clavier I), bars 1–19 — on an
# old-school synthesizer, in homage to Wendy Carlos. The whole prelude is one
# figure reading a table of chords that turns once a bar, five notes at a time.
&bar scan(1 1 1 1) step=free(66bpm, 40..100)
&chords step=&bar*4 stride=5 cycle=95 0 4 7 12 16  0 2 9 14 17  -1 2 7 14 17  0 4 7 12 16  0 4 9 16 21  0 2 6 9 14  -1 2 7 14 19  -1 0 4 7 12  -3 0 4 7 12  -10 -3 2 6 12  -5 -1 2 7 11  -5 -2 4 7 13  -7 -3 2 9 14  -7 -4 2 5 11  -8 -5 0 7 12  -8 -7 -3 0 5  -10 -7 -3 0 5  -17 -10 -5 -1 5  -12 -8 -5 0 4
&figure over=&chords step=&bar/4 0 1 2 3 4 2 3 4      # the figure: twice a bar, in sixteenths

&saw s=saw loop=C4 lpf=1600 lpq=7 env=&(map=adsr .002 .3 .4 .25)    # a resonant sawtooth …
&sub s=square loop=C3 lpf=900 env=&(map=adsr .002 .3 .4 .25)       # … and a square an octave down
&moog [&saw, &sub * .35]

&mix level=6.5 loop=SAMPLE_RATE map=sample [&figure * &moog * .5]`,
  },
  pachelbel: {
    source: `&piece title="Pachelbel, Canon in D: a ground and three violins" tags="classical, Pachelbel, tonal, diatonic, canon" label="Eight bass notes, over and over; three violins play one line, each entering a ground later."
# Johann Pachelbel, Canon in D. Eight bass notes, over and over (the ground);
# three violins play one line, each entering two bars after the last.
&bar scan(1 1 1 1) step=free(66bpm, 40..100)
&ground step=&bar 0 -5 -3 -8 -7 -12 -7 -5                 # D A B F# G D G A — two bars, forever

# the line: three variations of two bars each (D = 0)
&line step=&bar/2 show=notes &(16@2 14@2 12@2 11@2 9@2 7@2 9@2 11@2) &(12@2 11@2 9@2 7@2 5@2 4@2 5@2 2@2) &(0 4 7 5 4 0 4 2 0 -3 0 7 5 9 7 5)

&cello s=saw loop=D3 lpf=900 env=&(map=adsr .03 .3 .7 .3)
&violin s=saw loop=D4 lpf=2600 env=&(map=adsr .08 .2 .8 .4) pitch=&(map=lin loop=5 0 .12 0 -.12 0)

# the canon: each violin is the line a variation later ([<<]); each enters a ground later
&out level=8 loop=SAMPLE_RATE map=sample [&ground * &cello * .6,
                                  &line[<<] * &(map=amp step=cycle(&ground) 0 1!11) * &violin * .35,
                                  &line[<<2] * &(map=amp step=cycle(&ground) 0 0 1!10) * &violin * .25] [
                                  &ground * &cello * .6,
                                  &line[<<2] * &(map=amp step=cycle(&ground) 0 0 1!10) * &violin * .25,
                                  &line * &(map=amp step=cycle(&ground) 0 0 0 1!9) * &violin * .35]
&parts scope=spectrum channels=split label="the ground and the canon, each its own" &ground &line`,
  },
  pop: {
    source: `&piece title="Pop song: four chords, arranged" tags="electronic, diatonic, harmony, arrangement" label="I – V – vi – IV, arranged by a selector: intro, verses, choruses, a break, an outro, an end."
# The four chords: I – V – vi – IV, a bar each, in C. Written as scale degrees
# over the major scale, each chord comes out the right kind: C, G, Am, F.
# Arranged: &song reads a table of parts, a section a step — intro, verses,
# choruses, a break, an outro and an end.
&bar scan(1 1 1 1) step=free(100bpm, 70..140)
&major scan(2 2 1 2 2 2 1)
&chords tags="keys" over=&major step=&bar/2 [0,2,4]!8 [4,6,8]!8 [5,7,9]!8 [3,5,7]!8
&roots tags="bass" over=&major step=&bar/2 0!8 4!8 5!8 3!8

&hook tags="hook" 4 4 5 4                                             # the hook …
&tune tags="hook" over=&major step=&bar/2 &hook 2@2 0@2 &hook 2@2 ~@2 &(over=&major[>>] &hook) 4@2 2@2 3 3 2 1 0@4   # … a step up in bar 3

&kick tags="drums" map=amp step=&bar 1 ~ 1 ~
&snare tags="drums" map=amp step=&bar ~ 1 ~ 1
&hats tags="drums" map=amp step=&bar/2 .5 .25 .5 .25 .5 .25 .5 .3

&lead tags="hook" s=square loop=C5 lpf=3000 env=&(map=adsr .01 .2 .6 .2) pitch=&(map=lin loop=5 0 .1 0 -.1 0)
&keys tags="keys" s=tri loop=C4 env=&(map=adsr .005 .3 .3 .2)
&bass tags="bass" s=square loop=C2 lpf=500 env=&(map=adsr .005 .15 .5 .05)
&bd tags="drums" s=sine loop=A1 penv=24 pdec=.04 env=&(map=adsr 0 .3 0 .05)
&sd tags="drums" s=white hpf=1200 env=&(map=adsr 0 .15 0 .05)
&hh tags="drums" s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)

&final tags="keys" over=&major step=&bar [0,2,4,7]@4                  # the last chord: C

# the parts, and the song that arranges them: a section (four bars) a step — a part
# picked starts from its top; a chord of parts plays them together; laps=1: it ends
&hatsPart tags="drums" [&hats * &hh * .2]
&beatPart tags="drums" [&kick * &bd * .8, &snare * &sd * .4]
&bassPart tags="bass" [&roots * &bass * .5]
&keysPart tags="keys" [&chords * &keys * .15]
&hookPart tags="hook" [&tune * &lead * .35]
&endPart tags="keys" [&final * &keys * .2]
&parts &hatsPart &beatPart &bassPart &keysPart &hookPart &endPart
&song over=&parts step=&bar*16 laps=1 label="intro · verse · verse · chorus · chorus · break · chorus · chorus · outro · end" [0,3] [0,1,2,3]!2 [0,1,2,3,4]!2 [3,4] [0,1,2,3,4]!2 [3] 5

&out level=6 loop=SAMPLE_RATE map=sample &song`,
  },
  idm: {
    source: `&piece title="IDM: drill, after Aphex Twin" tags="electronic, Aphex Twin, chromatic, rhythm" label="A breakbeat backwards every other bar, ratchets, hats seven against four; one harmony and one breath for pad, acid and lead."
# Intelligent dance music, in the manner of Aphex Twin — an original. A breakbeat
# read through a kit, every other bar its retrograde ([::-1]); ratchets (2*3: a
# sixteenth split in three); hats seven against four. One harmony for all: the
# Lydian scale turns a step every two bars, and pad, acid and lead all read it;
# one breath: a slow filter sweep moves the pad and the lead together.
&bar scan(1 1 1 1) step=free(160bpm, 110..200)
&lydian scan(2 2 2 1 2 2 1) step=&bar*8 stride=1 cycle=2 label="the harmony: **{mode}** on {tonic}"   # C, then D: a step every two bars

&pat 0 ~ 2 2*2 1 ~ 0 2 ~ 0 1 2*3 ~ 0 1*4 1*4               # 0 kick, 1 snare, 2 hat — a bar of sixteenths
&break over=&kit step=&bar/4 &pat &pat[::-1]               # … then the same bar backwards
&hats map=amp step=&bar*4/7 .6 .3 .4 .3 .5 .3 .4           # seven to the bar
&pad over=&lydian step=&bar*8 [0,2,4,6]                    # the chord, as the scale turns
&bleeps over=&lydian step=&bar/3 7 ~ 9 11 ~ 13 ~ 11 ~ ~ 9 ~ # the lead: the chord's own tones, in triplets
&acid over=&lydian step=&bar/4 0 0 7 0 ~ 0 14 ~ 0 3 0 ~ 7 0 ~ 10
&accent map=amp step=&bar/4 1 .5 .8 .5 0 .5 1 0 .6 .5 .9 0 .7 .5 0 1   # louder, and brighter

&breath map=lin loop=&bar*8 .15 1 .15                       # one breath, for pad and lead

&bd s=sine loop=A1 penv=36 pdec=.03 env=&(map=adsr 0 .2 0 .05)
&sd s=white hpf=900 env=&(map=adsr 0 .1 0 .04)
&ch s=white hpf=9000 env=&(map=adsr 0 .025 0 .01)
&kit &bd &sd &ch
&tick s=white hpf=11000 env=&(map=adsr 0 .015 0 .01)
&bleep s=tri loop=C5 lpf=800..5000 * &breath delaytime=&bar*3/4 delay=.3 delayfeedback=.4 room=.25 env=&(map=adsr .003 .12 .3 .1)
&saw303 s=saw loop=C2 lpf=150..2600 * &(map=adsr .002 .16 .12 .06) * &accent lpq=12 env=&(map=adsr .002 .12 .4 .05)
&pad1 s=saw loop=C4 lpf=500..2200 * &breath env=&(map=adsr 1.2 .5 .7 2) pitch=&(map=lin loop=.3 0 .15 0 -.15 0)

&mix loop=SAMPLE_RATE map=sample [&break * .7, &hats * &tick * .2, &bleeps * &bleep * .3,
                                  &acid * &accent * &saw303 * .4, &pad * &pad1 * .14]`,
  },
  alpha: {
    source: `&piece title="Alpha: Carlos' scale without octaves" tags="experimental, Wendy Carlos, basics, microtonal, tuning" label="Wendy Carlos' alpha scale: nine equal steps to a pure fifth, and no octave at all."
# Wendy Carlos' alpha scale: equal steps of about 78 cents, nine to a pure fifth —
# and no octave at all. Five steps make a near-pure major third (5:4), four a minor
# third (6:5), so triads ring true: 0 5 9 is major, 0 4 9 minor.
&bar scan(1 1 1 1) step=free(84bpm, 50..120)
&alpha cycle=9 map=ed(3/2)                          # nine equal steps to 3:2

&chords over=&alpha step=&bar*4 [0,5,9] [4,8,13] [9,14,18] [5,9,14]   # major · minor · major · minor
&tune over=&alpha step=&bar/2 9 14 18 14 13 8 4 8 18 23 27 23 22 18 14 9 14 18 23 18 14 13 9@2 5 9 14 18 14 9@3

&brass s=saw loop=C4 lpf=2200 lpq=3 env=&(map=adsr .04 .2 .7 .3) pitch=&(map=lin loop=5 0 .08 0 -.08 0)
&pad s=tri loop=C3 env=&(map=adsr .4 .3 .8 .8)

&mix level=7.5 loop=SAMPLE_RATE map=sample [&tune * &brass * .35, &chords * &pad * .3]`,
  },
  studie: {
    source: `&piece title="Study after Studie II: 25 steps to 5:1" tags="experimental, electronic, Stockhausen, microtonal, tuning" label="Sine mixtures on Stockhausen's scale of 25 equal steps to 5:1, with durations from the same series."
# An original study in the system of Stockhausen's Studie II (1954): sine tones on
# a scale of 25 equal steps to 5:1 from 100 Hz — not octaves — sounding as tone
# mixtures, five sines a fixed number of steps apart. The durations come from the
# same series (geo: 5^(k/25), k = 0 10 5 20 15), the intensities in decibels.
# One player goes forward, swelling; the other plays it backwards, eight steps higher, fading.
&time scan(geo(5, 25, 0 10 5 20 15)) step=free(24bpm, 12..48)  # five durations: 5^(k/25)
&dyn map=db step=&time 0 -10 -4 -16 -8                           # their intensities, in decibels
&steps cycle=25 map=ed(5)                                        # 25 steps to 5:1

# the five mixtures: five sines, 1 to 5 steps apart …
&m1 label="mixture: 1 step apart" [0,1,2,3,4]
&m2 label="mixture: 2 steps apart" [0,2,4,6,8]
&m3 label="mixture: 3 steps apart" [0,3,6,9,12]
&m4 label="mixture: 4 steps apart" [0,4,8,12,16]
&m5 label="mixture: 5 steps apart" [0,5,10,15,20]
&mixtures &m1 &m2^30 &m3^12 &m4^50 &m5^20                       # … each on its step of the scale
&forward over=&steps step=&time &mixtures
&backward over=&steps step=&time &mixtures[::-1]^8              # retrograde, eight steps higher

&swell s=sine loop=100 env=&(map=adsr 1.5 .5 .8 1.5)            # 100 Hz: the scale's first tone
&fade s=sine loop=100 env=&(map=adsr .01 1.5 .3 1.5)

&out level=15 loop=SAMPLE_RATE map=sample [&forward * &dyn * &swell * .07, &backward * &fade * .02] [
                                  &forward * &dyn * &swell * .02, &backward * &fade * .07]`,
  },
  just: {
    source: `# Just intonation: a grid of ratios. The same chords twice — on the left in just
# intonation (thirds 5/4, fifths 3/2: pure), on the right in equal temperament.
# Listen to the right one beat. And ii (D F A): its fifth, 40/27, is out of tune —
# the price of purity.
&bar scan(1 1 1 1) step=free(48bpm, 30..90)
&just label="just: {notes}" map=ratios 1 9/8 5/4 4/3 3/2 5/3 15/8 2        # C major, pure: one octave's tones, then the octave
&equal label="tempered: {notes}" scan(2 2 1 2 2 2 1)                            # C major, in equal steps

&chords [0,2,4] [3,5,7] [1,3,5] [4,6,8]               # I IV ii V, as scale degrees
&listen title="Just intonation: pure and tempered" tags="experimental, basics, microtonal, tuning, harmony" label="Left: just — thirds 5/4, fifths 3/2. Right: tempered — listen to it beat. In ii (D F A) the just fifth is 40/27: out of tune."
&pure over=&just step=&bar*4 &chords
&tempered over=&equal step=&bar*4 &chords

&organ s=saw loop=C3 lpf=1800 env=&(map=adsr .3 .3 .9 .8)
&out level=6 loop=SAMPLE_RATE map=sample [&pure * &organ * .3] [&tempered * &organ * .3]`,
  },
  bwv847: {
    source: `# J. S. Bach, Prelude and Fugue in C minor, BWV 847 (The Well-Tempered Clavier I),
# in full — on an old-school synthesizer, after Wendy Carlos' Switched-On Bach.
# The notes: the CCARH Humdrum encoding (Bach-Gesellschaft edition, vol. xiv),
# as semitones from C4, a sixteenth a step; tools/bwv847.py writes this from it.
&about title="Bach, Prelude and Fugue in C minor: for Wendy" tags="classical, electronic, Bach, Wendy Carlos, tonal, counterpoint" label="**Prelude and Fugue in C minor**, BWV 847 — in full. The prelude: one figure, twice a bar in both hands, through 24 bars of changing chords; then it breaks free — *Presto*, *Adagio*, *Allegro*. The fugue, in three voices: the subject enters in the alto, is answered by the soprano, then the bass — and returns, in every voice, through the keys."

# one tempo map for both: a sixteenth a step, each section at its pace; laps=1 — the piece ends with the fugue
&tempo scan(1!432 .72!96 2!17 .86!64 1.6!15 1.5!496) step=free(89bpm, 60..120) beat=4 laps=1 label="tempo map: ♩=108 · *Presto* · *Adagio* · *Allegro* · fugue ♩=72"
&tacetFugue ~@511
&tacetPrelude ~@624

# ---- the prelude
&figure tags="figuration" 0 1 2 1 3 1 2 1                          # the figure: top, middle, low, middle, bottom, middle, low, middle
&rhShapes tags="figuration" step=&tempo*16 stride=4 cycle=280 show=notes label="right hand: four notes a bar" 12 3 2 0 8 5 4 0 11 5 3 2 12 7 5 3 15 8 7 3 14 6 4 2 14 7 6 2 12 4 2 0 12 5 4 0 10 5 3 2 10 7 5 3 8 7 5 3 8 2 0 -2 7 -2 -4 3 5 0 -2 -3 5 2 0 -1 5 2 0 -1 3 0 -1 -5 -7 3 2 5 -6 0 -1 3 3 0 -1 -5 6 0 -1 -3 7 0 -1 2 8 0 -1 2
&lhShapes tags="figuration" step=&tempo*16 stride=4 cycle=280 show=notes label="left hand: four notes a bar" -12 -5 -7 -9 -12 -4 -5 -7 -12 -4 -5 -7 -12 -9 -10 -5 -12 0 -2 -4 -12 -3 -5 -6 -14 -2 -3 -5 -14 -5 -7 -8 -16 -4 -5 -7 -16 -10 -12 -7 -17 -9 -10 -5 -12 -9 -10 -4 -10 -7 -9 -4 -9 -5 -7 -4 -9 -3 -5 -7 -10 -7 -9 -4 -12 -7 -8 -4 -12 -9 -10 -7 -16 -12 -13 -10 -15 -9 -10 -12 -17 -9 -10 -7 -17 -9 -10 -12 -17 -9 -10 -7 -17 -9 -10 -7
&rhFigure tags="right hand" over=&rhShapes label="bars 1–24, right hand: the figure, twice a bar" &figure!48
&lhFigure tags="left hand" over=&lhShapes label="bars 1–24, left hand" &figure!48
&rhBars tags="right hand" label="right hand · bars 25–27" ~@48
&rhPresto tags="right hand" label="right hand · *Presto*" ~ 14 12 14 15 12 11 12 9 12 11 12 14 11 9 11 7 11 9 11 12 9 7 9 6 9 7 9 11 7 6 7 2 19 17 19 20 17 15 17 14 17 15 17 19 15 14 15 12 15 14 15 17 14 12 14 11 14 12 14 15 12 11 12 7 12 11 12 8 17 15 17 7 15 14 15 5 14 12 14 3 12 11 12 8 5 3 5 7 3 2 3 5 2 0 2
&rhAdagio tags="right hand" label="right hand · *Adagio*" -8 1 -2 -5 0 -4 -7 -4 -5 -2 -5 -8 -4 -7 -10 -7 ~
&rhAllegro tags="right hand" label="right hand · *Allegro*, to the end" ~ -24@15 ~@24 -24@24
&lhBars tags="left hand" label="left hand · bars 25–27" -17 -13 -10 -7 -4 -7 -8 -7 -1 -7 2 -1 -4 -7 -8 -7 -17 -12 -9 -5 0 -5 -6 -5 3 0 7 3 0 -4 -5 -4 -17 -15 -6 0 3 0 -1 0 6 0 9 6 3 0 -1 0
&lhPresto tags="left hand" label="left hand · *Presto*" -17@17 2 0 2 3 0 -1 0 -3 0 -1 0 2 -1 -3 -1 -5 -1 -3 -1 0 -4 -5 -4 -7 -3 -5 -3 -1 -5 -7 -5 -9 7 5 7 8 5 3 5 2 5 3 5 7 3 2 3 0 3 2 3 5 2 0 2 3 0 -1 0 2 -1 -3 -1 0 3 2 3 -7 2 0 2 -9 0 -1 0 -10 -1 -3 -1
&lhAdagio tags="left hand" label="left hand · *Adagio*" -12@4 ~@4 -12@4 ~@5
&lhAllegro tags="left hand" label="left hand · *Allegro*, to the end" ~@64
&rh tags="right hand" step=&tempo label="prelude · right hand" &rhFigure &rhBars &rhPresto &rhAdagio &rhAllegro &tacetFugue
&lh tags="left hand" step=&tempo label="prelude · left hand" &lhFigure &lhBars &lhPresto &lhAdagio &lhAllegro &tacetFugue

# ---- the fugue: its subject and countersubject (as the alto first has them), entered at their transpositions —
#      exact entries in place (&subject^-12: an octave down), bent ones written out
&subject tags="subject" show=notes label="the subject" 12 11 12@2 7@2 8@2 12 11 12@2 14@2 7@2 12 11 12@2 14@2 5 7 8@4 7 5 3
&counter tags="subject" show=notes label="the countersubject" 11 9 7 5 3 2 0@2 15@2 14@2 12@2 10@2 9@2 10@2 12@2 6@2 7@2
&s3s tags="soprano" label="bar 3 · **answer**\\nsoprano, a fifth up (bent)" 19 18 19@2 12@2 15@2 19 18 19@2 21@2 14@2 19 18 19@2 21@2 12 14 15@4 14 12 10@2
&soprano1 tags="soprano" label="soprano · free, bars 5–7" 15 14 15@2 7@2 8@2 17 15 17@2 9@2 10@2 19 17 19@2 11@2 12@2 14 15 17@6
&c7s tags="soprano" label="bar 7 · **countersubject**\\nsoprano, a fourth up (bent)" 15 14 12 10 8 7 5@2 20@2 19@2 17@2 15@2 14@2 15@2 17@2 11@2 12@2
&soprano2 tags="soprano" label="soprano · free, bars 8–11" 14@2 11@2 12@2 19 18 19@2 14@2 15@4 ~@2 16@2 17@2 17 16 17@2 12@2 14@4 ~@2 14@2 15@2
&s11s tags="soprano" label="bar 11 · **subject**\\nsoprano, in E♭ major (bent)" 15 14 15@2 10@2 12@2 15 14 15@2 17@2 10@2 15 14 15@2 17@2 8 10 12@4 10 8 7
&soprano3 tags="soprano" label="soprano · free, bars 13–15" 3 5 7 8 10 12 14 15 14 12 14 15 17 19 21 22 5 7 8 10 12 14 16 17 15 14 15 17 19 21 23 24@2
&soprano4 tags="soprano" label="soprano · free, bars 15–20" 23 21 19 17 15 14 12@2 15@2 14@2 12@2 10@2 9@2 10@2 12@2 6@2 7@2 9@2 6@2 7@2 14 12 14@2 ~@4 16 14 16@2 ~@4 18 16 18@2 ~@4 7 5 7@2 ~@4 9 7 9@2 ~@4 11 9 11@2 ~@4
&s20s tags="soprano" label="bar 20 · **subject**\\nsoprano, as first heard (held longer)" 12 11 12@2 7@2 8@2 12 11 12@2 14@2 7@2 12 11 12@2 14@2 5 7 8@4 7 5 3@2
&soprano5 tags="soprano" label="soprano · free, bars 22–26" 12 11 12@2 7@2 8@4 ~@2 9@2 10@2 10 9 10@2 5@2 7@4 ~@2 7@4 8 10 12 11 12 8 5@10 14 12 14@2 5@2 3@2 15 14 15@2 7@2 5@2 17 15 17@2 8@2 7 17
&soprano6 tags="soprano" label="soprano · free, bars 26–29" 15 14 12 11 9 7 12@2 17@2 15@2 14@2 ~@2 8@2 7@2 5@2 7@2 5 3 5@2 2@2 8@2 7@2 ~@2 9@2 11@2 12@2 5 3 2 0 0@2
&s29s tags="soprano" label="bar 29 · **subject**\\nsoprano, as first heard (bent)" 12 11 12@2 7@2 8@2 12 11 12@2 [11,14]@2 7@2 12 11 12@2 14@2 5 7 8@4 7 5 4@8
&alto1 tags="alto" label="alto · free, bar 3" 12
&alto2 tags="alto" label="alto · free, bars 4–7" 9@2 6@2 7@4 ~ 0 2 3 5 7 8@3 2 3 5 7 9 10@3 3 5 7 8 7 5 3 2@2 12 11 12@4
&alto3 tags="alto" label="alto · free, bars 7–11" ~@6 17@2 15@2 14@2 ~@2 8@2 7@2 5@2 7@2 5 3 5@2 2@2 7@4 ~@2 11@2 12@2 12 11 12@2 7@2 8@4 ~@2 9@2 10@2 10 9 10@2 5@2 7@4
&alto4 tags="alto" label="alto · free, bars 11–15" ~@2 7@2 8@2 8@2 7@2 5@2 ~@2 -4@2 -2@2 0@2 ~@2 -4 -5 -4@2 -7@2 -2@2 0@2 -2@2 -4@2 -2@2 -5@2 -7@2 -9@2 -7@2 1@2 0@2 -2@2 0@2 -4@2 -5@2 -7@2 -5@2
&s15a tags="alto" label="bar 15 · **subject**\\nalto, a fourth down (bent)" 7 6 7@2 0@2 3@2 7 6 7@2 9@2 2@2 7 6 7@2 9@2 0 2 3@4 2 0 -2@2
&alto5 tags="alto" label="alto · free, bars 17–20" ~@3 2 4 6 7 9 10@3 4 5 7 9 10 12@3 6 7 9 10@2 3 2 3@2 -5@2 -4@2 5 3 5@2 -3@2 -2@2 7 5 7@2 -1@2 0 5
&c20a tags="alto" label="bar 20 · **countersubject**\\nalto, a fifth down (bent)" 3 2 0 -2 -4 -5 -7@2 8@2 7@2 5@2 3@2 2@2 3@2 5@2 -1@2 0@2
&alto6 tags="alto" label="alto · free, bars 21–26" 2@2 -1@2 0@4 ~@2 4@2 5@2 5 4 5@2 0@2 2@4 ~@2 2@2 3@2 3 2 3@2 -2@2 0@10 2 3 5 3 5 2 -1@2 ~@4 -1@2 0@2 ~@4 3@2 2@2 ~@4 5@4
&alto7 tags="alto" label="alto · free, bars 26–29" ~@4 5@2 3@2 8@2 7@2 5@2 3@2 2@2 3@2 5@2 -1@2 0@2 2@2 -1@2 -1@2 0@2 ~@2 0@2 5 2 3 0@3 -1@2 0@4
&alto8 tags="alto" label="alto · free, bars 29–31" ~@2 4@2 5@4 ~@2 [5,8]@2 5@2 3 2 3@2 [5,8]@2 [-1,2]@2 ~@2 [-1,2]@2 ~@2 [-5,0]@8
&bass1 tags="bass" label="bass · free, bars 9–11" 0 -1 -3 -5 -7 -9 -10 -12 -10 -9 -10 -12 -14 -16 -17 -19 -2 -4 -5 -7 -9 -10 -12 -14 -12 -10 -12 -14 -16 -17 -19 -21 -4
&bass2 tags="bass" label="bass · free, bars 11–15" -5 -7 -9 -11 -12 -14 -16@2 0@2 -2@2 -4@2 -5@2 -7@2 -5@2 -4@2 -10@2 -9@2 -7@2 -10@2 -9@2 -4@2 -5@2 -7@2 -5@2 -9@2 -10@2 -12@2 -10@2 -2@2 -4@2 -5@2 -4@2 -7@2 -9@2 -10@2 -9@2
&bass3 tags="bass" label="bass · free, bars 15–20" ~@8 -12@2 -14@2 -15@2 ~@2 -9@2 -10@2 -12@2 -10@2 -12 -14 -12@2 -10@2 -17@2 -2 -3 -2@2 -10@2 -9@2 0 -2 0@2 -8@2 -7@2 2 0 2@2 -6@2 -5@4 ~ -17 -15 -13 -12 -10 -9@3 -15 -14 -12 -10 -9 -7@3 -13 -12 -10 -9@2
&bass4 tags="bass" label="bass · free, bars 20–26" ~@4 -8@2 -7@2 -19@2 -21@2 -22@2 ~@2 -16@2 -17@2 -19@2 -17@2 -19 -21 -19@2 -17@2 -12 -10 -9 -10 -12 -14 -16 -17 -19 -2 -4 -5 -7 -9 -10 -12 -14 -12 -10 -12 -14 -16 -17 -19 -21 -4 -5 -7 -9 -10 -12 -14 -16 -14 -12 -14 -16 -17 -19 -21 -22 -5 -7 -9 -10 -12 -13 -15 -17@4 ~@5 -17 -15 -13 -12 -10 -9 -7 -5 -7 -4 -5 -7 -9 -10 -12 -13@2
&s26b tags="bass" label="bar 26 · **subject**\\nbass, two octaves down (held longer)" -12 -13 -12@2 -17@2 -16@2 -12 -13 -12@2 -10@2 -17@2 -12 -13 -12@2 -10@2 -19 -17 -16@4 -17 -19 -21@4
&bass5 tags="bass" label="bass · free, bars 28–31" ~@2 -9@2 -10@2 -12@2 -5@2 -17@2 [-24,-12]@40
&soprano tags="soprano" step=&tempo label="fugue · soprano" &tacetPrelude ~@2 ~@32 &s3s &soprano1 &c7s &soprano2 &s11s &soprano3 &soprano4 &s20s &soprano5 &soprano6 &s29s
&alto tags="alto" step=&tempo label="fugue · alto" &tacetPrelude ~@2 &subject &alto1 &counter &alto2 &alto3 &alto4 &s15a &alto5 &c20a &alto6 &alto7 &alto8
&bass tags="bass" step=&tempo label="fugue · bass" &tacetPrelude ~@2 ~@32 ~@64 &subject^-12 &bass1 &bass2 &bass3 &bass4 &s26b &bass5

# the synthesizer: a voice for each line, as Carlos gave each its own patch
&saw s=saw loop=C4 lpf=2600 lpq=6 env=&(map=adsr .002 .15 .45 .12)
&pulse loop=C4 lpf=1800 env=&(map=adsr .002 .15 .5 .1) 0 0 0 1
&reed s=square loop=C4 lpf=2000 env=&(map=adsr .01 .2 .6 .15) pitch=&(map=lin loop=5 0 .1 0 -.1 0)
&brass s=saw loop=C4 lpf=1500 lpq=4 env=&(map=adsr .02 .2 .7 .15)
&moog s=saw loop=C4 lpf=700 lpq=10 env=&(map=adsr .005 .25 .5 .1)

&out level=10 loop=SAMPLE_RATE map=sample [&rh * &saw * .3, &lh * &pulse * .12, &soprano * &reed * .25, &alto * &brass * .12, &bass * &moog * .2] [
                                  &rh * &saw * .12, &lh * &pulse * .3, &soprano * &reed * .1, &alto * &brass * .22, &bass * &moog * .3]`,
  },
  acid: {
    source: `# Acid-Cell — everybody needs a 303. An original acid line: a saw through a resonant
# low-pass whose envelope opens on every note — further on the accents — while a hand
# turns the cutoff and the resonance, slowly (all of it lpf=… * &cells). Echo: a dotted eighth.
&about title="Acid-Cell: everybody needs a 303" tags="electronic, chromatic, sound" label="**Acid-Cell** — everybody needs a 303. Every note opens the filter (&fenv); accents open it further, and play louder (&accent); the knobs turn slowly (&knob, &res). Listen to the resonance squeal as they meet."
&bar scan(1 1 1 1) step=free(126bpm, 100..150)
&minor scan(2 1 2 2 1 2 2)                                   # A minor (the voices sit on A)

&riff 0 0 7 0 ~ 0 4 0 6 ~ 0 7 0 2 3 4                      # a bar of sixteenths
&turn 0 0 7 0 ~ 7 6 4 2 ~ 0 4 6 7 9 7                      # … and its answer
&line over=&minor step=&bar/4 &riff &turn &riff &riff^-2   # the last bar a whole tone down
&accent map=amp step=&bar/4 1 .4 .8 .4 0 .4 1 .4 .6 0 .4 1 .4 .5 .4 .4
&fenv map=adsr .003 .18 .1 .06 label="filter envelope"
&knob map=lin loop=&bar*16 .2 1 .35 .2 label="cutoff knob"
&res map=lin loop=&bar*32 6 19 6 label="resonance knob"

&kick map=amp step=&bar 1 1 1 1
&clap map=amp step=&bar ~ 1 ~ 1
&closed map=amp step=&bar/4 .3 .2 .5 .2
&open map=amp step=&bar/2 ~ .5

&tb303 s=saw loop=A2 lpf=110..3800 * &fenv * &accent * &knob lpq=&res delaytime=&bar*3/4 delay=.22 delayfeedback=.35 env=&(map=adsr .002 .15 .6 .05)
&bd s=sine loop=A1 penv=30 pdec=.04 env=&(map=adsr 0 .3 0 .05)
&cp s=white hpf=1500 env=&(map=adsr 0 .12 0 .06) room=.2
&hh s=white hpf=8000 env=&(map=adsr 0 .03 0 .02)
&oh s=white hpf=7000 env=&(map=adsr 0 .2 0 .1)

&mix loop=SAMPLE_RATE map=sample [&line * &accent * &tb303 * .45, &kick * &bd * .8, &clap * &cp * .35,
                                  &closed * &hh * .25, &open * &oh * .2]`,
  },
  zell: {
    source: `# Zelluläre Aktivität — in the manner of Kraftwerk, an original. Am – F – C – G, two
# bars each. The bass's octaves move through the chords by transposing (&oct^-4: four
# semitones down, F); the arpeggio by reading the scale shifted (over=&minor[>>5]: the
# same shape on its sixth step) — chromatic and diatonic, side by side. A slow filter
# sweep over the arpeggio; a plain melody with echoes in time.
&about title="Zelluläre Aktivität" tags="electronic, Kraftwerk, diatonic, arrangement" label="**Zelluläre Aktivität**\\nIt builds, layer by layer (&lied reads the parts, eight bars a step), and ends. Am – F – C – G. Bass: octaves, transposed (^n). Arpeggio: one shape, read on the chord's step of the scale. Melody: plain, with echoes in time (delaytime=&bar)."
&bar scan(1 1 1 1) step=free(112bpm, 90..140)
&minor scan(2 1 2 2 1 2 2)                                   # A minor (the voices sit on A)

&oct tags="bass" 0 12 0 12 0 12 0 12                                     # Oktaven: a bar of eighths
&bassline tags="bass" step=&bar/2 label="Bass: Oktaven" &oct!2 &oct^-4!2 &oct^3!2 &oct^-2!2   # A · F · C · G

&shape tags="arpeggio" 0 2 4 7                                               # a chord's tones, up (degrees)
&am tags="arpeggio" over=&minor &shape!4
&f tags="arpeggio" over=&minor[>>5] &shape!4                                 # the same shape on F
&c tags="arpeggio" over=&minor[>>2] &shape!4                                 # … on C
&g tags="arpeggio" over=&minor[>>6] &shape!4                                 # … on G
&arp tags="arpeggio" step=&bar/4 label="Arpeggio" &am!2 &f!2 &c!2 &g!2
&sweep tags="arpeggio" map=lin loop=&bar*16 .1 1 .1

&melody tags="melody" over=&minor step=&bar label="Melodie" 4@2 2 1 0@4 5@2 4 2 4@4 2@2 1 0 1@4 6@2 4 3 4@4

&kick tags="beat" map=amp step=&bar 1 ~ 1 ~
&snare tags="beat" map=amp step=&bar ~ 1 ~ 1
&ticks tags="beat" map=amp step=&bar/4 .5 .2 .3 .2 .5 .2 .3 .6

&bass tags="bass" s=square loop=A1 lpf=600 env=&(map=adsr .005 .12 .5 .05)
&arpeggio tags="arpeggio" s=square loop=A3 lpf=300..4000 * &sweep lpq=4 env=&(map=adsr .002 .1 .2 .05)
&lead tags="melody" s=saw loop=A4 lpf=2200 delaytime=&bar delay=.3 delayfeedback=.3 room=.2 env=&(map=adsr .03 .2 .7 .2)
&bd tags="beat" s=sine loop=A1 penv=24 pdec=.05 env=&(map=adsr 0 .25 0 .05)
&sd tags="beat" s=white hpf=1200 env=&(map=adsr 0 .14 0 .05)
&metal tags="beat" s=square loop=A7 hpf=5000 env=&(map=adsr 0 .03 0 .02)

# Aufbau: the parts, and the song that stacks them — eight bars (the progression) a step
&ticksPart tags="beat" [&ticks * &metal * .12]
&beatPart tags="beat" [&kick * &bd * .8, &snare * &sd * .35]
&bassPart tags="bass" [&bassline * &bass * .5]
&arpPart tags="arpeggio" [&arp * &arpeggio * .18]
&melodyPart tags="melody" [&melody * &lead * .3]
&teile &ticksPart &beatPart &bassPart &arpPart &melodyPart
&lied over=&teile step=&bar*32 laps=1 label="Aufbau: Klick · Bass · Takt · Arpeggio · Melodie · Pause · alles · Klick" 0 [0,2] [0,1,2] [0,1,2,3] [0,1,2,3,4] [2,3] [0,1,2,3,4] 0

&out level=14 loop=SAMPLE_RATE map=sample &lied`,
  },
  cellscape: {
    source: `&piece title="Cellscape" tags="electronic, modal, ambient, canon, arrangement" label="A cycle of twelve scenes, each a fifth from the last, and home. A drone that breathes through its filter, a sequenced arpeggio under a slow sweep, a canon at the octave, bells drifting out of tune, a pulse, a glass shimmer. One score, read once for each ear."
# Cellscape — an ambient cycle of twelve, after Bach (the canon, the circle of keys)
# and Kraftwerk (the sequence, the filters). Every layer reads one Lydian scale, and
# the scale's key turns a fifth with each scene: C G D A E B F# C# G# D# A# F, and home.
&bar scan(1 1 1 1) step=free(72bpm, 50..96)
&key step=&bar*32 stride=7 cycle=12 label="**{tonic}**, a fifth each scene"
&lydian over=&key scan(2 2 2 1 2 2 1) label="{mode} on {tonic}"

# slow hands on the filters
&breath tags="drone" map=lin loop=&bar*24 .1 1 .3 .1
&sweep tags="sequence" map=lin loop=&bar*16 .1 .9 .2

# the layers
&pad tags="drone" over=&lydian step=&bar*8 label="drone: an open ninth" [0,4,6,9]
&arp tags="sequence" over=&lydian step=&bar/4 label="the sequence" 0 4 6 9 7 4 2 4
&m1 tags="canon" 0@2 2@2 4@3 6
&m2 tags="canon" 7@2 4@2 6@3 4                           # against &m1: octaves and thirds only (they stay consonant turned upside down)
&melody tags="canon" over=&lydian step=&bar label="canon: the leader" &m1 &m2
&canon tags="canon" over=&lydian step=&bar label="canon: the follower, an octave down, two bars behind" &melody[<<]^-12
&bells tags="bells" over=&lydian step=&bar label="bells" ~@3 11 ~@4 9 ~@3 13 ~@5 11 ~@4 6 ~@6 ~@2
&pulse tags="pulse" over=&lydian step=&bar/2 label="pulse" 0 ~ 0 0 ~ 0 0 ~
&shimmer tags="glass" over=&lydian step=&bar*16 label="glass" [11,13]

&padv tags="drone" s=saw loop=C3 lpf=280..2400 * &breath lpq=3 room=.45 env=&(map=adsr 2 1 .8 3) pitch=&(map=lin loop=.13 0 .08 0 -.08 0)
&arpv tags="sequence" s=square loop=C4 lpf=240..3400 * &sweep lpq=7 delaytime=&bar*3/4 delay=.35 delayfeedback=.45 env=&(map=adsr .002 .12 .2 .08)
&voiceA tags="canon" s=tri loop=C5 lpf=2600 room=.35 env=&(map=adsr .05 .3 .7 .6)
&voiceB tags="canon" s=saw loop=C5 lpf=1500 room=.4 env=&(map=adsr .08 .3 .7 .8)
&bell tags="bells" s=sine loop=C5 room=.6 delaytime=&bar*3/2 delay=.4 delayfeedback=.5 env=&(map=adsr .005 1.2 0 2.5) pitch=&(map=lin loop=.07 0 .3 0 -.3 0)
&bass tags="pulse" s=tri loop=C2 lpf=400..1400 * &breath env=&(map=adsr .005 .2 .4 .1)
&glass tags="glass" s=sine loop=C5 room=.7 env=&(map=adsr 3 1 .7 4) pitch=&(map=lin loop=.11 0 .25 0 -.25 0)

# the score: which layers play in each of the twelve scenes (0 drone 1 sequence 2 leader
# 3 follower 4 bells 5 pulse 6 glass) — and two barrels reading it, one for each ear
&scenes [0] [0,4] [0,1,4] [0,1,2] [0,1,2,3] [0,1,2,3,5] [0,2,3,4,5,6] [0,1,2,3,4,5,6] [0,3,4,6] [0,1,5,6] [0,4,6] [0,6]
&drone tags="drone" [&pad * &padv * .14]
&sL tags="sequence" [&arp * &arpv * .14]
&aL tags="canon" [&melody * &voiceA * .2]
&fL tags="canon" [&canon * &voiceB * .07]
&bL tags="bells" [&bells * &bell * .03]
&pulses tags="pulse" [&pulse * &bass * .25]
&gL tags="glass" [&shimmer * &glass * .07]
&sR tags="sequence" [&arp * &arpv * .05]
&aR tags="canon" [&melody * &voiceA * .07]
&fR tags="canon" [&canon * &voiceB * .2]
&bR tags="bells" [&bells * &bell * .09]
&gR tags="glass" [&shimmer * &glass * .03]
&leftLayers &drone &sL &aL &fL &bL &pulses &gL
&rightLayers &drone &sR &aR &fR &bR &pulses &gR
&leftEar over=&leftLayers step=&bar*32 label="left ear" &scenes
&rightEar over=&rightLayers step=&bar*32 label="right ear" &scenes

&out level=8 loop=SAMPLE_RATE map=sample &leftEar &rightEar`,
  },
  cellscape2: {
    source: `&piece title="Cellscape II feat. Stockhausen" tags="experimental, electronic, Stockhausen, microtonal, ambient" label="No octaves, no beat, no instruments: sines and noise on Stockhausen's 25 steps to 5:1. Every layer keeps its own time and a prime number of steps; chance thins and chooses, a little differently every time round, the same every time you play it. The glints' chance is a slider."
# Cellscape II, after Stockhausen's Studie II: the scale is 25 equal steps to 5:1 from
# 100 Hz, and never meets an octave. Nothing keeps a beat: each layer has a clock of its
# own (step= in steps a second) and a prime number of steps — 11, 7, 13 — and the slow
# movements are primes in seconds — 17, 19, 23, 29. They meet again only after ages.
&steps cycle=25 map=ed(5) label="25 steps to 5:1, no octave"

# mixtures, Stockhausen's sound: five sines a few steps apart, held long — some, by chance
&constellations over=&steps step=0.11 label="constellations: 11 mixtures, nine seconds each" [0,1,2,3,4]?.8 ~ [8,10,12,14,16]? [3,6,9,12,15]?.6 ~ [20,25,30,35,40]?.7 [5,7,9,11,13] ~ [12,15,18,21,24]? ~ [1,5,9,13,17]?.6
&mirror over=&steps step=0.11 label="its retrograde, 8 steps higher" &constellations[::-1]^8
# high glints: few, chosen — how few is yours (chance=)
&glints over=&steps step=1.7 chance=free(.18, 0..0.6) label="glints: 7 steps" [50|53|57|61|66]? ~ [44|48|52]? ~ ~ [58|63|70]? ~
# ripples: 13 steps, some chosen, some by chance
&ripples over=&steps step=2.3 label="ripples: 13 steps" 26 [29|31] 33? 27 [35|38]? 30 ~ 32? [28|36] 34 ~ 31? 37?
# two low sines a step apart, beating; each slides on a prime of its own
&lowA over=&steps step=0.029 -8
&lowB over=&steps step=0.029 -7
# a band of noise, its two edges drifting on primes (19 s, 29 s)
&surf step=0.019 0
&tideA map=lin loop=.0526 .1 1 .3 .1
&tideB map=lin loop=.0345 .2 .1 .8 .2

&sine s=sine loop=100 room=.6 env=&(map=adsr 3 2 .6 6)
&glint s=sine loop=100 room=.7 delaytime=.73 delay=.4 delayfeedback=.55 env=&(map=adsr .003 .4 0 1.2) pitch=&(map=lin loop=.09 0 .4 0 -.4 0)
&ripple s=sine loop=100 room=.5 delaytime=.41 delay=.3 delayfeedback=.4 env=&(map=adsr .01 .25 .2 .3)
&droneA s=sine loop=100 env=&(map=adsr 8 1 1 8) pitch=&(map=lin loop=.0588 0 .3 0 -.3 0)
&droneB s=sine loop=100 env=&(map=adsr 8 1 1 8) pitch=&(map=lin loop=.0435 0 -.3 0 .3 0)
&noise s=white lpf=300..3000 * &tideA hpf=150..1500 * &tideB lpq=4 env=&(map=adsr 12 4 .8 12)

&out level=15 loop=SAMPLE_RATE map=sample [&constellations * &sine * .05, &glints * &glint * .05, &ripples * &ripple * .03, &lowA * &droneA * .12, &surf * &noise * .03] [
                                  &mirror * &sine * .05, &glints * &glint * .03, &ripples * &ripple * .05, &lowB * &droneB * .12, &surf * &noise * .03]`,
  },
  baustelle: {
    source: `&piece title="Baustelle" tags="experimental, electronic, Neubauten, microtonal, industrial, arrangement" label="An original in the manner of Einstürzende Neubauten: beams, pipes and plates struck and tuned to their own partials, a giant bass spring, a grinder and a drill, a scream; sub-bass under a gritty riff. It builds, breaks, comes back harder, and collapses."
# Baustelle — a building site, played. Metal is inharmonic: a free steel beam rings at
# 1 : 2.76 : 5.40 : 8.93, so each metal gets a grid of its own partials (map=ratios), and
# a hit is a chord of them. Some hits fall only sometimes (?), some choose ([a|b]):
# the percussionist's hand. Under it: a sub-bass kick, a crushed riff, the Bassfeder.
&bar scan(1 1 1 1) step=free(118bpm, 90..150)

# ---- the metals: their partials (the last number is just where each grid repeats)
&beam tags="metal" map=ratios 1 2.756 5.404 8.933 16 label="beam: 1 : 2.76 : 5.40 : 8.93"
&pipe tags="metal" map=ratios 1 2.42 4.37 6.71 8 label="pipe"
&plate tags="metal" map=ratios 1 1.59 2.14 2.30 2.65 2.92 4 label="plate"
&beams tags="metal" over=&beam step=&bar/4 [0,1,2,3] ~!2 [0,1,2,3]? ~!2 [0,1,2,3] ~!3 [0,1,2,3] ~ [0,2]? ~ [0,1,2,3] [1,3]?.3
&pipes tags="metal" over=&pipe step=&bar/4 ~ ~ [0,1,2,3] ~ [1|2]? [0,1,2,3] ~ [0,1,2,3]? ~ ~ [0,1,2,3] ~ ~ [1,2,3]? [0,1,2,3] ~
&plates tags="metal" over=&plate step=&bar ~ [0,1,2,3,4,5] ~ [0,1,2,3,4,5]

# ---- the low end: a sub-bass kick, four on the floor; a crushed riff on E; the Bassfeder
&kick tags="low" step=&bar 0!4
&riff tags="low" step=&bar/4 0 0 1 0 ~ 0 7 0 6 ~ 0 1 0 ~ 3 -2
&accent tags="low" map=amp step=&bar/4 1 .5 .8 .5 0 .6 1 .5 .9 0 .6 .8 .5 0 1 .7
&feder tags="low" step=&bar/2 0 ~ ~ 0? 0 ~ [0|-5] ~

# ---- tools: the grinder (noise that swells, now it can), the drill (a whine that wobbles)
&grind tags="tools" step=&bar*2 0 0?.6
&swell tags="tools" map=amp step=&bar/2 .2 .5 1 .7
&drill tags="tools" step=&bar 0? ~!3 0?.3 ~ 7? ~
&edge tags="tools" map=lin loop=.37 .2 1 .4
# ---- the scream: a saw sliding, and breath, through filters moving between vowels
&schrei tags="scream" step=&bar*2 0 ~ 0?.5 ~
&slide tags="scream" map=lin loop=&bar*2 0 7 12 9 -2 0
&vowel tags="scream" map=lin loop=.83 .3 1 .55 .8 .3

# ---- the last crash
&fall tags="metal" over=&beam step=&bar*4 [0,1,2,3]
&crashPlate tags="metal" over=&plate step=&bar*4 [0,1,2,3,4,5]
&rubble step=&bar*4 0

&beamv tags="metal" s=sine loop=110 room=.3 env=&(map=adsr 0 .5 0 .9)
&pipev tags="metal" s=sine loop=233 room=.25 env=&(map=adsr 0 .3 0 .6)
&platev tags="metal" s=sine loop=415 room=.4 distort=.2 env=&(map=adsr 0 .25 0 1.4)
&sub tags="low" s=sine loop=E1 penv=14 pdec=.07 distort=.15 env=&(map=adsr .002 .45 .5 .15)
&grit tags="low" s=saw loop=E1 distort=.85 crush=6 lpf=90..2200 * &(map=adsr .003 .18 .15 .08) * &accent lpq=7 env=&(map=adsr .002 .12 .5 .05)
&bassfeder tags="low" s=saw loop=A1 penv=9 pdec=.09 distort=.6 lpf=160..1300 * &(map=adsr .002 .3 .1 .3) lpq=9 delaytime=.019 delay=.55 delayfeedback=.84 env=&(map=adsr .002 .6 .2 .5)
&grinder tags="tools" s=white distort=.7 lpf=900..7000 * &edge hpf=500 lpq=3 env=&(map=adsr .05 .4 .8 .3)
&drillv tags="tools" s=saw loop=E4 distort=1 crush=8 lpf=4000 env=&(map=adsr .02 .1 .9 .1) pitch=&(map=lin loop=23 0 .7 0 -.7 0)
&voice tags="scream" s=saw loop=A3 distort=1.2 crush=7 lpf=500..2600 * &vowel lpq=11 hpf=300 env=&(map=adsr .08 .3 .9 .6)
&breath tags="scream" s=white distort=.9 lpf=600..3000 * &vowel lpq=8 hpf=900 env=&(map=adsr .05 .3 .8 .5)
&crash s=white distort=.5 lpf=9000 room=.6 env=&(map=adsr 0 3 0 4)

# ---- the parts, and the site's day: four bars a step; laps=1: it ends
&metalPart [&beams * &beamv * .09, &pipes * &pipev * .07]
&platePart [&plates * &platev * .05]
&subPart [&kick * &sub * .55]
&riffPart [&riff * &accent * &grit * .2]
&federPart [&feder * &bassfeder * .3]
&grindPart [&grind * &swell * &grinder * .14]
&drillPart [&drill * &drillv * .06]
&schreiPart [(&schrei + &slide) * &voice * .1, &schrei * &breath * .06]
&einsturz [&fall * &beamv * .14, &crashPlate * &platev * .08, &rubble * &crash * .25, &rubble * &sub * .6]
&teile &metalPart &platePart &subPart &riffPart &federPart &grindPart &drillPart &schreiPart &einsturz
&tag over=&teile step=&bar*16 laps=1 label="metal · grinder · spring · groove · drill · scream · break · spring · groove · all · all · collapse · Einsturz" [0] [0,5] [0,2,4] [0,1,2,3,4] [0,1,2,3,4,6] [0,1,2,3,4,5,7] [4,5,7] [4] [0,1,2,3,4,5] [0,1,2,3,4,5,6,7]!2 [5,7] 8

&out level=-11 loop=SAMPLE_RATE map=sample &tag`,
  },
  focus: {
    source: `&piece title="Cell in Focus" tags="electronic, Aphex Twin, diatonic, ambient" label="Slow, serene, looping. Four soft chords breathe through a filter; a bell arpeggio drifts above them, thinning by chance; a low root under each. Nothing hurries."
# Cell in Focus — in the spirit of a slow, glowing Aphex Twin loop: an original. D major,
# four chords of four bars: Dmaj7, Bm9, Gmaj7, A6. The arpeggio reads each chord's
# tones an octave up; a few notes rest by chance, differently every time round.
&bar scan(1 1 1 1) step=free(62bpm, 48..80)
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&chords over=&major step=&bar*16 label="Dmaj7 · Bm9 · Gmaj7 · A6" [0,2,4,6] [-2,0,2,4,8] [-4,-2,0,2] [-3,-1,1,2]
&roots over=&major step=&bar*16 -7 -9 -11 -10
&a1 7 9? 11 13?.6
&a2 5 7? 9 11?.6
&a3 3 5? 7 9?.6
&a4 4 6? 8 9?.6
&arp over=&major step=&bar/2 label="the bells" &a1!8 &a2!8 &a3!8 &a4!8
&breath map=lin loop=&bar*24 .15 .8 .35 .15

&pad s=saw loop=D3 lpf=300..1800 * &breath room=.6 env=&(map=adsr 2.5 1 .8 4) pitch=&(map=lin loop=.11 0 .06 0 -.06 0)
&bell s=sine loop=D4 room=.7 delaytime=&bar*3/4 delay=.35 delayfeedback=.45 env=&(map=adsr .004 1.4 0 2.2)
&low s=tri loop=D3 lpf=500 env=&(map=adsr 1.5 1 .9 3)

&out level=10.5 loop=SAMPLE_RATE map=sample [&chords * &pad * .08, &arp * &bell * .16, &roots * &low * .3] [
                                  &chords * &pad * .08, &arp * &bell * .1, &roots * &low * .3]`,
  },
  hypercell: {
    source: `&piece title="Hypercell" tags="electronic, Scooter, diatonic, dance, arrangement" label="90s happy hardcore and eurodance, an original: four-on-the-floor at 160, offbeat octave bass, rave stabs, a euphoric hook on two detuned saws, risers and snare rolls into every drop. Fifteen sections of eight bars: three minutes, then it ends."
# Hypercell — Am F C G, a bar each; everything in semitones from C. The hook is our own.
&bar scan(1 1 1 1) step=free(160bpm, 140..180)
&prog tags="bass" loop=&bar*16 9 5 0 7                                   # A F C G: the bass moves with it
&off tags="bass" step=&bar/2 ~ 0 ~ 0 ~ 0 ~ 0                             # the eurodance bass: on the offbeats
&sAm tags="synths" ~ [9,12,16]
&sF tags="synths" ~ [5,9,12]
&sC tags="synths" ~ [0,4,7]
&sG tags="synths" ~ [7,11,14]
&stabs tags="synths" step=&bar/2 label="rave stabs" &sAm!4 &sF!4 &sC!4 &sG!4
&hook tags="synths" step=&bar/2 label="the hook" 16!2 19 16 14 12 14@2 12!2 16 12 11 9 11@2 12!2 16 19 21 19 16@2 14 12 11 12 14@4
&held tags="synths" step=&bar*4 [9,12,16] [5,9,12] [0,4,7] [7,11,14]
&kick tags="drums" step=&bar 0!4
&hats tags="drums" step=&bar/2 ~ 0 ~ 0 ~ 0 ~ 0
&clap tags="drums" step=&bar ~ 0 ~ 0
&roll tags="drums" step=&bar 0!8 0*2!4 0*4!6 0*8!13 ~
&lift tags="rise" step=&bar*32 0
&up tags="rise" map=lin loop=&bar*32 0 .2 .45 1 0

&bd tags="drums" s=sine loop=A1 penv=30 pdec=.05 distort=.2 env=&(map=adsr 0 .28 0 .05)
&hh tags="drums" s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)
&cp tags="drums" s=white hpf=1400 room=.2 env=&(map=adsr 0 .12 0 .06)
&sn tags="drums" s=white hpf=900 env=&(map=adsr 0 .07 0 .03)
&bass tags="bass" s=saw loop=C2 lpf=900 lpq=4 env=&(map=adsr .003 .12 .6 .05)
&stab tags="synths" s=square loop=C4 lpf=2800 room=.25 env=&(map=adsr .002 .14 .1 .1)
&sawA tags="synths" s=saw loop=C5 lpf=5200 room=.3 delaytime=&bar*3/8 delay=.2 delayfeedback=.3 env=&(map=adsr .01 .2 .7 .2)
&sawB tags="synths" s=saw loop=527.4 lpf=5200 room=.3 env=&(map=adsr .01 .2 .7 .2)
&padv tags="synths" s=saw loop=C4 lpf=1600 room=.5 env=&(map=adsr .8 .5 .8 1.5)
&riser tags="rise" s=white lpf=300..9000 * &up lpq=6 env=&(map=adsr 1 .5 .9 .5)

&beat [&kick * &bd * .8, &hats * &hh * .2, &clap * &cp * .35]
&bassPart [(&off + &prog) * &bass * .35]
&stabPart [&stabs * &stab * .1]
&hookPart [&hook * &sawA * .13, &hook * &sawB * .13]
&risePart [&lift * &riser * .12]
&padPart [&held * &padv * .08]
&rollPart [&roll * &sn * .25]
&parts &beat &bassPart &stabPart &hookPart &risePart &padPart &rollPart
&song over=&parts step=&bar*32 laps=1 label="intro · groove · build · drop · drop · break · build · drop · drop · bass · break · build · drop · drop · out" [0] [0,1] [0,1,4,6] [0,1,2,3]!2 [5,3] [5,4,6] [0,1,2,3]!2 [0,1] 5 [5,4,6] [0,1,2,3]!2 0

&out level=3 loop=SAMPLE_RATE map=sample &song
&eq scope=spectrum bins=20 label="the whole track, in 20 bands" &beat &bassPart &hookPart &padPart`,
  },
  onemore: {
    source: `&piece title="One more Cell" tags="electronic, Daft Punk, diatonic, dance" label="French filter house, an original: parallel maj7 chords chopped in a funky sixteenth rhythm, F G A B♭, under one long filter sweep, pumping on every beat; disco octaves, a robotic lead, four-on-the-floor. A loop: open it up and let it ride."
# One more Cell — the chords are one shape (maj7) moved F G A B♭ (&prog): parallel, as the
# filter-house records did. The pump: the chords duck on every beat (a volume stream).
&bar scan(1 1 1 1) step=free(122bpm, 110..130)
&prog tags="chords" loop=&bar*32 0 2 4 5                                     # F G A B♭, two bars each
&c tags="chords" [0,4,7,11]
&chop tags="chords" step=&bar/4 label="the chop" &c ~ &c!2 ~ &c ~ &c ~ &c!2 ~ &c ~ &c!2
&pump tags="chords" map=amp step=&bar .35 .55 .75 .95
&disco tags="bass" step=&bar/2 0 12 0 12 0 12 0 12
&robot tags="robot" step=&bar/2 label="the robot" ~ 12 14 16 ~ 16 14 12 ~ 14 16 17 ~ 16 14 ~ ~ 12 14 16 ~ 19 17 16 14@2 12@2 9@4
&filt tags="chords" map=lin loop=&bar*32 .06 .3 1 .7 .06
&kick tags="groove" step=&bar 0!4
&clap tags="groove" step=&bar ~ 0 ~ 0
&open tags="groove" step=&bar/2 ~ 0 ~ 0 ~ 0 ~ 0
&shake tags="groove" step=&bar/4 0? 0?.3 0? 0?.3

&keys tags="chords" s=square loop=F3 lpf=200..6500 * &filt lpq=5 env=&(map=adsr .003 .12 .5 .06)
&bass tags="bass" s=square loop=F1 lpf=700 env=&(map=adsr .004 .15 .6 .05)
&lead tags="robot" s=square loop=F4 lpf=1400 lpq=9 delaytime=&bar*3/4 delay=.25 delayfeedback=.3 env=&(map=adsr .02 .2 .7 .15) pitch=&(map=lin loop=6 0 .08 0 -.08 0)
&bd tags="groove" s=sine loop=A1 penv=26 pdec=.05 env=&(map=adsr 0 .3 0 .05)
&cp tags="groove" s=white hpf=1300 room=.25 env=&(map=adsr 0 .14 0 .06)
&oh tags="groove" s=white hpf=7000 env=&(map=adsr 0 .18 0 .08)
&sh tags="groove" s=white hpf=10000 env=&(map=adsr 0 .03 0 .02)

&groove tags="groove" [&kick * &bd * .8, &clap * &cp * .3, &open * &oh * .15, &shake * &sh * .1]
&choppy tags="chords" [(&chop + &prog) * &pump * &keys * .07]
&disc tags="bass" [(&disco + &prog) * &bass * .35]
&rob tags="robot" [&robot * &lead * .1]
&parts &groove &choppy &disc &rob
&song over=&parts step=&bar*32 label="filtered · groove · lead · breakdown" [0,1] [0,1,2] [0,1,2,3] [1,3]

&out loop=SAMPLE_RATE map=sample &song`,
  },
  brothers: {
    source: `&piece title="Cellular Brothers" tags="electronic, Chemical Brothers, modal, dance, arrangement" label="Big beat, an original in the manner of the Chemical Brothers: a gritty, crushed breakbeat; an acid line; a distorted stab riff in E minor; a siren; builds with snare rolls and a riser. About two and a half minutes, then it ends."
# Cellular Brothers — the break is a kit read in sixteenths; the acid line opens its filter
# on every note, further on the accents. Everything in semitones from E.
&bar scan(1 1 1 1) step=free(112bpm, 96..132)
&b1 tags="break" 0 ~ 2 ~ 1 ~ 2 0 ~ 0 1 ~ 2 0 1 2
&b2 tags="break" 0 ~ 2 0 1 ~ 2 ~ 0 0 ~ 2 1 ~ 1*2 2
&break tags="break" over=&kit step=&bar/4 label="the break" &b1 &b2
&acid tags="acid" step=&bar/4 label="the acid" 0 0 12 0 3 0 ~ 0 7 0 10 ~ 0 12 3 5
&accent tags="acid" map=amp step=&bar/4 1 .5 .9 .5 .8 .5 0 .5 1 .5 .8 0 .5 1 .7 .9
&riff tags="riff" step=&bar/2 label="the riff" [0,7] ~ [0,7] [3,10] ~ [5,12] ~ [3,10]
&siren tags="siren" step=&bar*8 0
&wail tags="siren" map=lin loop=&bar 0 12 0
&sub tags="sub" step=&bar 0 ~ 0 [-2|0]
&roll tags="build" step=&bar 0!4 0*2!4 0*4!4 0*8!4
&lift tags="build" step=&bar*32 0
&up tags="build" map=lin loop=&bar*32 0 .3 1 0

&bd tags="break" s=sine loop=A1 penv=24 pdec=.06 distort=.5 env=&(map=adsr 0 .3 0 .05)
&sd tags="break" s=white hpf=900 distort=.6 crush=7 env=&(map=adsr 0 .12 0 .05)
&ch tags="break" s=white hpf=7000 crush=6 env=&(map=adsr 0 .03 0 .02)
&kit tags="break" &bd &sd &ch
&tb tags="acid" s=saw loop=E2 lpf=120..3600 * &(map=adsr .003 .17 .1 .06) * &accent lpq=14 distort=.3 env=&(map=adsr .002 .14 .6 .05)
&stab tags="riff" s=square loop=E3 distort=.9 lpf=2600 room=.2 env=&(map=adsr .003 .2 .3 .1)
&siren1 tags="siren" s=sine loop=E5 delaytime=&bar*3/4 delay=.3 delayfeedback=.35 env=&(map=adsr .3 .5 .9 .6)
&subv tags="sub" s=sine loop=E1 env=&(map=adsr .005 .4 .6 .1)
&sn tags="build" s=white hpf=1000 distort=.4 env=&(map=adsr 0 .06 0 .03)
&riser tags="build" s=white lpf=400..8000 * &up lpq=5 crush=8 env=&(map=adsr 1 .5 .9 .5)

&breakPart tags="break" [&break * .7]
&acidPart tags="acid" [&acid * &accent * &tb * .3]
&riffPart tags="riff" [&riff * &stab * .1]
&sirenPart tags="siren" [(&siren + &wail) * &siren1 * .08]
&buildPart tags="build" [&roll * &sn * .3, &lift * &riser * .14]
&subPart tags="sub" [&sub * &subv * .5]
&parts &breakPart &acidPart &riffPart &sirenPart &buildPart &subPart
&song over=&parts step=&bar*32 laps=1 label="break · bass · acid · build · riff · all · siren · build · all" [0] [0,5] [0,1,5] 4 [0,1,2,5] [0,1,2,3,5] [3,1] 4 [0,1,2,3,5]

&out loop=SAMPLE_RATE map=sample &song
&tracker scope=waterfall label="the break, as a tracker" &break`,
  },
  ghosts: {
    source: `&piece title="Ghost-Cells" tags="experimental, electronic, Nine Inch Nails, modal, ambient, industrial" label="Dark and looping, in the manner of an instrumental Nine Inch Nails record: a prepared-piano phrase of seven eighths over a bar of eight, drifting a step each time round; a distorted drone; crushed noise drifting on prime periods; heavy, sparse percussion and glitches, by chance."
# Ghost-Cells — D minor. The piano phrase is seven eighths long and the bar eight: it comes
# back a step later every bar, and lines up again only after seven bars.
&bar scan(1 1 1 1) step=free(76bpm, 60..96)
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&phrase over=&minor step=&bar/2 label="the piano: seven against eight" 0 4 3 ~ 7 5 ~
&answer over=&minor step=&bar*8 label="its shadow, low" -7@2 -5 -4 -7@2 -9 -10
&drone step=&bar*16 [0,7]
&grit map=lin loop=.0435 .15 .7 .3 .15                       # 23 s
&haze map=lin loop=.0345 .1 .5 .9 .1                         # 29 s
&hiss step=&bar*16 0
&kick step=&bar/2 0 ~ ~ 0? ~ ~ 0?.3 ~
&metal step=&bar/4 ~!2 0?.25 ~!4 0?.4 ~!3 0?.2 ~ 0?.3 ~!2
&glitch step=&bar/8 [0|7|12]?.06

&piano s=tri loop=D4 lpf=3000 room=.45 delaytime=&bar*3/4 delay=.2 delayfeedback=.35 env=&(map=adsr .002 1.6 0 1.8) pitch=&(map=lin loop=.19 0 .05 0 -.05 0)
&cello s=saw loop=D3 lpf=700 room=.5 env=&(map=adsr .6 1 .8 2)
&low s=saw loop=D1 distort=.8 lpf=120..600 * &grit lpq=3 env=&(map=adsr 4 2 .9 6)
&noise s=brown crush=5 lpf=200..2400 * &haze hpf=80 room=.4 env=&(map=adsr 6 2 .8 8)
&bd s=sine loop=D1 penv=20 pdec=.08 distort=.9 env=&(map=adsr 0 .5 0 .1)
&tick s=square loop=D6 hpf=4000 crush=4 env=&(map=adsr 0 .03 0 .02)
&blip s=sine loop=D6 crush=3 env=&(map=adsr 0 .05 0 .03)

&out loop=SAMPLE_RATE map=sample [&phrase * &piano * .22, &answer * &cello * .12, &drone * &low * .18, &hiss * &noise * .25, &kick * &bd * .55, &metal * &tick * .06, &glitch * &blip * .05] [
                                  &phrase * &piano * .16, &answer * &cello * .16, &drone * &low * .18, &hiss * &noise * .25, &kick * &bd * .55, &metal * &tick * .1, &glitch * &blip * .07]`,
  },
  tines: {
    source: `&piece title="Cell Tines" tags="electronic, diatonic, FM, sound" label="FM, after the DX7: an electric piano of two pairs (a body at 1:1, a tine at 14:1 that barks on the attack), bells at 3.5:1, a punchy FM bass. Each brightness is an index under an envelope: bright on the attack, mellowing as it rings. Fmaj7 · Em7 · Dm7 · Cmaj7."
# Cell Tines — frequency modulation: a modulator (a voice with ratio=) swings its carrier's
# frequency (fm=&op) by index × its own frequency. Whole-number ratios sound harmonic
# (pianos, basses), others not (bells). The index moves: index=lo..hi * &envelope.
&bar scan(1 1 1 1) step=free(84bpm, 60..110)
&major scan(2 2 1 2 2 2 1)
&cF [3,5,7,9]@3 [3,5,7,9] ~@2 [3,5,7,9]@2
&cE [2,4,6,8]@3 [2,4,6,8] ~@2 [2,4,6,8]@2
&cD [1,3,5,7]@3 [1,3,5,7] ~@2 [1,3,5,7]@2
&cC [0,2,4,6]@3 [0,2,4,6] ~@2 [0,2,4,6]@2
&comp over=&major step=&bar/2 label="the piano: Fmaj7 · Em7 · Dm7 · Cmaj7" &cF &cE &cD &cC
&tune over=&major step=&bar/2 label="the bells" ~@2 9 11 12@4 ~@2 11 9 8@4 ~@2 7 8 9 8 7 5 4@4 ~@4
&low over=&major step=&bar -11 ~ -11 -10 -12 ~ -12 -11 -13 ~ -13 -12 -14 ~ -14 -10

&m1 s=sine ratio=1
&m2 s=sine ratio=14
&m3 s=sine ratio=3.5
&m4 s=sine ratio=1
&body s=sine loop=C4 fm=&m1 index=.3..2.6 * &(map=adsr .002 .9 .3 .6) room=.3 env=&(map=adsr .002 1.6 .35 .8)
&tine s=sine loop=C4 fm=&m2 index=0..2.2 * &(map=adsr .001 .1 0 .1) env=&(map=adsr .001 .45 0 .3)
&bell s=sine loop=C5 fm=&m3 index=.8..6 * &(map=adsr .001 1.4 .15 1.2) room=.5 delaytime=&bar*3/4 delay=.3 delayfeedback=.35 env=&(map=adsr .002 3 0 2.5)
&fmbass s=sine loop=C2 fm=&m4 index=.6..5 * &(map=adsr .001 .18 .15 .1) env=&(map=adsr .003 .4 .5 .1)

&out level=13 loop=SAMPLE_RATE map=sample [&comp * &body * .055, &comp * &tine * .03, &tune * &bell * .12, &low * &fmbass * .35] [
                                  &comp * &body * .055, &comp * &tine * .02, &tune * &bell * .09, &low * &fmbass * .35]`,
  },
  phase: {
    source: `&piece title="Cell Phase" tags="experimental, Steve Reich, modal, minimal, rhythm" label="After Steve Reich's Piano Phase, an original: two pianos, one pattern of twelve. The right one plays 81 notes in the time of the left one's 80 — it slips a note ahead every 81, through all twelve alignments, back to unison after 81 rounds. A quiet euclid(5, 12) on low wood marks the left player's twelve."
# Cell Phase — no tempo is nudged: the drift is a ratio of clocks. &left steps in sixteenths
# (&bar/4); &right in &bar*20/81 — a sixteenth times 80/81. Every 81 of its notes, it's one ahead.
&bar scan(1 1 1) step=free(144bpm, 100..180)
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&pattern 0 2 4 5 7 5 4 2 1 4 7 9
&left over=&minor step=&bar/4 label="left: in time" &pattern
&right over=&minor step=&bar*20/81 label="right: 81 notes to the left's 80" &pattern
&wood step=&bar/4 label="euclid(5, 12): the left player's twelve" euclid(5, 12)

&mL s=sine ratio=1
&mR s=sine ratio=1
&pianoL s=sine loop=E4 fm=&mL index=.2..1.6 * &(map=adsr .001 .3 .1 .2) room=.25 env=&(map=adsr .002 .6 .2 .2)
&pianoR s=sine loop=E4 fm=&mR index=.2..1.6 * &(map=adsr .001 .3 .1 .2) room=.25 env=&(map=adsr .002 .6 .2 .2)
&woodv s=sine loop=E2 penv=12 pdec=.03 env=&(map=adsr 0 .09 0 .04)

&out level=3 loop=SAMPLE_RATE map=sample [&left * &pianoL * .2, &right * &pianoR * .06, &wood * &woodv * .1] [
                                          &left * &pianoL * .06, &right * &pianoR * .2, &wood * &woodv * .1]`,
  },
  dtmf: {
    source: `&piece title="DTMF: a telephone keypad" tags="electronic, basics, sound" label="Every touch-tone phone: a key is two sines at once, its row's and its column's. Type a number and it's dialled — a key, a pause; a space (or anything not on the keypad) a rest — over and over."
# DTMF — dual-tone multi-frequency. Rows 697 770 852 941 Hz, columns 1209 1336 1477 1633 Hz:
# eight frequencies (&dtmf, as ratios to 697), sixteen keys a row and a column each (&keys).
# The number is text (free(\"…\"): a field to type in); spell(…) dials it — each character that's a
# key plays &keys[k] (its row and column), then a pause; a space is a rest.
&dtmf map=ratios 1 1.1047 1.2224 1.3501 1.7346 1.9168 2.1191 2.3429 4 label="rows 697 770 852 941 · columns 1209 1336 1477 1633 Hz"
&keys over=&dtmf label="the keypad: a row and a column a key" [0,4] [0,5] [0,6] [0,7] [1,4] [1,5] [1,6] [1,7] [2,4] [2,5] [2,6] [2,7] [3,4] [3,5] [3,6] [3,7]
&dial step=7 label="the number, dialled" spell(free("867 5309 ABCD .#"), &keys, "1 2 3 A 4 5 6 B 7 8 9 C * 0 # D")
&tone s=sine loop=697 env=&(map=adsr .004 .05 1 .008)
&out level=11.5 loop=SAMPLE_RATE map=sample [&dial * &tone * .3]`,
  },
  musicbox: {
    source: `&piece title="Music Box" tags="classical, basics, sound" label="A clockwork music box: wound, it spins up from rest, plays its tune — and as the spring runs down it slows, and slows, and stops. Physics, not a ritardando. Turn the drum forward with your finger to push the tune on; hold it, and the box stops under your hand."
# Music Box — the meter is a body that turns: a motor (its spring) pulls it to 96 bpm, its
# mass resists, friction drags; over 36 s the spring runs down, and it coasts to a stop.
# Everything it drives slows with it — the tune, the bass, the tick of the escapement.
&bar scan(1 1 1) step=96bpm motor=6 mass=1.2 friction=.4 wind=36
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&tune over=&major step=&bar/2 label="the comb" 4 2 0 2 4 4 4@2 3 2 1 2 3 1 -1 1 3 3 3@2 2 1 0@2
&low over=&major step=&bar label="the bass" -14 -12 -10 -14 -12 -10 -10 -8 -6 -10 -8 -6
&tick step=&bar label="the escapement" 0 0 0

&m s=sine ratio=7.1
&comb s=sine loop=C5 fm=&m index=.2..1.6 * &(map=adsr .001 .06 .1 .1) room=.35 env=&(map=adsr .001 1.1 0 1)
&combLow s=sine loop=C5 fm=&m index=.1...8 * &(map=adsr .001 .06 .1 .1) env=&(map=adsr .001 1.4 0 1.2)
&tickv s=white hpf=6500 env=&(map=adsr 0 .012 0 .01)

&out level=9 loop=SAMPLE_RATE map=sample [&tune * &comb * .22, &low * &combLow * .14, &tick * &tickv * .05] [
                                  &tune * &comb * .16, &low * &combLow * .18, &tick * &tickv * .05]`,
  },
  tape: {
    source: `&piece title="Tape Machine" tags="electronic, ambient, sound" label="A tape loop on a machine that turns: it spins up from rest (the pitch glides up with it), wows gently, the hats on a slack belt dragging behind. Hold the capstan with your finger: a tape stop, the pitch diving; let go and it spins back up. At the end the spring gives out and the tape stops for good."
# Tape Machine — the meter is the capstan: a motor (spinning up from rest), a little wow (its
# speed swings 0.55 times a second), varispeed=1 (pitch follows speed, as on tape), and a spring
# that holds for 40 s, then gives out: a tape stop. The hats ride a slack belt: they lag, then swing.
&bar scan(1 1 1 1) step=78bpm motor=1.4 mass=1 friction=.3 wow=.012 wind=40 varispeed=1
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&loop over=&minor step=&bar/2 label="the loop" 4 ~ 2 0 ~ 2 4 7@2 ~ 6 4 2 ~ 4@2 -1 ~
&chords over=&minor step=&bar*4 label="i · VI" [0,2,4,6] [-2,0,2,4]
&hats step=&bar/2 belt=30 mass=1.5 label="the hats, on a slack belt" ~ 0 ~ 0 ~ 0 ~ 0
&kick step=&bar 0 ~ 0 ~

&keys s=tri loop=D4 lpf=2200 room=.4 delaytime=&bar*3/4 delay=.3 delayfeedback=.4 env=&(map=adsr .004 .5 .3 .4)
&pad s=saw loop=D3 lpf=700 room=.6 env=&(map=adsr 1 1 .8 2)
&hh s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)
&bd s=sine loop=D1 penv=16 pdec=.05 env=&(map=adsr 0 .3 0 .05)

&out level=7 loop=SAMPLE_RATE map=sample [&loop * &keys * .16, &chords * &pad * .05, &hats * &hh * .08, &kick * &bd * .5] [
                                  &loop * &keys * .12, &chords * &pad * .05, &hats * &hh * .1, &kick * &bd * .5]`,
  },
  automaton: {
    source: `&piece title="Automaton" tags="experimental, rhythm, sound" label="A mechanical band on belts: the drum (the meter, a motor) turns them all — the bells on a taut belt, exact; the drummer's arm on a slack one, lagging and swinging; the woodblock's arm slipping when the drum jerks, a step behind for good. Grab the big drum and shove it: watch the belts stretch, hear the arms drag and the woodblock slip."
# Automaton — one motor, belts of different give. belt= stiffness (taut 3000, slack 25),
# mass= the arm, slip= its grip: past it the belt slips and the arm falls behind for good.
&bar scan(1 1 1 1) step=104bpm motor=4 mass=1 friction=.2
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&bells over=&major step=&bar/2 belt=3000 label="the bells: a taut belt" 0 4 7 4 9 7 4 2 0 4 7 9 11 9 7 4
&drums over=&kit step=&bar/4 belt=25 mass=1 label="its kit" 0 ~ 1 0 ~ 0 1 ~ 0 ~ 1 0 ~ 0 1 1
&wood step=&bar/2 belt=400 mass=1.5 slip=.4 label="the woodblock: it slips" 0 0 ~ 0 0 ~ 0 ~

&bell s=sine loop=C5 fm=&bm index=.3..2 * &(map=adsr .001 .1 .1 .1) room=.3 env=&(map=adsr .002 .9 0 .6)
&bm s=sine ratio=3.5
&bd s=sine loop=A1 penv=20 pdec=.05 env=&(map=adsr 0 .25 0 .05)
&sd s=white hpf=1200 env=&(map=adsr 0 .08 0 .04)
&kit &bd &sd
&blk s=square loop=C6 hpf=900 lpf=3000 env=&(map=adsr 0 .03 0 .02)

&out level=1.5 loop=SAMPLE_RATE map=sample [&bells * &bell * .14, &drums * .6, &wood * &blk * .05] [
                                  &bells * &bell * .1, &drums * .6, &wood * &blk * .07]`,
  },
  echotape: {
    source: `&about title="Echo Tape" tags="experimental, electronic, sound" label="A tape loop of notes: the write head records the tune; three read heads play it back .375, .75 and 1.5 tape-seconds on; every pass under the write head erases a little less than half — ghosts of older phrases fade round the loop. The reel wows; hold it, and the echoes slow and sag in pitch."
# Echo Tape — &tape records &tune (write=) onto a loop of 6 tape-seconds (length=); the tape
# moves with &reel, a physical motor (wow, and your hand). The read heads (play=, at=) are cells:
# play them like any melody. erase=.45: each pass keeps 55% — the ghosts.
&reel step=84bpm motor=1.5 mass=1 friction=.1 wow=.015 0
&bar scan(1 1 1 1) step=84bpm
&major scan(2 2 1 2 2 2 1) label="{mode} on {tonic}"
&tune over=&major step=&bar/2 label="the tune" 0 ~ 4 ~ 7 ~ ~ ~ 11 ~ 9 ~ 7 ~ ~ ~ 4 ~ 5 ~ 4 2 ~ ~ 0 ~ ~ ~ ~ ~ ~ ~
&tape step=&reel write=&tune length=6 erase=.45 varispeed=1 label="the tape: 6 s, a loop"
&near play=&tape at=.375 label="head 1"
&mid play=&tape at=.75 label="head 2"
&far play=&tape at=1.5 label="head 3"

&m s=sine ratio=3
&bell s=sine loop=G4 fm=&m index=.2..1.4 * &(map=adsr .001 .15 .1 .1) room=.3 env=&(map=adsr .002 1.2 0 .8)
&soft s=tri loop=G4 lpf=1800 room=.5 env=&(map=adsr .004 .9 0 .6)

&out level=17 loop=SAMPLE_RATE map=sample [&tune * &bell * .22, &near * &soft * .12, &far * &soft * .08] [
                                  &tune * &bell * .22, &mid * &soft * .12, &far * &soft * .08]`,
  },
  soundtape: {
    source: `&about title="Sound on Tape" tags="experimental, electronic, ambient, sound" label="Sound, on a tape loop: a plucked tune and a soft pad go to the speakers — and onto 4 seconds of tape on a wowing reel. Three heads play the tape back, left, right and between; every lap it comes round darker and warmer, a little hiss under it. Hold the reel: the whole tape bends down."
# Sound on Tape — &tape records a mix (write=&dry): sound, not notes. Its loop (length=) feeds
# back into itself, keeping 1 − erase each lap, through its loss (tone=, Hz) and saturation
# (drive=), with a little hiss=. The read heads are taps; in a mix they return to the speakers.
# The tape moves with &reel: when the reel slows, the heads' delays stretch and the pitch drops.
&reel step=72bpm motor=1.2 mass=1 friction=.05 wow=.02 0
&bar scan(1 1 1 1) step=72bpm
&minor scan(2 1 2 2 1 2 2) label="{mode} on {tonic}"
&tune over=&minor step=&bar/2 label="the tune" 0 ~ 7 ~ ~ 4 ~ ~ 2 ~ ~ ~ ~ ~ ~ ~ 9 ~ 7 ~ 4 ~ ~ ~ 2 ~ 0 ~ ~ ~ ~ ~
&pad over=&minor step=&bar*8 label="the pad" [0,2,4] [-2,0,2]
&pluck s=tri loop=D4 lpf=2600 env=&(map=adsr .003 .5 0 .4)
&soft s=saw loop=D3 lpf=700 env=&(map=adsr 1.5 1 .8 3)
&dry [&tune * &pluck * .25, &pad * &soft * .05]
&tape step=&reel write=&dry length=4 erase=.35 tone=3200 drive=.35 hiss=.006 label="the tape: 4 s"
&left play=&tape at=.75 label="head 1"
&right play=&tape at=1.5 label="head 2"
&far play=&tape at=2.75 label="head 3"

&out level=22 loop=SAMPLE_RATE map=sample [&dry, &left * .5, &far * .35] [&dry, &right * .5, &far * .35]`,
  },
  testtones: {
    source: `&about title="Test Tones on Tape" tags="experimental, electronic, ambient, sound" label="For the test bench, in the spirit of Hainbach: old sine generators holding drifting tones on a harmonic dial, a beeping test oscillator, swells from a noise sweep — all onto seven seconds of worn tape that hardly erases. Three heads, two of them wandering; hiss, print-through, dropouts. Everything piles up into ghosts. Hold the reel to bend it all; at the end the motor dies, and the tape stops."
# Test Tones on Tape — an original. The tape (&loop) records the bench (&bench, a mix): 7 tape-
# seconds that keep 84% each lap (erase=.16), worn (tone=), driven, hissing, printing through,
# dropping out. Two heads wander (flying heads). The reel is a motor with wow; its spring
# (wind=) gives out after two and a half minutes: the tape stop is the ending. &scope, the test
# bench's oscilloscope, shows what goes on the tape and what two of its heads read back.
&reel step=60bpm motor=1 mass=1.4 friction=.2 wow=.025 wind=150 0
&bar scan(1 1 1 1) step=60bpm
&dial map=ratios 1 1.5 2 2.25 3 3.75 4.5 6 8 label="the dial: a harmonic series, on 110 Hz"
&drones over=&dial step=&bar*4 label="the sine generator: long tones" 0 ~ [1,4] ~ 2 [0,5] ~ 3 ~ [2,6] ~ ~
&drift map=lin loop=.031 0 .08 0 -.11 0
&beeps over=&dial step=&bar/2 label="the test oscillator" 7? ~ ~ ~ 8?.3 ~ ~ ~ ~ 6? ~ ~ ~ ~ ~ ~
&swells step=&bar*8 label="the noise sweep" 0 ~ ~ 0
&sweep map=lin loop=.0625 .05 1 .2 .05

&gen s=sine loop=110 env=&(map=adsr 2 1 .9 3)
&osc s=sine loop=110 env=&(map=adsr .005 .18 0 .1)
&noise s=pink lpf=200..3000 * &sweep lpq=8 env=&(map=adsr 3 2 .7 4)
&bench [(&drones + &drift) * &gen * .16, &beeps * &osc * .06, &swells * &noise * .12]

&loop step=&reel write=&bench length=7 erase=.22 tone=1900 drive=.55 hiss=.004 print=.03 printgap=.7 dropout=.25 label="the tape: seven seconds, worn"
&scope scope=split label="the oscilloscope: the bench, the first head, the far one" &bench &first &third
&first play=&loop at=1.1 label="head 1"
&second play=&loop at=2.9 wander=.06 wanderhz=.13 label="head 2, wandering"
&third play=&loop at=5.3 wander=.15 wanderhz=.07 label="head 3, wandering further"

&out level=26 loop=SAMPLE_RATE map=sample [&bench * .35, &first * .5, &third * .45] [
                                  &bench * .35, &second * .5, &third * .45]`,
  },
  forks: {
    source: `&about title="Two Tuning Forks" tags="experimental, basics, sound" label="Two forks on one table. The first is struck now and then; the second, tuned the same, never is — but the table carries the vibration, and it begins to sing. Detune it with its slider and they beat. Tap a fork to strike it (where you tap is how it rings), hold to damp it, drag across it to bow."
# Two Tuning Forks — resonators (body=): persistent objects with their modes (a fork: its tone, and
# a clang 6.27× higher that dies at once). Notes strike them; a note's value is where (0 … 7).
# couple= sets one ringing from the other, both ways, through the table (coupling= how much).
&bar scan(1 1 1 1) step=60bpm
&hits step=&bar*8 label="a strike, every eight seconds" 4
&forkA body=fork loop=A4 ring=10 hard=.35 board=none couple=&forkB coupling=.1 label="fork A: struck" 0
&forkB body=fork loop=free(440hz, 434..446) ring=10 hard=.35 board=none label="fork B: only the table rings it" 0

&out level=-8 loop=SAMPLE_RATE map=sample [&hits * &forkA * .5, &forkB * .35] [&hits * &forkA * .35, &forkB * .5]`,
  },
  resonanz: {
    source: `&about title="Baustelle II: Resonanz" tags="experimental, electronic, Neubauten, industrial, sound" label="The building site again — now the metal itself rings. A plate is hammered where the pattern says, a beam struck, a low wire plucked, a spring kicked on the accents; a tape loop records the site, and its heads drive two pipes — the site resonating with itself. Tap the metal to strike it, hold to damp, drag across it to bow."
# Baustelle II: Resonanz — resonators (body=) struck by notes: a note's value is where (0 … 7).
# &site goes onto a tape (write=); its heads, mixed into &echo, drive the pipes (excite=) —
# sound into bodies. The pipes aren't recorded: no loop through the tape and back.
&bar scan(1 1 1 1) step=104bpm
&reel step=104bpm motor=1.4 mass=1 friction=.1 wow=.02 0
&hammer step=&bar/2 label="the hammer: where on the plate" 1 ~ 5 ~ ~ 3 7 ~ 1 ~ ~ 6 ~ 2 ~ 4
&beam step=&bar label="the beam" 4 ~ ~ 0 ~ 4 ~ ~
&kick step=&bar*2 label="the spring, kicked" 3 ~ ~ 3?
&pluck step=&bar label="the wire" 2 ~ 2 2 ~ ~ 6 ~
&plate body=plate loop=D3 ring=3 hard=.85 board=none 0
&girder body=bar loop=G2 ring=2.5 hard=.9 board=none 0
&spring body=spring loop=100 ring=2.5 hard=.7 board=none 0
&wire body=wire loop=D1 ring=3 hard=.6 board=none 0
&site [&hammer * &plate * .35, &beam * &girder * .4, &kick * &spring * .3, &pluck * &wire * .4]

&tape step=&reel write=&site length=5 erase=.3 tone=2400 drive=.4 hiss=.008 label="the tape: five seconds of the site"
&h1 play=&tape at=1.15 label="head 1"
&h2 play=&tape at=2.3 wander=.05 wanderhz=.11 label="head 2, wandering"
&echo [&h1 * .5, &h2 * .5]
&pipeA body=pipe loop=D2 ring=4 board=none excite=&echo label="a pipe, driven by the tape" 0
&pipeB body=pipe loop=A2 ring=4 board=none excite=&echo label="another" 0

&out level=-9 loop=SAMPLE_RATE map=sample [&site, &pipeA * .4, &h1 * .2] [&site, &pipeB * .4, &h2 * .2]`,
  },
  kalimba: {
    source: `&about title="Kalimba" tags="world, basics, sound" label="The smallest tuned instrument: one resonator, its braid its tines — eight of them, all on the board they share. A tune plucks them, each note the tine nearest its pitch; the board carries every one to the others, which answer faintly. Tap the pads round it to play along; hold it to stop it ringing."
# Kalimba — a resonator's braid is its exciters: 0 2 4 7 9 12 14 16, semitones from its fundamental
# (none written: the twelve). body=tine is what each is; they share a board (a box, an octave down)
# and each rings the others through it. A note plucks the tine nearest its pitch.
&bar scan(1 1 1 1) step=92bpm
&notes 0 2 4 7 9 12 14 16
&tune over=&notes step=&bar/2 label="the tune" 0 2 4 ~ 3 4 5 ~ 4 2 1 ~ 0 ~ ~ ~ 5 ~ 4 3 2 ~ 1 2 0 ~ ~ ~ 7 6 5 ~
&kalimba body=tine loop=C4 ring=3 hard=.3 coupling=.06 label="the kalimba: eight tines on one board" 0 2 4 7 9 12 14 16

&out level=-15.5 loop=SAMPLE_RATE map=sample [&tune * &kalimba * .5] [&tune * &kalimba * .5]
&ring scope=spectrum label="the kalimba ringing: every tine" &kalimba`,
  },
  harmonograph: {
    source: `&about title="Harmonograph" tags="experimental, basics, sound" label="Two tuning forks, a tonic and its fifth (0 and 7), struck together; each drives one axis of an oscilloscope, x and y, and the figure they draw is a Lissajous curve — 3 : 2, slowly turning (the fifth is tempered), shrinking as they ring away. The tonic sounds left, the fifth right."
# Harmonograph — two resonators (forks), struck together every six seconds. &screen is an
# oscilloscope (scope=xy): its first channel across, its second up. A fifth draws a 3 : 2 figure.
&bar scan(1 1 1 1) step=60bpm
&strike step=&bar*6 label="struck together" 0
&tonic body=fork loop=A3 ring=7 hard=.3 board=none label="the tonic" 0
&fifth body=fork loop=A3 ring=7 hard=.3 board=none label="its fifth" 7
&screen scope=xy label="x: the tonic · y: its fifth" &tonic &fifth

&out level=-3 loop=SAMPLE_RATE map=sample [&strike * &tonic * .5] [&strike * &fifth * .5]`,
  },
  fiveto12: {
    source: `&about title="5 to 12" tags="experimental, Stockhausen, modal, sound" label="A day of music, anchored to the clock: it begins at 11:55 and plays where the day stands. Twelve blocks of two hours, a mode each — down from Ionian to the Locrian nadir, up again to the Lydian zenith; twelve keys of ten minutes, by fifths going down, by fourths coming up (a new dawn: strange, full of hope). Every bar sounds all seven notes, on its mode's 12/8 bell; five dimensions in counterpoint — melody, rhythm, harmony, dynamics, space."
# 5 to 12 — law=fiveto12 computes every note of the day: 84 steps a minute, 70 bars of 12/8 to a
# key, each key's row derived from it. Phrase by phrase, the five operations — translation,
# rotation, inversion, retrograde, multiplication (the Apple: ×5 mod 7) — each move their own
# dimension; the second half of every key mirrors the first. anchor=11.55: play starts where the
# clock stands (Reset: back to 11:55). &sun shows the day (stopped, turn it to choose the moment).
&cycle law=fiveto12 anchor=11.55 step=84bpm label="the law: a day"
&sun sun=&cycle label="the sun: noon above, midnight below — east, west"
&glass s=tri loop=C4 lpf=3200 env=&(map=adsr .004 .9 .25 1.2) label="the voice"
&present [&cycle * &glass * .3]

# memories and messages: a tape of the last two minutes — a head a minute back (seven bars,
# exactly), a head twelve bars back, wandering
&reel step=84bpm 0
&memory step=&reel write=&present length=120 erase=.3 tone=2200 drive=.3 hiss=.003 label="the tape: memories and messages"
&recall play=&memory at=60 label="a memory: a minute ago"
&message play=&memory at=102.857 wander=.04 wanderhz=.07 label="a message: twelve bars ago"

# reflection and inspiration: strings on every semitone, on one board — the music rings them
# (whatever the key), a hand plays them
&strings body=wire loop=C2 ring=5 hard=.4 board=none excite=&present label="the strings: reflection (tap them: inspiration)"
&light scope=spectrum label="the tonal spectrum: the mode, the key, the harmony" &glass

&out level=6 loop=SAMPLE_RATE map=sample [&present, &recall * .35, &strings * .3] [&present, &message * .35, &strings * .3]`,
  },
} as const satisfies Record<string, Preset>;

export type PresetKey = keyof typeof PRESETS;
