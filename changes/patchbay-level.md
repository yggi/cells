### Fixed

- **Patchbay is 1.5 dB quieter** (`postgain=2.36`, was 2.81): played in Cell studio it peaked at +0.1 dB and clipped two samples, over the loudness ceiling (a peak under −1 dB); now −1.4 dB peak, −25.8 dB average there (cells' own renderer: −5.9 dB peak). Its notes and its event snapshot don't move. **What a frontend sees at its next pin:** Patchbay a little quieter, its smoke's loudness check passing.
