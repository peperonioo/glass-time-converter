"use strict";

/* Glass Time — ui/timeline-renderer
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- timeline renderer ----------
   Full render is only used on STRUCTURAL changes (zones, date, base).
   Pointer interactions never call this — they patch the DOM directly. */

function render() {
  const keepScroll = els.timeScroll ? els.timeScroll.scrollLeft : 0;
  els.dateInput.value = state.dateISO;
  els.baseLabel.textContent = `Base · ${baseZone().label}`;
  // Always-visible base date (the timeline header date can scroll out of view).
  const baseInstant = zonedTimeToUtc(state.dateISO, 12, 0, baseZone().timeZone);
  els.baseDate.textContent = new Intl.DateTimeFormat("es-ES", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    timeZone: baseZone().timeZone
  }).format(baseInstant);
  renderHeader();
  renderRows();
  renderIsland();
  save();
  bindScrollSync();
  restoreScroll(keepScroll);
  updateDayPins();
}

/* Keep the app feeling alive between full renders: tick each city's "Ahora"
   time and move the live "now" marker. Text/class only — no rebuild. */
function updateLiveClock() {
  const now = new Date();
  const base = baseZone();
  const baseNow = getParts(now, base.timeZone);
  const isToday = `${baseNow.year}-${pad(baseNow.month)}-${pad(baseNow.day)}` === state.dateISO;

  state.zones.forEach(zone => {
    const row = els.rows.querySelector(`.row[data-zone-id="${zone.id}"]`);
    if (!row) return;
    const cur = getParts(now, zone.timeZone);
    const ct = row.querySelector(".current-time");
    if (ct) ct.textContent = `Ahora · ${fmtDisplayTime(cur.hour, cur.minute)}`;
  });

  els.rows.querySelectorAll(".cell.now").forEach(c => c.classList.remove("now"));
  if (isToday) {
    els.rows.querySelectorAll(`.cell[data-hour="${baseNow.hour}"]`).forEach(c => c.classList.add("now"));
  }
}

/* Keep each scroller's day label pinned to the left edge and showing the date of
   the leftmost visible hour — so it follows the lateral scroll and flips exactly
   when you cross a midnight boundary. All scrollers share the same scrollLeft. */
function updateDayPins(left) {
  const cw = cellWidthPx();
  const L = typeof left === "number" ? left : (els.timeScroll ? els.timeScroll.scrollLeft : 0);
  const h = Math.max(0, Math.min(23, Math.floor(L / cw + 0.001)));
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

function renderHeader() {
  const base = baseZone();
  let html = "";
  let prevISO = null;

  for (let h = 0; h < 24; h++) {
    const instant = zonedTimeToUtc(state.dateISO, h, 0, base.timeZone);
    const p = getParts(instant, base.timeZone);
    const iso = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    const dayStart = h !== 0 && iso !== prevISO; // midnight divider (not at the very edge)
    prevISO = iso;

    html += `
      <div class="hour-head ${h === slotHour(state.cursorSlot) ? "cursor" : ""} ${dayStart ? "day-start" : ""}" data-hour="${h}" data-date="${escapeHTML(fmtDate(p))}">
        <span class="cursor-band" aria-hidden="true"></span>
        <div class="h">${compactHourHTML(p.hour)}</div>
      </div>
    `;
  }

  // Scroll-following day label (sticky to the left edge, updates at day changes).
  html += `<div class="day-pin head-pin" aria-hidden="true"></div>`;
  els.hourHeader.innerHTML = html;
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
  const baseNow = getParts(now, base.timeZone);
  const isToday = `${baseNow.year}-${pad(baseNow.month)}-${pad(baseNow.day)}` === state.dateISO;
  const range = normalizedRange();

  els.rows.innerHTML = state.zones.map((zone, index) => {
    const current = getParts(now, zone.timeZone);
    const offset = offsetText(now, zone.timeZone);
    const color = COLORS[index % COLORS.length];

    let prevISO = null;
    const cells = Array.from({ length: 24 }, (_, h) => {
      const instant = zonedTimeToUtc(state.dateISO, h, 0, base.timeZone);
      const p = getParts(instant, zone.timeZone);
      const localISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
      const dayShift = localISO < state.dateISO ? "-1" : localISO > state.dateISO ? "+1" : "";
      // Midnight divider where the local day changes; the scroll-following pin
      // shows the date persistently and updates at this boundary.
      const dayStart = h !== 0 && localISO !== prevISO;
      prevISO = localISO;
      const dateLabel = `${fmtDate(p)}${dayShift ? ` · ${dayShift}` : ""}`;
      const selected = cellSelected(h, range);
      const phase = zonePhaseAt(zone, instant); // real sun: day / golden / twilight / night
      const otherDay = dayShift === "-1" ? "prev-day" : dayShift === "+1" ? "next-day" : "";
      const nowClass = isToday && h === baseNow.hour ? "now" : "";
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
        <div class="hours" style="--sel-start:${range.start}; --sel-len:${range.durationSlots};">
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
  els.durationLabel.textContent = `Seleccionado · ${duration}`;
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
    hours.style.setProperty("--sel-start", range.start);
    hours.style.setProperty("--sel-len", range.durationSlots);
  });
  for (let h = 0; h < 24; h++) {
    const selected = cellSelected(h, range);
    els.rows.querySelectorAll(`.cell[data-hour="${h}"]`).forEach(cell => {
      cell.classList.toggle("selected", selected);
    });
  }
}

/* Single native scroller — no JS row-syncing at all. Just keep the day pins in
   step, throttled to one update per frame. */
function bindScrollSync() {
  let pinRAF = 0;
  els.timeScroll.onscroll = () => {
    if (!pinRAF) {
      pinRAF = requestAnimationFrame(() => { pinRAF = 0; updateDayPins(); });
    }
  };
}

function focusHour() {
  const target = Math.max(0, slotHour(normalizedRange().start) * cellWidthPx() - 180);
  els.timeScroll.scrollTo({ left: target, behavior: "smooth" });
}
