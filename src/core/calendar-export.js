"use strict";

/* Glass Time — core/calendar-export
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- calendar export ---------- */

/* Human lines only — no IANA ids, no GMT offsets, no technical clutter. */
function selectionLines() {
  const startInstant = selectedInstant();
  const endInstant = selectedEndInstant();
  return state.zones.map(zone => {
    const start = getParts(startInstant, zone.timeZone);
    const end = getParts(endInstant, zone.timeZone);
    return `${zone.label} · ${fmtDate(start)} · ${fmtDisplayTime(start.hour, start.minute)}–${fmtDisplayTime(end.hour, end.minute)}`;
  });
}

function googleDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function calendarTitle() {
  const title = els.eventTitleInput.value.trim();
  if (title) return title;
  const { start, end } = normalizedRange();
  return `Recordatorio · ${baseZone().label} ${fmtSlot(start)}–${fmtSlot(end)}`;
}

function calendarDetails() {
  return selectionLines().join("\n");
}

function openGoogleCalendar() {
  const start = selectedInstant();
  const end = selectedEndInstant();
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", calendarTitle());
  url.searchParams.set("dates", `${googleDate(start)}/${googleDate(end)}`);
  url.searchParams.set("details", calendarDetails());
  url.searchParams.set("ctz", baseZone().timeZone);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
  showToast("Abriendo Google Calendar.");
}

function escapeICS(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function downloadICS() {
  const start = selectedInstant();
  const end = selectedEndInstant();
  const stamp = new Date();
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@glass-time`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Glass Time//Visual Timezone Converter//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${googleDate(stamp)}`,
    `DTSTART:${googleDate(start)}`,
    `DTEND:${googleDate(end)}`,
    `SUMMARY:${escapeICS(calendarTitle())}`,
    `DESCRIPTION:${escapeICS(calendarDetails())}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `glass-time-${state.dateISO}-${pad(slotHour(normalizedRange().start))}${pad(slotMinute(normalizedRange().start))}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast("Archivo .ics creado para Calendario/Outlook/Apple.");
}

function copySelection() {
  const text = selectionLines().join("\n");
  navigator.clipboard?.writeText(text).then(
    () => showToast("Hora copiada."),
    () => showToast(text)
  );
}
