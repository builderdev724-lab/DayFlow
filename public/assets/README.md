# Dayflow Clean Visual Assets

These files are cleaned versions of the Dayflow visual assets.

Changes:
- Removed screenshot/UI chrome and visible white gutters from task artwork.
- Removed edge-only white bars from scenic artwork.
- Normalized scenic backgrounds to 1920x1080 (16:9) for consistent CSS `object-fit: cover`.
- Normalized the hero banner to 1920x420.
- Upscaled task pixel art with nearest-neighbor to keep pixel edges crisp.

Recommended UI rules:
- Hero/banner: width:100%; height:100%; object-fit:cover.
- Scenic backgrounds: width:100%; height:100%; object-fit:cover.
- Task art: width:100%; height:100%; object-fit:cover; object-position:center.
- Do not add white background around these image files.
