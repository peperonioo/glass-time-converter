"use strict";

/* Glass Time — state/store
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
const STORAGE_KEY = "glass-time-v1-simple";

const state = {
  zones: [],
  dateISO: "",
  selectedStartSlot: 18,
  selectedEndSlot: 20,
  cursorSlot: 18,
  calendarMenuOpen: false,
  pickerMode: "edit",
  editingZoneId: null
};

const els = {
  selectedSummary: document.getElementById("selectedSummary"),
  selectedDateChip: document.getElementById("selectedDateChip"),
  dateInput: document.getElementById("dateInput"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  nowBtn: document.getElementById("nowBtn"),
  copyBtn: document.getElementById("copyBtn"),
  shareBtn: document.getElementById("shareBtn"),
  calendarMenu: document.getElementById("calendarMenu"),
  calendarMenuBtn: document.getElementById("calendarMenuBtn"),
  calendarPopover: document.getElementById("calendarPopover"),
  eventTitleInput: document.getElementById("eventTitleInput"),
  googleBtn: document.getElementById("googleBtn"),
  icsBtn: document.getElementById("icsBtn"),
  resetBtn: document.getElementById("resetBtn"),
  addBtn: document.getElementById("addBtn"),
  baseLabel: document.getElementById("baseLabel"),
  baseDate: document.getElementById("baseDate"),
  durationLabel: document.getElementById("durationLabel"),
  timeScroll: document.getElementById("timeScroll"),
  hourHeader: document.getElementById("hourHeader"),
  rows: document.getElementById("rows"),
  backdrop: document.getElementById("backdrop"),
  sheet: document.getElementById("sheet"),
  sheetTitle: document.getElementById("sheetTitle"),
  sheetSubtitle: document.getElementById("sheetSubtitle"),
  closeSheetBtn: document.getElementById("closeSheetBtn"),
  zoneSearch: document.getElementById("zoneSearch"),
  zoneList: document.getElementById("zoneList"),
  toast: document.getElementById("toast")
};

/* ---------- store / selection model ---------- */

function normalizedRange() {
  const start = Math.min(state.selectedStartSlot, state.selectedEndSlot);
  const end = Math.max(state.selectedStartSlot, state.selectedEndSlot);
  return {
    start,
    end: Math.max(start + 1, end),
    durationSlots: Math.max(1, end - start)
  };
}

/* Whole days the selection start sits away from the base date (0 = canonical). */
function selectionDayShift() {
  return Math.floor(normalizedRange().start / 48);
}

/* Re-anchor dateISO so the selection start falls inside it (slots 0..47).
   The absolute instant never changes. Returns the day shift applied. */
function canonicalizeSelection() {
  const shift = selectionDayShift();
  if (!shift) return 0;
  state.dateISO = addDays(state.dateISO, shift);
  state.selectedStartSlot -= shift * 48;
  state.selectedEndSlot -= shift * 48;
  state.cursorSlot -= shift * 48;
  return shift;
}

function baseZone() {
  return state.zones[0];
}

function selectedInstant() {
  const { start } = normalizedRange();
  return zonedTimeToUtc(state.dateISO, slotHour(start), slotMinute(start), baseZone().timeZone);
}

function selectedEndInstant() {
  const { end } = normalizedRange();
  return zonedTimeToUtc(state.dateISO, slotHour(end), slotMinute(end), baseZone().timeZone);
}

function moveZoneToBase(zoneId, preserveCurrentInstant = true) {
  const index = state.zones.findIndex(z => z.id === zoneId);
  if (index <= 0) return;
  const instant = preserveCurrentInstant ? selectedInstant() : null;
  const duration = normalizedRange().durationSlots;
  const [zone] = state.zones.splice(index, 1);
  state.zones.unshift(zone);
  if (instant) {
    const p = getParts(instant, zone.timeZone);
    const startSlot = p.hour * 2 + (p.minute >= 30 ? 1 : 0);
    state.dateISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    state.selectedStartSlot = startSlot;
    state.selectedEndSlot = clampSlot(startSlot + duration);
    state.cursorSlot = startSlot;
  }
}
