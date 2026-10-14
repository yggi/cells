# The MIDI library: Bach, the Notebook for Anna Magdalena Bach (1725)

MIDI files the app comes with: a collection of its MIDI library, a cell of its own in the library ([docs/ui/midi.md](../../docs/ui/midi.md#the-midi-library)). The 19 keyboard pieces Mutopia has from it (its guitar and trumpet arrangements left out): the minuets, polonaises and marches, the arias and chorale settings. Several are not by Bach himself (the Minuets in G, Anh. 114–115, are by Christian Petzold); the catalogue numbers are as Mutopia gives them.

Each is built from its LilyPond source as the [Mutopia Project](https://www.mutopiaproject.org/) publishes it, with its repeats played (`tools/mutopia.py staff`: Mutopia's own MIDI plays a repeat once, and a dance is mostly its repeats; the Air, which has none, is Mutopia's file), renamed; [index.json](index.json) says the same as this table, for the app, which shows each file's credit in its details, puts it in the copyright field of a `.mid` saved from it and writes it as comments into the cells it converts to. [voices/](voices/) has each piece again with a track a voice, built from its LilyPond source (`tools/mutopia.py voice`): the voices as the typesetter wrote them, the ground truth the disassembler's voice separation is measured against ([docs/notes/disassembler.md](../../docs/notes/disassembler.md)); not in the app.

The music is in the public domain. A typesetting under Creative Commons Attribution-ShareAlike (CC BY-SA 2.5, 3.0 or 4.0) is used here under that licence: credit to its typesetter and to the Mutopia Project, and what is made from the file itself shares it alike.

| File | Piece | Typeset by | Licence | Source |
| --- | --- | --- | --- | --- |
| [anh113-minuet.mid](anh113-minuet.mid) | Menuet, BWV Anh. 113 | Allen Garvin | Public Domain | [Mutopia-2013/01/06-74](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh113/anna-magdalena-03/) |
| [anh114-minuet.mid](anh114-minuet.mid) | Menuet, BWV Anh. 114 | Allen Garvin | Public Domain | [Mutopia-2017/01/19-75](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh114/anna-magdalena-04/) |
| [anh115-minuet.mid](anh115-minuet.mid) | Menuet, BWV Anh. 115 | Allen Garvin | Public Domain | [Mutopia-2015/08/21-76](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh115/anna-magdalena-05/) |
| [anh116-minuet.mid](anh116-minuet.mid) | Menuet, BWV Anh. 116 | Allen Garvin | Public Domain | [Mutopia-2013/01/06-77](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh116/anna-magdalena-07/) |
| [anh117b-polonaise.mid](anh117b-polonaise.mid) | Polonaise in F major, BWV Anh. 117b | Steven McDougall | Public Domain | [Mutopia-2007/07/30-1015](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh117b/BWV-117b/) |
| [anh118-minuet.mid](anh118-minuet.mid) | Minuet in B-flat major, BWV Anh. 118 | Steven McDougall | Public Domain | [Mutopia-2007/07/30-1014](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh118/BWV-118/) |
| [anh119-polonaise.mid](anh119-polonaise.mid) | Polonaise in G minor, BWV Anh. 119 | Steven McDougall | Public Domain | [Mutopia-2007/07/30-1016](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh119/BWV-119/) |
| [anh120-minuet.mid](anh120-minuet.mid) | Minuet in A minor, BWV Anh. 120 | Steven McDougall | Public Domain | [Mutopia-2009/01/06-1612](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh120/BWV-120/) |
| [anh121-minuet.mid](anh121-minuet.mid) | Minuet in C minor, BWV Anh. 121 | Steven McDougall | Public Domain | [Mutopia-2011/06/15-1613](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh121/BWV-121/) |
| [anh126-musette.mid](anh126-musette.mid) | Musette, BWV Anh. 126 | Allen Garvin | Public Domain | [Mutopia-2013/01/06-79](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh126/anna-magdalena-22/) |
| [anh127-march.mid](anh127-march.mid) | March in E-flat major, BWV Anh. 127 | Steven McDougall | Public Domain | [Mutopia-2009/01/06-1614](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh127/BWV-127/) |
| [anh128-polonaise.mid](anh128-polonaise.mid) | Polonaise in D minor, BWV Anh. 128 | Steven McDougall | Public Domain | [Mutopia-2009/01/06-1615](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh128/BWV-128/) |
| [anh131-air.mid](anh131-air.mid) | Air, BWV Anh. 131 | Anonymous | Creative Commons Attribution-ShareAlike 2.5 | [Mutopia-2006/05/17-767](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh131/air/) |
| [bwv691-chorale-prelude.mid](bwv691-chorale-prelude.mid) | Chorale prelude “Wer nur den lieben Gott läßt walten”, BWV Anh. 691 | Steven McDougall | Public Domain | [Mutopia-2009/01/06-1616](https://www.mutopiaproject.org/ftp/BachJS/BWVAnh691/BWV-691/) |
| [bwv510-chorale.mid](bwv510-chorale.mid) | Chorale setting "Gib dich zufrieden und sei stille" in F major, BWV 510 | Steven McDougall | Public Domain | [Mutopia-2007/07/22-1006](https://www.mutopiaproject.org/ftp/BachJS/BWV510/BWV-510/) |
| [bwv511-chorale.mid](bwv511-chorale.mid) | Chorale setting "Gib dich zufrieden und sei stille" in D minor, BWV 511 | Steven McDougall | Public Domain | [Mutopia-2007/07/24-1009](https://www.mutopiaproject.org/ftp/BachJS/BWV511/BWV-511/) |
| [bwv512-chorale.mid](bwv512-chorale.mid) | Chorale setting "Gib dich zufrieden und sei stille" in E minor, BWV 512 | Steven McDougall | Public Domain | [Mutopia-2007/07/24-1010](https://www.mutopiaproject.org/ftp/BachJS/BWV512/BWV-512/) |
| [bwv515-aria.mid](bwv515-aria.mid) | Aria, BWV 515 | Allen Garvin | Public Domain | [Mutopia-2013/01/22-78](https://www.mutopiaproject.org/ftp/BachJS/BWV515/anna-magdalena-20a/) |
| [bwv516-aria.mid](bwv516-aria.mid) | Aria “Warum betrübst du dich”, BWV 516 | Steven McDougall | Public Domain | [Mutopia-2009/01/12-1622](https://www.mutopiaproject.org/ftp/BachJS/BWV516/BWV-516/) |
