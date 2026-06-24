"use strict";

/* Glass Time — ui/timeline-renderer
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- timeline renderer ----------
   Full render is only used on STRUCTURAL changes (zones, date, base).
   Pointer interactions never call this — they patch the DOM directly. */

function render() {
  const keepScroll = els.headScroll ? els.headScroll.scrollLeft : 0;
  els.dateInput.value = state.dateISO;
  els.baseLabel.textContent = `Base · ${baseZone().label}`;
  renderHeader();
  renderRows();
  renderIsland();
  save();
  bindScrollSync();
  restoreScroll(keepScroll);
}

function restoreScroll(left) {
  const scrollers = [els.headScroll, ...document.querySelectorAll(".body-scroll")];
  scrollers.forEach(scroller => {
    scroller.scrollLeft = left;
  });
}

function renderHeader() {
  const base = baseZone();
  let html = "";

  for (let h = 0; h < 24; h++) {
    const instant = zonedTimeToUtc(state.dateISO, h, 0, base.timeZone);
    const p = getParts(instant, base.timeZone);

    html += `
      <div class="hour-head ${h === slotHour(state.cursorSlot) ? "cursor" : ""}" data-hour="${h}">
        <span class="cursor-band" aria-hidden="true"></span>
        <div class="h">${compactHourHTML(p.hour)}</div>
        <div class="d">${fmtDate(p)}</div>
      </div>
    `;
  }

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

    const cells = Array.from({ length: 24 }, (_, h) => {
      const instant = zonedTimeToUtc(state.dateISO, h, 0, base.timeZone);
      const p = getParts(instant, zone.timeZone);
      const localISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
      const dayShift = localISO < state.dateISO ? "-1" : localISO > state.dateISO ? "+1" : "";
      const dayShiftLabel = dayShift === "+1" ? "Día +1" : dayShift === "-1" ? "Día -1" : "";
      const selected = cellSelected(h, range);
      const night = p.hour < 6 || p.hour >= 22;
      const morning = p.hour >= 6 && p.hour < 10;
      const work = p.hour >= 10 && p.hour < 18;
      const evening = p.hour >= 18 && p.hour < 22;
      const nowClass = isToday && h === baseNow.hour ? "now" : "";
      const cursor = h === slotHour(state.cursorSlot);

      return `
        <div class="cell ${selected ? "selected" : ""} ${cursor ? "cursor" : ""} ${night ? "night" : ""} ${morning ? "morning" : ""} ${work ? "work" : ""} ${evening ? "evening" : ""} ${dayShift ? "day-shift" : ""} ${nowClass}"
          data-hour="${h}"
          data-shift="${dayShift}"
          data-shift-label="${dayShiftLabel}"
          title="${escapeHTML(zone.label)}: ${fmtDate(p)} ${fmtDisplayTime(p.hour)}">
          <span class="cursor-band" aria-hidden="true"></span>
          <span class="t">${compactHourHTML(p.hour)}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="time-row" data-zone-id="${zone.id}">
        <div class="city-card ${index === 0 ? "anchor" : ""}" data-action="edit-zone" style="--zone-color:${color}">
          <div class="city-glow" style="background:linear-gradient(180deg, ${color}, rgba(255,255,255,.65))"></div>
          <div class="city-main">
            <div class="city-line">
              <div class="city-name">${escapeHTML(zone.label)}</div>
              ${index === 0 ? `<span class="base-tag">Base</span>` : ""}
              <div class="offset">${offset}</div>
            </div>
            <div class="zone-name">${escapeHTML(zone.timeZone)}</div>
            <div class="current-time">Ahora · ${fmtDate(current)} · ${fmtDisplayTime(current.hour, current.minute)}</div>
          </div>
          <div class="city-actions">
            ${index > 0 ? `<button class="mini-btn make-base" title="Hacer base">⌖</button>` : ""}
            ${state.zones.length > 1 ? `<button class="mini-btn remove-zone" title="Eliminar">×</button>` : ""}
          </div>
        </div>
        <div class="scroll body-scroll">
          <div class="hours" style="--sel-start:${range.start}; --sel-len:${range.durationSlots};">
            ${cells}
            <div class="sel-band" aria-hidden="true"></div>
          </div>
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
}

/* Patch selection styling on the existing DOM — no rebuild, no scroll loss.
   The floating .sel-band glides via a CSS transition when these vars change. */
function applySelectionDOM() {
  const range = normalizedRange();
  document.querySelectorAll(".body-scroll .hours").forEach(hours => {
    hours.style.setProperty("--sel-start", range.start);
    hours.style.setProperty("--sel-len", range.durationSlots);
  });
  for (let h = 0; h < 24; h++) {
    const selected = cellSelected(h, range);
    document.querySelectorAll(`.body-scroll .cell[data-hour="${h}"]`).forEach(cell => {
      cell.classList.toggle("selected", selected);
    });
  }
}

function bindScrollSync() {
  const scrollers = [els.headScroll, ...document.querySelectorAll(".body-scroll")];
  let syncing = false;

  scrollers.forEach(scroller => {
    scroller.onscroll = () => {
      if (syncing) return;
      syncing = true;
      const left = scroller.scrollLeft;
      scrollers.forEach(other => {
        if (other !== scroller) other.scrollLeft = left;
      });
      requestAnimationFrame(() => { syncing = false; });
    };
  });
}

function focusHour() {
  const target = Math.max(0, slotHour(normalizedRange().start) * cellWidthPx() - 180);
  els.headScroll.scrollTo({ left: target, behavior: "smooth" });
}
