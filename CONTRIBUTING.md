# Contributing to Megatracker

Bug reports, wrong rules data and ideas are welcome as
[issues](https://github.com/torontomegaempires/megatracker/issues/new/choose).

## Pull requests

- `main` is protected: every change goes through a pull request.
- Branch from an up-to-date `origin/main`, and rebase onto it again before opening the pull
  request. A pull request merges only once it is up to date with `main`.
- Run `npm test` and `npm run build` before pushing. The **Test and build** check runs both
  and must pass.
- Game rules live in `src/engine/` as pure functions; add or update a Vitest test when you
  change them.
- Don't edit `src/data/advances-*.ts`, `calamities-*.ts` or `interactions.ts` by hand. They
  are generated from the Mega Empires Calculator by `scripts/import-calculator-data.mjs`.
- Check UI changes in `npm run dev` at phone width as well as desktop.

## Changelog

- Add a line to `CHANGELOG.md` only for changes players will notice, not tooling or CI.
- Put it under `## [Unreleased]`, in an `### Added`, `### Changed` or `### Fixed` group. CI
  fails the pull request if it lands anywhere else.
- Don't change version headings or the version in `package.json`; releases do that.

## Licence

Megatracker is shared under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
(see [LICENSE.md](LICENSE.md)). By contributing, you agree your contribution is shared under
the same licence.
