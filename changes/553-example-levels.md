### Fixed

- **Four examples' cards set to −24 dB again, now that both renderers play the same filter** (#553, #523; yggi/cell-studio#567 made Cell studio's low-pass one biquad, as cells' is, decision 074). Measured over each whole piece in cells' renderer (`npm run render`), then checked in Cell studio (`tools/repeatable.mjs` over the same length):
  - Acid-Cell `postgain=1.76` → `2.83`: −28.1 → −24.0 dB average, peak −3.4 dB (Cell studio −24.0, −4.1);
  - Moving `5.55` → `9.12`: −28.3 → −24.0 dB, peak −4.0 dB (Cell studio −23.3, −3.9);
  - Patchbay `2.36` → `2.85`: −25.6 → −24.0 dB, peak −4.9 dB (Cell studio −24.3, −6.2; it clipped there at 2.36 until the filter matched);
  - Baustelle `.785` → `.975`: −25.9 → −24.0 dB, peak −8.0 dB (Cell studio −25.0, −7.7).

  Prelude, BWV 847 and Cellscape, quieter in Cell studio since its filter changed, are at the convention over their whole length (−24.0, −24.0, −23.2 dB) and keep their cards. Each piece's two renders are within 0.6 dB over 12 s. Their notes and event snapshots don't move. **What a frontend sees at its next pin:** these four pieces louder by 1.6 to 4.3 dB.
