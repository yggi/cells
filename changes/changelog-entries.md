### Repository

- **What isn't released yet is in [`changes/`](changes/), one file per pull request** in place of a line under *Unreleased*, so that two pull requests no longer conflict on the changelog; a release gathers them here (`npm run changelog -- gather`), so the released sections a frontend reads before it moves its pin keep their form. Nothing in the package changes.
