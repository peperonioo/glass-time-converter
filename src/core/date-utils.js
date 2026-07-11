"use strict";

/* Glass Time — core/date-utils
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- date-utils ---------- */

function id() {
  return crypto?.randomUUID?.() || "id-" + Math.random().toString(36).slice(2);
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function dateFromISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(iso, amount) {
  const d = dateFromISO(iso);
  d.setUTCDate(d.getUTCDate() + amount);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function normalizedHour(hour) {
  return ((hour % 24) + 24) % 24;
}

function hour12(hour) {
  const h = normalizedHour(hour);
  return h % 12 || 12;
}

function meridiem(hour) {
  return normalizedHour(hour) >= 12 ? "PM" : "AM";
}

function compactHourHTML(hour) {
  return `<span class="time-stack"><span class="num">${hour12(hour)}</span><span class="ampm">${meridiem(hour)}</span></span>`;
}

function fmtDisplayTime(hour, minute = 0) {
  const suffix = meridiem(hour);
  if (minute === 0) return `${hour12(hour)}${suffix}`;
  return `${hour12(hour)}:${pad(minute)}${suffix}`;
}

/* Slots are half-hours relative to the base date: slot 0 = 00:00 of dateISO.
   The rendered window spans 3 days — [yesterday, base date, tomorrow] — so
   valid on-screen slots run VIEW_SLOT0..VIEW_SLOT1 and hours VIEW_H0..VIEW_H1.
   Canonical (persisted/shared) form keeps the selection start inside 0..47. */
const VIEW_H0 = -24;      // first rendered hour (base-relative)
const VIEW_H1 = 48;       // one past the last rendered hour
const VIEW_HOURS = VIEW_H1 - VIEW_H0; // 72
const VIEW_SLOT0 = VIEW_H0 * 2;       // -48
const VIEW_SLOT1 = VIEW_H1 * 2;       // 96

function slotHour(slot) {
  return Math.floor(slot / 2);
}

function slotMinute(slot) {
  return ((slot % 2) + 2) % 2 ? 30 : 0; // negative-safe
}

function fmtSlot(slot) {
  return fmtDisplayTime(slotHour(slot), slotMinute(slot));
}

function clampSlot(slot) {
  return Math.max(VIEW_SLOT0, Math.min(VIEW_SLOT1, Number(slot)));
}

function durationText(slots) {
  const mins = slots * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function fmtDate(p) {
  const wd = p.weekday ? p.weekday.charAt(0).toUpperCase() + p.weekday.slice(1) : "";
  return `${wd} ${pad(p.day)}/${pad(p.month)}`;
}

function cellWidthPx() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--cell");
  return parseFloat(v) || 64;
}
