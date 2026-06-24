"use strict";

/* Glass Time — state/persistence
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- persistence ---------- */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      zones: state.zones,
      dateISO: state.dateISO,
      selectedStartSlot: state.selectedStartSlot,
      selectedEndSlot: state.selectedEndSlot
    }));
  } catch { /* storage may be unavailable (private mode); ignore */ }
}

function load() {
  const fallback = [
    { id: id(), label: "Sydney", timeZone: "Australia/Sydney" },
    { id: id(), label: "Madrid", timeZone: "Europe/Madrid" },
    { id: id(), label: "New York", timeZone: "America/New_York" },
    { id: id(), label: "Bali", timeZone: "Asia/Makassar" }
  ];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    state.zones = parsed?.zones?.length ? parsed.zones : fallback;
    state.dateISO = parsed?.dateISO || todayInZone(state.zones[0].timeZone);
    if (Number.isInteger(parsed?.selectedStartSlot) && Number.isInteger(parsed?.selectedEndSlot)) {
      state.selectedStartSlot = clampSlot(parsed.selectedStartSlot);
      state.selectedEndSlot = clampSlot(parsed.selectedEndSlot);
    } else {
      const legacyHour = Number.isInteger(parsed?.selectedHour) ? parsed.selectedHour : 9;
      state.selectedStartSlot = legacyHour * 2;
      state.selectedEndSlot = legacyHour * 2 + 2;
    }
    state.cursorSlot = state.selectedStartSlot;
  } catch {
    state.zones = fallback;
    state.dateISO = todayInZone(state.zones[0].timeZone);
    state.selectedStartSlot = 18;
    state.selectedEndSlot = 20;
    state.cursorSlot = 18;
  }
}
