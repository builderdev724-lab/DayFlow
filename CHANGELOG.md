# Changelog

All notable changes to Dayflow are documented here.

## [Unreleased]

- Continue refining the desktop UI and productivity workflows.
- Improve notification reliability and platform integration.
- Expand automated release and quality checks.

## [0.4.0] - 2026-09-04

- Reworked Dayflow around a clearer productivity-app layout.
- Added dynamic fantasy pixel-art hero scenes for morning, daytime, evening, and night.
- Added dark mode and persistent appearance preference.
- Replaced webview notification permission flow with direct native Linux notifications in the Rust layer.
- Moved task reminder scheduling to a Rust background worker so reminders continue while the Dayflow window is hidden.
- Added focus duration presets and custom duration.
- Added focus start/finish notifications.
- Added a new Dayflow application icon.
- Increased small-text contrast and sizing throughout the UI.
- Added repository CI, release automation, contribution guidelines, and project licensing.
