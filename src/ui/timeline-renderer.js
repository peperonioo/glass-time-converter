"use strict";

/* Glass Time — ui/timeline-renderer
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- timeline renderer ----------
   Full render is only used on STRUCTURAL changes (zones, date, base).
   Pointer interactions never call this — they patch the DOM directly. */

function render() {
  const keepScroll = els.timeScroll ? els.timeScroll.scrollLeft : 0;
  els.dateInput.value = state.dateISO;
  renderRows();
  renderIsland();
  save();
  bindScrollSync();
  restoreScroll(keepScroll);
  updateDayPins();
}

/* Base-relative hour of the current instant (may land on the rendered
   yesterday/tomorrow), or null when outside the 3-day window. */
function nowHourInView() {
  const baseNow = getParts(new Date(), baseZone().timeZone);
  const todayISO = `${baseNow.year}-${pad(baseNow.month)}-${pad(baseNow.day)}`;
  const dayDiff = Math.round((dateFromISO(todayISO) - dateFromISO(state.dateISO)) / 86400000);
  const h = dayDiff * 24 + baseNow.hour;
  return h >= VIEW_H0 && h < VIEW_H1 ? h : null;
}

/* Keep the app feeling alive between full renders: tick each city's "Ahora"
   time and move the live "now" marker. Text/class only — no rebuild. */
function updateLiveClock() {
  const now = new Date();

  state.zones.forEach(zone => {
    const row = els.rows.querySelector(`.row[data-zone-id="${zone.id}"]`);
    if (!row) return;
    const cur = getParts(now, zone.timeZone);
    const ct = row.querySelector(".current-time");
    if (ct) ct.textContent = `Ahora · ${fmtDisplayTime(cur.hour, cur.minute)}`;
  });

  els.rows.querySelectorAll(".cell.now").forEach(c => c.classList.remove("now"));
  const nh = nowHourInView();
  if (nh !== null) {
    els.rows.querySelectorAll(`.cell[data-hour="${nh}"]`).forEach(c => c.classList.add("now"));
  }
}

/* Keep each scroller's day label pinned to the left edge and showing the date of
   the leftmost visible hour — so it follows the lateral scroll and flips exactly
   when you cross a midnight boundary. All scrollers share the same scrollLeft. */
function updateDayPins(left) {
  const cw = cellWidthPx();
  const L = typeof left === "number" ? left : (els.timeScroll ? els.timeScroll.scrollLeft : 0);
  const idx = Math.max(0, Math.min(VIEW_HOURS - 1, Math.floor(L / cw + 0.001)));
  const h = idx + VIEW_H0; // rendered index -> base-relative hour
  const xform = `translateX(${L}px)`;
  document.querySelectorAll(".hours > .day-pin").forEach(pin => {
    const hoursEl = pin.parentElement;
    const ref = hoursEl.querySelector(`[data-hour="${h}"]`);
    const label = ref ? ref.getAttribute("data-date") || "" : "";
    if (pin.textContent !== label) {
      pin.textContent = label;
      pin.classList.remove("flip");
      void pin.offsetWidth; // restart the flash animation
      pin.classList.add("flip");
    }
    pin.style.transform = xform;
  });
}

function restoreScroll(left) {
  els.timeScroll.scrollLeft = left;
}

/* A cell is part of the selection if the range overlaps its 2 half-hour slots.
   The visual fill is drawn by the floating .sel-band; this flag only drives the
   per-cell text emphasis. */
function cellSelected(h, range) {
  return h * 2 < range.end && h * 2 + 2 > range.start;
}

