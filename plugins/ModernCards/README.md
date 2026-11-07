# Modern Cards for Stash

A calmer, modern look for the scene, studio and performer cards, the start page rows and the scene page sidebar (Details and Markers tabs). Nothing moves when you hover.

## Install

1. Copy the `ModernCards` folder into your Stash plugins folder. That's usually `~/.stash/plugins/`; in Docker it's the `/root/.stash/plugins` volume.
2. In Stash, open **Settings → Plugins** and click **Reload plugins**.
3. Make sure **Modern Cards** is enabled, then reload the browser tab.

To remove it, disable or delete the plugin and reload.

## What it changes

**Scene cards**
- Thumbnail shows "MP4·1080p" (bottom left), duration (bottom right), a box badge when organized (top right), and a thin resume bar. Selecting a card shows a dashed circle that turns into a green check.
- Date and studio code above the title, performer chips (up to 4, then "+N"), tag chips (6, then "+N" expands in place) and a 2-line description.
- Footer: plays, O-count, markers, "H.264/AAC · 2.4 GB", rating.

**Start page**
- Row titles in sentence case, "View all" next to the title, arrows in the top-right of the row, no dot pager and no slide animation.
- Studio logos on a fixed 2:1 tile so every logo lines up.
- Performer name, gender, age and country code on the photo; heart only on hover unless favorited; footer with scenes, O-count, rating.

**Scene sidebar**
- Heart button next to "Organized" marks the scene as a favorite. It writes the scene's custom field `favorite` (`1` / `0`) and leaves other custom fields alone.
- Smaller, left-aligned studio logo; one spec line with fps, resolution, file type, codecs and size; same-size toolbar buttons; underline tabs.
- Details tab: performers first as compact rows, then tags, then the description (4 lines plus "Show more"), then created/updated/code as small metadata.
- Markers tab: smaller "+ Create marker" button, markers as a clean list with the time in monospace, Edit appears on hover, thumbnails in a 2-column grid with titles always visible.

## Settings

Under **Settings → Plugins → Modern Cards**. Leave a field empty for the default.

| Setting | Values | Default |
| --- | --- | --- |
| Performer photo preview delay (ms) | any number, `0` = at once | `700` |
| Male performers | `show` (like everyone else), `minimal` (a small pill instead of a full performer card), `hide` (left out of every card and list) | `show` |
| Performer country | `code` (e.g. US), `flag` | `code` |
| Studio on scene cards | `text` (name above the title), `logo` (logo on the thumbnail, linking to the studio and staying visible on hover; "MP4·1080p" moves above the title) | `text` |

Studios without a logo always show the name. Reload the browser tab after changing a setting.

## Files

- `ModernCards.yml`: plugin manifest
- `fonts.css`: Figtree and IBM Plex Mono (latin + latin-ext), embedded as `data:` URIs. Stash's content security policy only allows fonts from Stash itself or `data:`, so Google Fonts links would be blocked. Both fonts are under the SIL Open Font License 1.1, which allows bundling.
- `modern-cards.css`: all styling
- `modern-cards.js`: puts data on the cards that CSS can't reach (performers, tags, codecs, performer name overlay, spec line, Show more), using `PluginApi.patch`

## Requirements

Written against Stash's current `develop` source (November 2026). It needs a Stash version whose plugin API includes `SceneCard.SceneSpecs`, `SceneCard.Details`, `SceneCard.Overlays`, `SceneCard.Popovers`, `PerformerCard`, `PerformerCard.Overlays`, `PerformerCard.Popovers` and `ScenePage`. On older versions, any component that doesn't exist is simply left as is.
