### Repository

- **The docs-only push check installs first and checks only what the branch changes** (#529). In a checkout with no `node_modules` the pre-push hook's docs path ran a Prettier that wasn't the lockfile's, over the whole repository; it now installs first (`tools/install-first.mjs`, as `npm run verify` does), and `npm run verify:docs` runs Prettier on the files the branch changes from `origin/main` (`tools/docs-format.sh`; the whole repository when the diff can't be read).