function renderRows() {
  const base = baseZone();
  const now = new Date();
  const range = normalizedRange();
  const nowHour = nowHourInView();

  els.rows.innerHTML = state.zones.map((zone, index) => {
    const current = getParts(now, zone.timeZone);
    const offset = offsetText(now, zone.timeZone);
    const color = COLORS[index % COLORS.length];

    let prevISO = null;
    const cells = Array.from({ length: VIEW_HOURS }, (_, i) => {
      const h = i + VIEW_H0; // base-relative hour across the 3-day window
      const instant = zonedTimeToUtc(state.dateISO, h, 0, base.timeZone);
      const p = getParts(instant, zone.timeZone);
      const localISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
      const dayShift = localISO < state.dateISO ? "-1" : localISO > state.dateISO ? "+1" : "";
      // Midnight divider where the local day changes; the scroll-following pin
      // shows the date persistently and updates at this boundary.
      const dayStart = h !== VIEW_H0 && localISO !== prevISO;
      prevISO = localISO;
      const dateLabel = `${fmtDate(p)}${dayShift ? ` · ${dayShift}` : ""}`;
      const selected = cellSelected(h, range);
      const phase = zonePhaseAt(zone, instant); // real sun: day / golden / twilight / night
      const otherDay = dayShift === "-1" ? "prev-day" : dayShift === "+1" ? "next-day" : "";
      const nowClass = h === nowHour ? "now" : "";
      const cursor = h === slotHour(state.cursorSlot);

      return `
        <div class="cell ${selected ? "selected" : ""} ${cursor ? "cursor" : ""} sun-${phase} ${otherDay} ${dayStart ? "day-start" : ""} ${nowClass}"
          data-hour="${h}"
          data-date="${escapeHTML(dateLabel)}"
          title="${escapeHTML(zone.label)}: ${fmtDate(p)} ${fmtDisplayTime(p.hour)}">
          <span class="cursor-band" aria-hidden="true"></span>
          <span class="t">${compactHourHTML(p.hour)}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="row" data-zone-id="${zone.id}">
        <div class="city-card ${index === 0 ? "anchor" : ""}" data-action="edit-zone" style="--zone-color:${color}">
          <div class="city-glow" style="background:linear-gradient(180deg, ${color}, rgba(255,255,255,.65))"></div>
          <div class="city-main">
            <div class="city-line">
              <div class="city-name">${escapeHTML(zone.label)}</div>
              ${index === 0 ? `<span class="base-tag">Base</span>` : ""}
              ${index > 0 ? `<span class="rel-offset" title="Diferencia con ${escapeHTML(base.label)}">${relOffsetText(now, zone.timeZone, base.timeZone)}</span>` : ""}
              <div class="offset">${offset}</div>
            </div>
            <div class="current-time">Ahora · ${fmtDisplayTime(current.hour, current.minute)}</div>
            <div class="zone-name">${escapeHTML(zone.timeZone)}</div>
          </div>
          <div class="city-actions">
            ${index > 0 ? `<button class="mini-btn make-base" title="Hacer base">⌖</button>` : ""}
            ${state.zones.length > 1 ? `<button class="mini-btn remove-zone" title="Eliminar">×</button>` : ""}
          </div>
        </div>
        <div class="hours" style="--sel-start:${range.start - VIEW_SLOT0}; --sel-len:${range.durationSlots};">
          ${cells}
          <div class="sel-band" aria-hidden="true"></div>
          <div class="day-pin" aria-hidden="true"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderIsland() {
  const startInstant = selectedInstant();
  const endInstant = selectedEndInstant();
  const base = baseZone();
  const baseStart = getParts(startInstant, base.timeZone);
  const baseEnd = getParts(endInstant, base.timeZone);
  const { durationSlots } = normalizedRange();
  const duration = durationText(durationSlots);
  const baseRange = `${fmtDisplayTime(baseStart.hour, baseStart.minute)}–${fmtDisplayTime(baseEnd.hour, baseEnd.minute)}`;

  els.selectedSummary.textContent = `${duration} seleccionadas`;
  els.selectedDateChip.textContent = `${base.label} · ${fmtDate(baseStart)} · ${baseRange}`;
  updateMood(startInstant);
}

/* Ambient mood: tint the whole scene by the sun phase at the base city for the
   selected time — warm at golden hour, deep at night. Updates live while dragging. */
function updateMood(instant) {
  document.body.dataset.mood = zonePhaseAt(baseZone(), instant || selectedInstant());
}

/* Patch selection styling on the existing DOM — no rebuild, no scroll loss.
   The floating .sel-band glides via a CSS transition when these vars change. */
function applySelectionDOM() {
  const range = normalizedRange();
  els.rows.querySelectorAll(".hours").forEach(hours => {
    hours.style.setProperty("--sel-start", range.start - VIEW_SLOT0);
    hours.style.setProperty("--sel-len", range.durationSlots);
  });
  for (let h = VIEW_H0; h < VIEW_H1; h++) {
    const selected = cellSelected(h, range);
    els.rows.querySelectorAll(`.cell[data-hour="${h}"]`).forEach(cell => {
      cell.classList.toggle("selected", selected);
    });
  }
}

/* Shift the 3-day window by N days keeping the on-screen content (and the
   absolute selection) exactly where it is. This is what makes lateral scroll
   effectively infinite: when you settle on yesterday/tomorrow, that day
   becomes the new base date and a fresh day appears beyond it. */
function shiftWindow(shiftDays) {
  if (!shiftDays) return;
  state.dateISO = addDays(state.dateISO, shiftDays);
  state.selectedStartSlot -= shiftDays * 48;
  state.selectedEndSlot -= shiftDays * 48;
  state.cursorSlot -= shiftDays * 48;
  const keep = els.timeScroll.scrollLeft - shiftDays * 24 * cellWidthPx();
  render();
  els.timeScroll.scrollLeft = Math.max(0, keep);
  updateDayPins();
}

/* After the scroll settles, if the view center has left the middle day,
   re-anchor the window around the day being looked at. */
function maybeShiftWindow() {
  if (drag.active || rowDrag.active) return;
  const cw = cellWidthPx();
  const sc = els.timeScroll;
  const visibleHours = (sc.clientWidth - parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--city"))) / cw;
  const center = sc.scrollLeft / cw + Math.max(1, visibleHours) / 2; // rendered-hour units
  if (center < 24) shiftWindow(-1);
  else if (center >= 48) shiftWindow(1);
}

/* Single native scroller — no JS row-syncing at all. Day pins update once per
   frame; the window re-anchors shortly after the scroll goes idle. */
function bindScrollSync() {
  let pinRAF = 0;
  let idleTimer = 0;
  els.timeScroll.onscroll = () => {
    if (!pinRAF) {
      pinRAF = requestAnimationFrame(() => { pinRAF = 0; updateDayPins(); });
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(maybeShiftWindow, 220);
  };
}

/* Re-anchor the base date to the selection (canonical form) after the user
   commits a selection outside the middle day. Keeps the view visually still. */
function applyCanonical() {
  const shift = canonicalizeSelection();
  if (shift) {
    const keep = els.timeScroll.scrollLeft - shift * 24 * cellWidthPx();
    render();
    els.timeScroll.scrollLeft = Math.max(0, keep);
    updateDayPins();
  }
  return shift;
}

function focusHour() {
  const target = Math.max(0, (slotHour(normalizedRange().start) - VIEW_H0) * cellWidthPx() - 180);
  els.timeScroll.scrollTo({ left: target, behavior: "smooth" });
}
