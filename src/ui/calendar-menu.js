"use strict";

/* Glass Time — ui/calendar-menu
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- calendar menu ---------- */

function setCalendarMenu(open) {
  state.calendarMenuOpen = open;
  els.calendarMenu.classList.toggle("open", open);
  els.calendarMenuBtn.setAttribute("aria-expanded", String(open));
  if (open) {
    const { start, end } = normalizedRange();
    if (!els.eventTitleInput.value.trim()) {
      els.eventTitleInput.value = `Recordatorio · ${baseZone().label} ${fmtSlot(start)}–${fmtSlot(end)}`;
      els.eventTitleInput.select();
    }
    setTimeout(() => els.eventTitleInput.focus(), 50);
  }
}

function toggleCalendarMenu() {
  setCalendarMenu(!state.calendarMenuOpen);
}
