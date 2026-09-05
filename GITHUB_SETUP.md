# GitHub Setup

This repository is prepared to be pushed to GitHub as an existing project.

## 1. Create an empty GitHub repository

Create a repository named `dayflow` (or another name you prefer).

Do **not** initialize it with a README, `.gitignore`, or license because this repository already contains them. GitHub documents this as the safer approach when importing an existing local repository because pre-populating those files can create merge conflicts.

## 2. Initialize the local repository

From the Dayflow project root:

```bash
git init
git branch -M main
git add .
git commit -m "chore: initial Dayflow repository"
```

Before the first commit, it is recommended to generate and commit the package lockfile:

```bash
pnpm install
```

This creates `pnpm-lock.yaml`. Commit it with the rest of the repository.

## 3. Connect GitHub

Replace the URL with the repository you created:

```bash
git remote add origin https://github.com/YOUR_USERNAME/dayflow.git
git push -u origin main
```

## 4. Confirm Actions

Open the repository's **Actions** tab. The CI workflow should run automatically for pushes and pull requests.

The CI workflow validates the version, TypeScript project, Vite build, Rust formatting, and Rust compilation.

## 5. Create the first release

Before tagging a release:

```bash
pnpm verify:version
pnpm typecheck
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Commit the final changes, then create a matching tag:

```bash
git add .
git commit -m "release: v0.4.0"
git push origin main

git tag v0.4.0
git push origin v0.4.0
```

The release workflow only accepts tags in the form `vMAJOR.MINOR.PATCH`. It verifies that the tag version matches the three application version fields before building.

## 6. What GitHub Actions publishes

The release workflow builds on Ubuntu 24.04 and publishes:

- `Dayflow_<version>_amd64.deb`
- `Dayflow_<version>_amd64.AppImage`

The `.deb` package is the recommended installation format for Ubuntu.

## 7. Repository settings after the first successful release

Recommended settings:

- Protect the `main` branch.
- Require CI to pass before merging pull requests.
- Keep Actions permissions at the minimum required level.
- Review Dependabot pull requests before merging dependency upgrades.
- Keep release tags immutable after publication unless a release must be replaced deliberately.
