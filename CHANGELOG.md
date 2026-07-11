# Changelog

All notable changes to Glass Time.

## [0.11.1] — 2026-07-12

### Removed — redundant header row

- The hour-strip header duplicated the base city's row exactly (same timezone,
  same hours) — a leftover from the original per-row-scroller design. It's gone,
  along with its side panel: the base city is the first row (with its "Base"
  pill), the date lives in the toolbar input and the scroll-following day pins,
  and the duration lives in the Dynamic Island. The timeline gains ~74px of
  vertical space and loses a full strip of repeated numbers.

## [0.11.0] — 2026-07-12

### Added — multi-day timeline (infinite lateral scroll)

- The timeline now renders a **3-day window** (yesterday · base date · tomorrow,
  72 hour columns) instead of a single day:
  - **Scrolling sideways is effectively infinite**: shortly after the scroll
    settles on an adjacent day, the window re-anchors around it (the base date
    follows the day you're looking at; the view doesn't move; the selected
    absolute instant never changes).
  - **Selecting on the rendered yesterday/tomorrow re-anchors the base date to
    that day.** This is the "session with my psychologist" flow: with Bali as
    base, scroll/tap directly on Buenos Aires' *26th 8PM* — even when that lands
    on Bali's 27th — and save it.
  - **Ranges can cross midnight** (e.g. 11PM–2AM) and stay correct end-to-end
    (island, calendar export, share).
  - Keyboard arrows walk across midnight into the adjacent day.
  - Persistence and share links always store the canonical form (selection
    start inside the base date), so nothing changes for existing links.

### Changed — clean calendar description

- Google Calendar / .ics descriptions are now human lines only, e.g.
  `Bali · Lun 27/07 · 7AM–8AM` per city — no IANA ids, no GMT offsets, no
  "Creado desde…" boilerplate. ("Copiar" uses the same clean lines.)

### Internal

- Slot model generalized to base-relative half-hours across the rendered window
  (`VIEW_H0=-24 … VIEW_H1=48`), with `canonicalizeSelection()` re-anchoring and
  canonical-form persistence. Service-worker cache bumped to v0.11.0.

## [0.10.0] — 2026-07-08

### Added — "the app knows you" + city management

