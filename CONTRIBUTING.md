# Contributing to Dayflow

Thanks for contributing.

## Development setup

Follow the setup instructions in [README.md](README.md), then run:

```bash
pnpm install
pnpm verify:version
pnpm typecheck
pnpm tauri dev
```

## Before opening a pull request

Run:

```bash
pnpm verify:version
pnpm typecheck
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

If a check is not applicable to your change, explain why in the pull request.

## Pull requests

Keep pull requests focused. A good pull request should explain:

- what changed
- why it changed
- how it was tested
- any migration or compatibility impact

Avoid committing generated build output such as `dist/` or `src-tauri/target/`.

## Commits

Use short, descriptive commit messages. Conventional Commit-style prefixes are recommended, for example:

```text
feat: add recurring tasks
fix: restore reminder after task edit
ui: refine timeline spacing
build: update Linux release workflow
```
