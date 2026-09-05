# Dayflow Icon Pack

Main icon:
- icon.png / icon-512.png
- icon-256.png
- icon-128.png
- icon-64.png
- icon-48.png
- icon-32.png
- icon-24.png
- icon-16.png

Dark variant:
- icon-dark-256.png
- icon-dark-128.png
- icon-dark-64.png
- icon-dark-48.png
- icon-dark-32.png
- icon-dark-24.png
- icon-dark-16.png

Put the main icon files in:
  src-tauri/icons/

For the current Dayflow project, the important replacement is:
  src-tauri/icons/icon.png

Keep the generated filenames your tauri.conf.json already references unless you intentionally update that config.

For the UI's task/add-task artwork, use icon-128.png or icon-64.png as an image asset rather than using the desktop icon at tiny CSS sizes.

Rebuild:
  pnpm tauri build
