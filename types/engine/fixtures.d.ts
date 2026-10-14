/**
 * Pieces kept for the tests as they were written, after the examples moved on: each still exercises a
 * mechanism the language keeps, which its example no longer uses.
 */
/**
 * Drunken Sailor before #10's corpus round: a melody line read through a shifted table (&B over=&lead[<<]),
 * motifs reading the table of whoever splices them, and drums read by number through a kit (&kit).
 */
export declare const SAILOR_WITH_KIT = "&piece title=\"Drunken Sailor: D Dorian, with a kit\" tags=\"genre:world, genre:folk, modal, rhythm\" label=\"Drunken Sailor in D Dorian, with a fiddle, a bass and a drum kit.\" about=&mix\n# D Dorian. The second line is the first, read one step lower (&lead[<<]).\n&bar scan(3 3 3 3) step=free(112bpm, 90..140)\n&lead over=scale(2,3)\n\n&m1 4!4\n&m2 4 4 0 2\n&m3 3 2 0 0\n&m4 0@2!2\n&A over=&lead &m1 &m2\n&B over=&lead[<<] &m1 &m2\n&C over=&lead &m3 &m4\n&tune step=&bar*2 &A &B &A &C\n\n&b over=&lead 4@2!4 3@2!4\n&bassline step=&bar*2 &b!2\n&drums over=&kit step=&bar*2 0 2 1 2!4     # read through the kit: 0 kick, 1 snare, 2 hat\n\n&fiddle s=saw loop=C5 lpf=3000 env=&(map=adsr .01 .15 .5 .1)\n&bass s=square loop=C2 lpf=600 env=&(map=adsr .005 .25 0 .05)\n&bd s=sine loop=A1 pitch=0..24 * &(map=adsr 0 .05 0 0) env=&(map=adsr 0 .3 0 .05)\n&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .04)\n&hh s=white hpf=7000 env=&(map=adsr 0 .04 0 .02)\n&kit &bd &sd &hh\n&mix postgain=1.78 loop=SAMPLE_RATE map=sample [&tune * &fiddle * 0.6, &bassline * &bass * 0.8, &drums * 0.6]\n";
