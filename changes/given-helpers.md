### Fixed

- **A line written in place of one `* from` gives keeps the helpers it reads** (yggi/cell-studio#610): the piece's own `&drumsOut play=&drumlines &drums_kit` under `* from band` said `Unknown cell &drums_kit`, because a helper only the overridden line read went with it. A helper the piece's own lines read is given; one nothing else reads still goes with the line it helped. Only texts that said `Unknown cell` change; Cell studio's edit of a given cell (`withUsedLine`) now plays as before.
