# Releasing Dayflow

## 1. Update the version

Keep these three files synchronized:

```text
package.json
src-tauri/Cargo.toml
src-tauri/tauri.conf.json
```

Verify:

```bash
pnpm verify:version
```

## 2. Run local checks

```bash
pnpm install
pnpm verify:version
pnpm typecheck
pnpm build
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

## 3. Commit

```bash
git add .
git commit -m "release: v0.4.0"
```

## 4. Tag and push

The release workflow expects a semantic version tag prefixed by `v`:

```bash
git tag v0.4.0
git push origin main
git push origin v0.4.0
```

The workflow validates that the Git tag and application version match before building.

## 5. GitHub Actions

`release.yml` builds the Linux `.deb` and AppImage on Ubuntu 24.04 and publishes them to a GitHub Release. The workflow needs `contents: write` so the built artifacts can be attached to the release.

## 6. Stable releases later

Once Dayflow has a stable release process, add signed update artifacts and a Tauri updater flow. Do not enable updater signing until a private signing key is stored in GitHub Actions secrets and the release process has been tested end-to-end.
