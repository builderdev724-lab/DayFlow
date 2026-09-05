# Dayflow

> **Plan today. Build tomorrow.**

Dayflow is a lightweight, local-first desktop planner for Linux. It is designed for people who want a clear daily plan without accounts, cloud sync, or a heavyweight workspace suite.

The application runs as a native desktop app using **Tauri 2 + React + TypeScript** and stores planner data in **SQLite on the local machine**.

## Why Dayflow

Dayflow is built around one simple workflow:

1. Decide what you need to do.
2. Give it a start and end time.
3. Set a priority and reminder.
4. Work through the timeline.
5. Record what you completed.

The interface intentionally keeps the day visible instead of turning planning into an endless task list.

## Features

- Daily timeline with start/end times
- Task priorities: Low, Medium, High, Urgent
- Task states: Planned, In Progress, Completed, Skipped
- Categories and notes
- Native Linux task reminders
- Reminder intervals before or at task start
- Background reminder worker that remains active while the window is hidden to the tray
- Focus sessions with presets and custom durations
- Focus completion notifications
- Light and dark themes
- Date navigation and monthly calendar
- Task history
- Local SQLite storage
- Local settings and preferences
- Fantasy pixel-art day/evening/night greetings
- Keyboard shortcuts for fast planning
- Ubuntu `.deb` and AppImage packaging

## Privacy model

Dayflow is **local-first**.

Your planner data is stored locally in SQLite. The application does not require a Dayflow account, server, database, or cloud service to manage your tasks.

The app can use the operating system's local notification service to display reminders.

## Technology

| Layer | Technology |
|---|---|
| Desktop runtime | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Build tool | Vite |
| Package manager | pnpm 10 |
| Local database | SQLite via `rusqlite` |
| Notifications | Linux desktop notifications via `notify-rust` |
| Icons | Lucide + custom Dayflow pixel-art assets |

## Project structure

```text
dayflow/
├── src/                    # React application
│   ├── components/         # UI components
│   ├── lib/                # frontend/native bridge helpers
│   ├── types/              # TypeScript domain types
│   ├── App.tsx             # application shell
│   └── styles.css          # application styling
├── public/assets/          # fantasy greeting artwork
├── src-tauri/
│   ├── src/lib.rs          # native commands, SQLite, reminders, tray
│   ├── icons/               # application icons
│   ├── capabilities/        # Tauri permissions
│   └── tauri.conf.json      # desktop and bundle configuration
├── scripts/                # repository maintenance scripts
├── .github/workflows/      # CI and release automation
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── SECURITY.md
```

## Requirements for Ubuntu development

Install the native build dependencies:

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  curl \
  file \
  pkg-config \
  libglib2.0-dev \
  libgtk-3-dev \
  libgdk-pixbuf2.0-dev \
  libpango1.0-dev \
  libcairo2-dev \
  libatk1.0-dev \
  libwebkit2gtk-4.1-dev \
  libjavascriptcoregtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf
```

Install Rust using the official Rust installer, then ensure stable Rust is active:

```bash
rustup toolchain install stable
rustup default stable
```

Enable pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@10.15.0 --activate
```

## Run locally

From the repository root:

```bash
pnpm install
pnpm verify:version
pnpm typecheck
pnpm tauri dev
```

The last command launches the **native Dayflow desktop application**.

## Production build

Build the Linux packages locally:

```bash
pnpm tauri build
```

Artifacts are written to:

```text
src-tauri/target/release/bundle/
├── deb/
└── appimage/
```

For Ubuntu, the `.deb` package is the preferred installation format.

## GitHub releases

The repository includes two GitHub Actions workflows:

- `ci.yml` validates the frontend and Rust project on pushes and pull requests.
- `release.yml` builds the Linux `.deb` and AppImage and publishes them to a GitHub Release when a version tag is pushed.

A normal release flow is:

```bash
# 1. Update the version in package.json, Cargo.toml and tauri.conf.json
# 2. Verify that all three versions match
pnpm verify:version

# 3. Commit the release
# 4. Create a version tag
 git tag v0.4.0
 git push origin v0.4.0
```

The release workflow reads the tag and builds the application on GitHub's Ubuntu runner.

## Before the first GitHub push

Do not create a pre-populated README, `.gitignore`, or license when creating the GitHub repository. This project already contains those files; adding another copy during repository creation can create unnecessary merge conflicts.

Recommended repository settings:

- Keep the default branch protected once active development begins.
- Require the CI workflow to pass before merging pull requests.
- Keep Actions permissions restricted; the release workflow only requests `contents: write` because it needs to publish release assets.
- Use version tags such as `v0.4.0`, `v0.5.0`, and `v1.0.0` for releases.

## Versioning

Dayflow uses semantic-style versions (`MAJOR.MINOR.PATCH`).

The version is intentionally synchronized in three files:

```text
package.json
src-tauri/Cargo.toml
src-tauri/tauri.conf.json
```

`pnpm verify:version` checks that they match before a release.

## License

The Dayflow source code is licensed under the [MIT License](LICENSE).

Third-party dependencies remain under their own licenses. See the dependency metadata and lockfiles for the exact versions used by a build.

The custom Dayflow visual assets and generated pixel-art artwork are project assets; their provenance should be reviewed separately before redistributing those assets outside the project.

## Status

Dayflow is currently in early development. The application is functional, but the data model, notification behavior, installer workflow, and UI may continue to change before the first stable release.
