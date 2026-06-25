"use strict";

/* Glass Time — core/timezone-engine
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- timezone-engine ---------- */

function getParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const out = {};
  formatter.formatToParts(date).forEach(part => {
    if (part.type !== "literal") out[part.type] = part.value;
  });

  return {
    weekday: out.weekday,
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute)
  };
}

function todayInZone(timeZone) {
  const p = getParts(new Date(), timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/* DST-safe wall-time -> UTC instant via fixed-point iteration anchored to
   the target wall time. (The previous formula re-subtracted the offset on
   every pass and diverged — e.g. 9AM 25/06 Sydney resolved to 3AM 24/06.) */
function zonedTimeToUtc(dateISO, hour, minute, timeZone) {
  const [year, month, day] = dateISO.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = target;

  for (let i = 0; i < 4; i++) {
    const p = getParts(new Date(guess), timeZone);
    const localAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
    const diff = localAsUTC - target;
    if (diff === 0) break;
    guess -= diff;
  }

  return new Date(guess);
}

function offsetText(date, timeZone) {
  const p = getParts(date, timeZone);
  const localAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  // getParts is minute-precision, so compare against the minute-floored instant
  // (otherwise the seconds make e.g. GMT+10 read as "GMT+9:59").
  const floored = Math.floor(date.getTime() / 60000) * 60000;
  const mins = Math.round((localAsUTC - floored) / 60000);
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `GMT${sign}${h}${m ? ":" + pad(m) : ""}`;
}
