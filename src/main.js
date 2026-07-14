"use strict";

/* Glass Time — main (misc actions + wiring + bootstrap)
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- misc actions ---------- */

function jumpNow() {
  const base = baseZone();
  const p = getParts(new Date(), base.timeZone);
  state.dateISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
  const currentSlot = p.hour * 2 + (p.minute >= 30 ? 1 : 0);
  state.selectedStartSlot = currentSlot;
  state.selectedEndSlot = clampSlot(currentSlot + 2);
  state.cursorSlot = currentSlot;
  render();
  focusHour();
}

function reset() {
  localStorage.removeItem(STORAGE_KEY);
  load();
  render();
  focusHour();
  showToast("Reset hecho.");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

/* ---------- event wiring ---------- */

function bindEvents() {
  els.prevBtn.addEventListener("click", () => {
    state.dateISO = addDays(state.dateISO, -1);
    render();
  });

  els.nextBtn.addEventListener("click", () => {
    state.dateISO = addDays(state.dateISO, 1);
    render();
  });

  els.dateInput.addEventListener("change", () => {
    if (els.dateInput.value) {
      state.dateISO = els.dateInput.value;
      render();
    }
  });

  els.nowBtn.addEventListener("click", jumpNow);
  els.copyBtn.addEventListener("click", copySelection);
  els.shareBtn.addEventListener("click", shareSelection);

  els.calendarMenuBtn.addEventListener("click", event => {
    event.stopPropagation();
    toggleCalendarMenu();
  });
  els.googleBtn.addEventListener("click", () => {
    setCalendarMenu(false);
    openGoogleCalendar();
  });
  els.icsBtn.addEventListener("click", () => {
    setCalendarMenu(false);
    downloadICS();
  });

  els.resetBtn.addEventListener("click", reset);
  els.addBtn.addEventListener("click", () => openPicker("add"));

  /* --- Timeline pointer interactions (no rerender on movement) --- */

  // Hover cursor band (mouse/pen only — touch must not steal scroll).
  els.rows.addEventListener("pointermove", event => {
    if (drag.active || event.pointerType === "touch") return;
    const cell = event.target.closest(".cell");
    if (cell) updateCursorDOM(slotFromClientX(event.clientX, cell.closest(".hours")));
  });

  // Selection start.
  els.rows.addEventListener("pointerdown", event => {
    if (event.target.closest(".city-card")) return;
    const cell = event.target.closest(".cell");
    if (!cell) return;
    beginPointer(event, cell.closest(".hours"), els.rows);
  });

  document.addEventListener("pointermove", movePointer, { passive: false });
  document.addEventListener("pointerup", endPointer);
  document.addEventListener("pointercancel", endPointer);

  // While a touch selection is active, block the page/scroller from panning so
  // the drag selects instead of scrolling.
  document.addEventListener("touchmove", event => {
    if (drag.selecting && drag.pointerType === "touch") event.preventDefault();
  }, { passive: false });

  // City card actions (click — not part of the drag system).
  // Single tap (slightly delayed) opens the picker; a double-tap jumps to "now".
  const cityTap = { id: null, t: 0, timer: null };

  els.rows.addEventListener("click", event => {
    if (rowDrag.suppressClick) { rowDrag.suppressClick = false; return; } // ended a reorder drag
    const row = event.target.closest(".row");
    if (!row) return;

    if (event.target.closest(".remove-zone")) {
      event.stopPropagation();
      if (state.zones.length <= 1) return;
      state.zones = state.zones.filter(z => z.id !== row.dataset.zoneId);
      render();
      return;
    }

    if (event.target.closest(".make-base")) {
      event.stopPropagation();
      const i = state.zones.findIndex(z => z.id === row.dataset.zoneId);
      if (i > 0) {
        const zone = state.zones[i];
        moveZoneToBase(zone.id, true);
        render();
        showToast(`${zone.label} ahora es la base.`);
      }
      return;
    }

    if (event.target.closest(".cell")) return;

    if (event.target.closest(".city-card")) {
      const zoneId = row.dataset.zoneId;
      const now = Date.now();

      if (cityTap.id === zoneId && now - cityTap.t < 320) {
        // Double-tap: jump the selection to the current instant.
        clearTimeout(cityTap.timer);
        cityTap.timer = null;
        cityTap.id = null;
        const zone = state.zones.find(z => z.id === zoneId);
        jumpNow();
        if (zone) {
          const c = getParts(new Date(), zone.timeZone);
          showToast(`Ahora en ${zone.label} · ${fmtDisplayTime(c.hour, c.minute)}`);
        }
        return;
      }

      cityTap.id = zoneId;
      cityTap.t = now;
      clearTimeout(cityTap.timer);
      cityTap.timer = setTimeout(() => {
        cityTap.id = null;
        openPicker("edit", zoneId);
      }, 300);
    }
  });

  els.zoneSearch.addEventListener("input", () => renderZoneOptions(els.zoneSearch.value));

  els.zoneList.addEventListener("click", event => {
    const option = event.target.closest(".zone-option");
    if (!option) return;
    chooseZone(option.dataset.label, option.dataset.timezone);
  });

  els.closeSheetBtn.addEventListener("click", closePicker);
  els.backdrop.addEventListener("click", closePicker);

  document.addEventListener("click", event => {
    if (!event.target.closest(".calendar-menu")) setCalendarMenu(false);
  });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closePicker();
      setCalendarMenu(false);
    }
    if (event.target.matches("input")) return;

    // Arrows can walk across midnight: the window re-anchors (canonicalize)
    // so stepping past 24:00 simply moves into the next day.
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const dir = event.key === "ArrowLeft" ? -1 : 1;
      const duration = normalizedRange().durationSlots;
      const nextStart = clampSlot(normalizedRange().start + dir);
      state.selectedStartSlot = nextStart;
      state.selectedEndSlot = Math.min(VIEW_SLOT1, nextStart + duration);
      state.cursorSlot = nextStart;
      canonicalizeSelection();
      render();
      focusHour();
    }
  });
}

/* ---------- bootstrap ---------- */

load();
// A shared link overrides stored state, then we clean the URL so refreshes use
// the (now-persisted) state normally.
if (applyStateFromURL()) {
  save();
  history.replaceState(null, "", location.origin + location.pathname);
}
bindEvents();
initRowReorder();
render();
setTimeout(focusHour, 160);
initOnboarding();

// Staggered entrance for the rows on first mount only.
const board = document.querySelector(".board");
if (board) {
  board.classList.add("intro");
  setTimeout(() => board.classList.remove("intro"), 1500);
}

// Keep the clock alive: tick "Ahora" times + the now-marker every 30s,
// and re-sync on the next exact minute.
updateLiveClock();
setInterval(updateLiveClock, 30000);
const msToNextMinute = (60 - new Date().getSeconds()) * 1000;
setTimeout(updateLiveClock, msToNextMinute);