- **Auto base city.** On first run the base city is the user's own timezone
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`), labeled from the curated
  library or prettified from the IANA name, followed by New York / London /
  Tokyo (duplicates skipped).
- **Full IANA city search.** The picker now searches all ~418 runtime zones
  (`Intl.supportedValuesOf("timeZone")`) beyond the curated list — accent-
  insensitive ("bogota" finds "Bogotá"), curated matches first, capped at 60
  results. No data shipped, no API. Unknown zones get sun-engine coords from
  their UTC offset (existing fallback).
- **Hours-vs-base chip.** Every non-base row shows the difference people
  actually think in: "+8h", "−5:30", "±0h". On phones it replaces the GMT badge
  in the row corner (base keeps GMT; full GMT stays in the picker).
- **Drag to reorder cities.** Drag a city card vertically (mouse: just drag;
  touch: hold ~220ms then drag, with haptic). Dropping into first place makes
  that city the base, preserving the selected real-world instant. A quick
  vertical swipe still scrolls.
- **Double-tap a city → jump to now** (selection moves to the current instant;
  toast shows that city's local time). Single tap still opens the picker, now
  ~300ms delayed to disambiguate.

### Changed

- **Dates are now Spanish everywhere** — "Mié 08/07" in header/pins/chips/share
  (was English "Thu"). Formatter locale is es-ES with per-zone formatter caching
  (getParts runs 100+ times per render; formatters are now built once per zone).
- Sticky city column is fully opaque — scrolled cells no longer ghost through.
- Service-worker cache bumped to v0.10.0.

## [0.9.5] — 2026-06-25

### Changed — single scroll container (definitive smooth-scroll fix)

- Replaced the 5 independently-scrolling rows (header + each city) that were kept
  in step with JS `scrollLeft` writes — an architecture that can't be smooth on
  mobile — with **one native horizontal scroller**. The city column is now
  `position: sticky` so it stays pinned while the hours scroll. No JS sync at all;
  scrolling is fully native. The day-pin update is the only on-scroll work, and
  it's throttled to one rAF per frame.
- Sticky city cards use an opaque glass base so scrolled cells don't show through.
- Bumped the service-worker cache (`v0.9.5`) so the update is actually delivered
  instead of a stale cached build.

## [0.9.4] — 2026-06-25

### Fixed — mobile scroll smoothness (the real causes)

- Removed `will-change` from `.cursor-band`. There is one per cell (~144), so it
  was forcing ~144 composited GPU layers — a major cause of the low-FPS scrolling
  on phones.
- Dropped the **live `backdrop-filter` from the scrolling board** on mobile
  (Safari re-rasterizes the blur every scroll frame); the board now uses a more
  opaque glass base that looks frosted but scrolls smoothly.
- Dropped `will-change` from the (static) aurora on mobile so it no longer holds
  large blurred layers in GPU memory.

## [0.9.3] — 2026-06-25

### Fixed — mobile polish

- **Lateral scroll FPS.** The drifting aurora forced every glass panel's
  backdrop-filter to recompute each frame; on phones the aurora is now static
  (still pretty) and the band shimmer/breathe + logo float are paused. The
  day-pin update is throttled to one rAF per frame while row-sync stays
  immediate. Backdrop blur is lighter on mobile.
- **Long-press** to start a touch selection is snappier (280ms → 200ms).
- **Notch / Dynamic Island** no longer covers the logo — added
  `env(safe-area-inset-top)` padding (needs `viewport-fit=cover`, already set).
- **Narrower city column on mobile** (≈138px → 118px) to show more hours; the
  GMT offset moved to the row's top-right corner so full names ("New York") fit
  on one line, with single-line current-time and IANA.

## [0.9.2] — 2026-06-25

### Fixed — touch range selection

- You can now **select a multi-hour range on touch**: hold still for ~280ms to
  enter selection mode (with a haptic where supported), then drag. A quick swipe
  still scrolls the timeline, and a quick tap still selects 30m.
- While a touch selection is active, the scrollers are locked (`touch-action` +
  non-passive `touchmove` preventDefault) so the drag selects instead of panning.
- Suppressed the native iOS **text-selection / long-press magnifier** on the
  timeline (`user-select` / `-webkit-touch-callout`), which used to fire instead
  of selecting.

## [0.9.1] — 2026-06-25

### Fixed

- **Mobile vertical layout** — the header chrome took up too much space, pushing
  the timeline far down. On phones: brand subtitle and the "Hora seleccionada"
  label are hidden, the island/toolbar are slimmer, the date controls fit on a
  single row (label hidden), the hint and the redundant "Copiar" are hidden
  (Compartir covers it), and the base city's "Base" pill is hidden (the left
  panel already shows it). The timeline now starts roughly twice as high.
- **GMT offset rounding** — a seconds-precision bug could show e.g. "GMT+9:59"
  instead of "GMT+10"; offsets are now computed against the minute-floored
  instant.

## [0.9.0] — 2026-06-25

### Added — Tier 1: real sun, reactive mood, sharing

- **Real sun engine.** Day/night tints are no longer fixed clock bands — they
  come from the **actual solar altitude** at each city's coordinates for the
  selected date (pure astronomy, no API). Cells read as night → twilight →
  golden hour → full day, matching reality (e.g. Sydney's short winter day,
  Madrid's long summer day, New York's sunset golden hour). Coordinates were
  added to the timezone library; unknown zones fall back to a longitude derived
  from their UTC offset.
- **Ambient mood.** The whole scene gently tints to the sun phase at the base
  city for the selected time — warm at golden hour, deep blue at night, clear by
  day — and crossfades live as you drag the selection.
- **Share.** A new "Compartir" action generates a premium **glass image card**
  (canvas → PNG) of the selection across all cities and a **link that encodes the
  full state** (`?d=&s=&e=&z=`). Uses the Web Share API where available, else
  downloads the PNG and copies the link. Opening a shared link restores the
  cities, date and range, then cleans the URL.

### Internal

- New modules `core/sun-engine.js` and `ui/share.js` (build order updated).

## [0.8.0] — 2026-06-25

### Added — "living" UI (elegant, smooth, ambient)

- **Ambient aurora background:** three soft light orbs drift slowly behind the
  glass for a calm, alive atmosphere (pure CSS transform animation).
- **Liquid shimmer:** a light sweep glides across the selection band (pauses
  while you actively drag).
- **Live clock:** each city's "Ahora · <time>" and the pulsing "now" marker now
  update by themselves every 30s and re-sync on the minute — the app feels alive
  without a re-render.
- **Floating logo** and a **staggered row entrance** on first load.
- All motion is GPU-friendly (transform/opacity) and fully disabled under
  `prefers-reduced-motion`.

## [0.7.4] — 2026-06-25

### Changed — readable "daylight map"

- Day/night tinting is now actually perceptible (was ~0.045 opacity). Each hour
  reads as deep **night** (quiet hours, dark + dimmed numbers) → **dawn** (warm)
  → bright **core day** (the easy "good hours" to scan) → **dusk** (violet).
- **Day separation:** cells on the previous/next calendar day get a faint
  cool/warm veil with slightly dimmed numbers, so each day reads as its own
  block — and the midnight boundary is now a clear accented divider.
- Net effect: you can scan a row and instantly tell when it's day/night in that
  city, and where one day ends and the next begins.

## [0.7.3] — 2026-06-25

### Changed — scroll-following day labels

- The date is now a **pinned label that follows the horizontal scroll** on the
  header and on every city row. It stays at the left edge across all the hours of
  a day and **flips to the new date exactly when you scroll past that timezone's
  midnight** (e.g. New York stays "Wed 24/06 · -1" while the others already read
  "Thu 25/06"). A small flash animates the change.
- This replaces the fixed-position date that scrolled out of view in 0.7.2 (the
  authoritative full base date in the left panel is still there).
- Header hour numbers are now vertically centered so the pinned label sits in a
  clean top gutter without covering them. Midnight dividers remain.

## [0.7.2] — 2026-06-25

Visual de-cluttering + installable PWA.

### Changed — less text, same information

- **Header dates no longer repeat on all 24 cells.** The date label is shown only
  where a day begins.
- **City rows: the "Día ±1" badge on every shifted cell is gone.** Each local day
  is now marked once with a subtle midnight **divider** + a single date chip
  (`weekday dd/mm · ±1`). No information is lost — it's just shown once per day
  segment instead of per cell.
- **IANA timezone** (e.g. `America/New_York`) demoted to the quietest line
  (smaller, dimmer); city name + current local time are now the prominent info.
- City **actions reveal on hover** (overlay) so the city name keeps the full row
  width and stays prominent (fixes truncation like "S.." / "Ne..").
- Shorter toolbar hint and a cleaner "Ahora · <time>" line.

### Added — PWA (installable, offline)

- `manifest.webmanifest`, a service worker (offline app-shell cache), and
  generated icons (192 / 512 / maskable). The app is installable and works
  offline.
- `node src/build.js` now also emits a Pages-ready **`/docs`** site
  (`index.html` with manifest + SW tags, assets, `.nojekyll`). All PWA paths are
  relative so it works under the GitHub Pages project subpath.
- `dist/glass-time.html` stays a clean, dependency-free single file (no SW
  references) for offline use straight from disk.

## [0.7.1] — 2026-06-25

Premium selection feel + elegant motion. Builds on the 0.7.0 stabilisation
without touching the conversion/calendar logic.

### Changed — selection feel

- **Continuous floating selection band.** The selection used to be painted
  cell-by-cell (each cell's `::before`), which made an extending range look like
  it "stepped". It is now a single liquid-glass band per row, positioned from
  CSS variables (`--sel-start` / `--sel-len`, in half-hour units) on the row's
  `.hours` element. The band **glides** between half-hour slots via a CSS
  transition on `left`/`width`.
- **Adaptive glide timing.** While a drag is in progress (`body.selecting`) the
  band tracks the pointer snappily (~0.12s); on release it settles with a longer
  eased glide (~0.42s). Keyboard arrow nudges and base/timezone changes also
  glide.
- The active edge now reads as a bright **handle** (the cursor band sits above
  the selection), making drag direction obvious. Selected hour numbers brighten
  to full white for contrast.

### Added — motion & polish

- Staggered **entrance animation** for the nav, toolbar and board on load.
- Subtle **breathing glow** on the selection band (paused during active drag).
- Gentle **pulse** on the live "now" marker.
- **Tactile press** feedback (scale-down) on buttons, city cards, cells, picker
  and calendar options.
- Soft ease-in for the bottom-sheet list and calendar popover contents.
- `prefers-reduced-motion` now disables animations as well as transitions.

### Notes

- Purely presentational: timezone conversion, persistence, calendar export and
  the pointer/scroll model from 0.7.0 are unchanged and still pass the QA sweep.

## [0.7.0] — 2026-06-25

Stabilisation + modularisation pass. No new product features; the focus was
killing the scroll/selection bugs, fixing a latent timezone-conversion bug, and
splitting the single file into a maintainable module structure.

### Fixed

- **Critical — timeline no longer jumps, flickers, or resets scroll position.**
  Selecting a range used to call a full `render()` on every `pointermove`, which
  rebuilt the entire timeline via `innerHTML` and lost the horizontal scroll
  position. Pointer interactions now patch the existing DOM only
  (`applySelectionDOM`, class-only cursor updates). `render()` is reserved for
  structural changes (zones, date, base timezone).
- **Critical — timezone conversion was wrong.** The `zonedTimeToUtc` fixed-point
  iteration did not anchor to the target wall time, so it diverged: e.g. 9:00 AM
  on 25/06 in Sydney resolved to 3:00 AM on 24/06. The header and Dynamic Island
  showed dates that disagreed with the date picker. The iteration is now anchored
  to the target and converges in 1–2 passes, including across DST boundaries.

### Changed — interaction model

- **Drag threshold.** A selection only starts after the pointer crosses a small
  threshold (5px). A normal horizontal swipe no longer creates an accidental
  selection.
- **Pointer-type aware gestures.**
  - Touch: a moving touch is treated as a scroll and never starts a selection, so
    horizontal panning stays native and smooth. A touch *tap* still selects 30m.
  - Mouse / pen: a tap selects (30m on a cell, 1h on a header hour); a drag past
    the threshold selects a range.
- **Pointer capture** is acquired only once a real drag has started, so it never
  hijacks trackpad/touch panning.
- **Scroll position is preserved** across every structural rerender, and all
  timeline scrollers (header + each city row) stay synchronised in both
  directions.
- Slot maths now maps an absolute `clientX` to a half-hour slot via the row's
  geometry, so 30-minute precision is correct regardless of scroll offset.

### Changed — UI / polish

- **Cursor band** is a soft, near-full-cell vertical band sitting *behind* the
  time number and AM/PM label (was effectively a thin overlay). It appears across
  every row at the active time and animates via opacity/transform only.
- **Dynamic Island** stays concise: `"<duration> seleccionadas"` plus a secondary
  line `"<Base> · <day dd/mm> · <range>"`. It never lists every city.
- The fixed left header shows `"Seleccionado · <duration>"`.
- Added a **"Base"** tag on the anchor city row for clearer hierarchy; city names
  in the picker/rows keep name, local time, GMT offset and IANA zone.
- Added an **empty-state** message in the timezone picker.
- `touch-action: pan-x pan-y` + `overscroll-behavior-x: contain` on scrollers for
  natural trackpad/touch panning without page-scroll lock.
- `prefers-reduced-motion` support.

### Changed — date / timezone safety

- End-of-day selections at 24:00 render as **12 AM** (never `24:30`/`25:00`) and
  roll the date forward correctly; ranges crossing midnight stay correct.
- Adding a city as the new base preserves the selected real-world instant and the
  selection duration (previously it only reset the cursor).
- Calendar export (Google + `.ics`) uses the exact selected start/end (not a
  hard-coded one-hour event), tags the base IANA timezone, embeds the converted
  ranges for every city, and the `.ics` includes a 15-minute reminder.

### Architecture

- Split the single HTML file into the target module layout under `/src`:

  ```
  /src
    /core   date-utils.js · timezone-engine.js · calendar-export.js
    /state  store.js · persistence.js
    /ui     timeline-renderer.js · cursor-controller.js · range-selection.js
            timezone-picker.js · calendar-menu.js
    /data   timezone-library.js
    shell.html   (markup + styles, single source)
    build.js     (concatenates modules → dist)
    main.js      (misc actions, event wiring, bootstrap)
  /dist
    glass-time.html   (self-contained, generated bundle — the distributable)
  ```

- Modules are plain classic scripts sharing global scope (no `import`/`export`),
  so the "build" is a dependency-ordered concatenation with **no third-party
  tooling**. Run `node src/build.js` to regenerate `dist/glass-time.html`.
- `dist/glass-time.html` remains a single, dependency-free, self-contained file
  that runs by opening it directly in a browser.

### Notes / limitations

- City → IANA mapping is a curated static list (`timezone-library.js`); it is not
  the full IANA database and has no fuzzy/alias search beyond substring matching.
- Nonexistent local times during a DST spring-forward gap resolve to the nearest
  valid adjacent instant (expected for wall-clock input); ambiguous fall-back
  times pick one side deterministically.
- `dist/glass-time.html` is generated from `/src`; edit the modules and rebuild
  rather than editing the bundle directly.
