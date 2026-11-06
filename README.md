# Clean Stash Theme

A calm, modern theme for [Stash](https://github.com/stashapp/stash), packaged as the **Modern Cards** plugin:

- Scene cards with performers, tags, file type and codecs right on the card, plus a photo preview when you hover a performer.
- Start page rows that scroll one page at a time, with no looping slider.
- A dark palette across the app: navbar, settings, modals and forms.
- A tidier scene sidebar: studio logo, performers, description, markers, and a scrubber you can hide.
- Nothing moves on hover.

## Install (with automatic updates)

1. In Stash, open **Settings → Plugins → Available Plugins → Add source**.
2. Enter:
   - **Name:** `Clean Stash Theme`
   - **Source URL:** `https://ricktap.github.io/clean-stash-theme/index.yml`
   - **Local path:** `clean-stash-theme`
3. Open the new source, tick **Modern Cards** and click **Install**.
4. Reload the browser tab.

Updates appear under **Installed Plugins → Check for updates** after every push to `main`.

If you installed the plugin by hand before, delete that `plugins/ModernCards` folder first, so the plugin isn't loaded twice.

## Development

```
plugins/ModernCards/   the plugin (manifest, CSS, JS, bundled fonts)
build_site.sh          builds _site/index.yml and one zip per plugin
.github/workflows/     builds and publishes _site to GitHub Pages on every push
```

Each push to `main` builds a version `<version from the .yml>-<commit hash>`, dated by the last commit that touched the plugin's folder. Stash offers the update when that date is newer than the installed one.

Build locally with `./build_site.sh` and look at `_site/`.

## Fonts

Figtree and IBM Plex Mono are bundled in `fonts.css` under the SIL Open Font License 1.1.
