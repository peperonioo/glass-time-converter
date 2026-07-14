#!/usr/bin/env node
/* Glass Time — core test suite.
   Loads the browser modules (plain scripts sharing global scope) into Node with
   minimal stubs and asserts the timezone/slot/sun/canonical logic that has
   historically broken: TZ conversion divergence, offset rounding, negative
   slots, midnight crossings and window re-anchoring.
   Run: node test/run-tests.js   (build.js runs it automatically) */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

// --- browser stubs (only what module top-levels touch) ---
globalThis.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, body: { classList: { add() {}, remove() {} }, dataset: {} } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// (Node 21+ already exposes a read-only global navigator — good enough.)

const MODULES = [
  "data/zone-coords.js",
  "data/timezone-library.js",
  "core/date-utils.js",
  "core/timezone-engine.js",
  "core/sun-engine.js",
  "state/store.js"
];
for (const rel of MODULES) {
  const code = fs.readFileSync(path.join(__dirname, "..", "src", rel), "utf8");
  vm.runInThisContext(code.replace(/^"use strict";\n/, ""), { filename: rel });
}

// --- tiny runner ---
let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error(`  ✗ ${name}\n      got      ${a}\n      expected ${e}`); }
}
function ok(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${name}`); }
}

// ---------- slots (negative-safe half-hours) ----------
eq("slotHour(-3) floors", slotHour(-3), -2);
eq("slotMinute(-3) is :30", slotMinute(-3), 30);
eq("slotMinute(-4) is :00", slotMinute(-4), 0);
eq("slotMinute(3) is :30", slotMinute(3), 30);
eq("clampSlot lower bound", clampSlot(-500), VIEW_SLOT0);
eq("clampSlot upper bound", clampSlot(500), VIEW_SLOT1);
eq("fmtSlot(48) end-of-day is 12AM", fmtSlot(48), "12AM");
eq("fmtSlot(50) past midnight is 1AM", fmtSlot(50), "1AM");
eq("fmtSlot(-2) is 11PM", fmtSlot(-2), "11PM");
eq("durationText 2h30m", durationText(5), "2h 30m");
eq("durationText 30m", durationText(1), "30m");

// ---------- timezone engine (DST-safe conversion) ----------
function roundtrip(dateISO, h, m, tz) {
  const p = getParts(zonedTimeToUtc(dateISO, h, m, tz), tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}
eq("Sydney 9:00 roundtrip (the v0.6 divergence bug)", roundtrip("2026-06-25", 9, 0, "Australia/Sydney"), "2026-06-25 09:00");
eq("NY 23:30 roundtrip", roundtrip("2026-06-25", 23, 30, "America/New_York"), "2026-06-25 23:30");
eq("hour 24 rolls to next day", roundtrip("2026-06-25", 24, 0, "Europe/Madrid"), "2026-06-26 00:00");
eq("negative hour rolls back a day", roundtrip("2026-06-25", -5, 0, "Australia/Sydney"), "2026-06-24 19:00");
// DST fall-back (ambiguous local time must resolve, minute preserved)
const fall = getParts(zonedTimeToUtc("2026-11-01", 1, 30, "America/New_York"), "America/New_York");
eq("DST fall-back keeps 1:30", [fall.hour, fall.minute], [1, 30]);
// DST spring-forward (nonexistent 2:30 resolves to an adjacent valid instant)
const spring = getParts(zonedTimeToUtc("2026-03-08", 2, 30, "America/New_York"), "America/New_York");
ok("DST spring-forward resolves near the gap", (spring.hour === 1 || spring.hour === 3) && spring.minute === 30);

// offset rounding regression (seconds made GMT+10 read GMT+9:59)
eq("offsetText ignores seconds", offsetText(new Date("2026-06-25T10:30:45.123Z"), "Australia/Sydney"), "GMT+10");
eq("relOffset Sydney vs Madrid winter", relOffsetText(new Date("2026-07-08T12:00:00Z"), "Australia/Sydney", "Europe/Madrid"), "+8h");
eq("relOffset half-hour zone", relOffsetText(new Date("2026-07-08T12:00:00Z"), "Asia/Kolkata", "Europe/Madrid"), "+3:30");
eq("relOffset same zone", relOffsetText(new Date(), "Europe/Madrid", "Europe/Madrid"), "±0h");

// Spanish weekday, capitalized in fmtDate
ok("weekday is Spanish", ["lun","mar","mié","jue","vie","sáb","dom"].includes(getParts(new Date("2026-06-25T12:00:00Z"), "UTC").weekday));
ok("fmtDate capitalizes", /^[A-ZÁÉÍÓÚ]/.test(fmtDate(getParts(new Date(), "UTC"))));

// ---------- sun engine (real astronomy) ----------
function crossesZero(dateISO, tz, lat, lon, fromUTC, toUTC) {
  let prev = null;
  for (let min = fromUTC * 60; min <= toUTC * 60; min += 5) {
    const alt = sunAltitude(new Date(Date.parse(dateISO + "T00:00:00Z") + min * 60000), lat, lon);
    if (prev !== null && prev < 0 && alt >= 0) return min / 60;
    prev = alt;
  }
  return null;
}
const madridRise = crossesZero("2026-06-25", "Europe/Madrid", 40.42, -3.70, 3, 7);
ok("Madrid summer sunrise ~04:52 UTC", madridRise !== null && Math.abs(madridRise - 4.87) < 0.35);
eq("phase: Madrid summer noon is day", sunPhase(sunAltitude(new Date("2026-06-25T12:00:00Z"), 40.42, -3.70)), "day");
eq("phase: Sydney winter midnight is night", sunPhase(sunAltitude(new Date("2026-06-25T14:00:00Z"), -33.87, 151.21)), "night");
// full-coverage coords: a non-curated zone must resolve via ZONE_COORDS, not lat-0
ok("ZONE_COORDS covers 400+ zones", Object.keys(ZONE_COORDS).length >= 400);
ok("Oslo has real coords", Math.abs(ZONE_COORDS["Europe/Oslo"][0] - 59.91) < 0.1);
eq("zonePhaseAt uses tzdata coords (Oslo winter night)", zonePhaseAt({ label: "Oslo??", timeZone: "Europe/Oslo" }, new Date("2026-12-21T23:00:00Z")), "night");
eq("zonePhaseAt Oslo midsummer day", zonePhaseAt({ label: "Oslo??", timeZone: "Europe/Oslo" }, new Date("2026-06-21T11:00:00Z")), "day");

// ---------- canonical selection (3-day window re-anchor) ----------
state.zones = [{ id: "t", label: "Bali", timeZone: "Asia/Makassar" }];
state.dateISO = "2026-07-27"; state.selectedStartSlot = -8; state.selectedEndSlot = -6; state.cursorSlot = -8;
eq("dayShift negative", selectionDayShift(), -1);
const before = selectedInstant().toISOString();
canonicalizeSelection();
eq("canonicalize back a day", [state.dateISO, state.selectedStartSlot, state.selectedEndSlot], ["2026-07-26", 40, 42]);
eq("canonicalize preserves the instant", selectedInstant().toISOString(), before);
state.dateISO = "2026-07-26"; state.selectedStartSlot = 50; state.selectedEndSlot = 52; state.cursorSlot = 50;
canonicalizeSelection();
eq("canonicalize forward a day", [state.dateISO, state.selectedStartSlot], ["2026-07-27", 2]);
state.selectedStartSlot = 0; state.selectedEndSlot = 2;
eq("canonical form is a no-op", canonicalizeSelection(), 0);

// ---------- zone library ----------
eq("normSearch strips accents", normSearch("Bogotá"), "bogota");
eq("labelForZone curated", labelForZone("Europe/Madrid"), "Madrid");
eq("prettifyZone", prettifyZone("America/Argentina/Buenos_Aires"), "Buenos Aires");
eq("zoneSubtitle city+region", zoneSubtitle("Asia/Makassar", "Bali"), "Makassar · Asia");
eq("zoneSubtitle collapses repeated city", zoneSubtitle("Europe/Oslo", "Oslo"), "Europa");
eq("zoneSubtitle nested zone", zoneSubtitle("America/Argentina/Buenos_Aires", "BA"), "Buenos Aires · América");
eq("zoneSubtitle UTC passthrough", zoneSubtitle("UTC", "UTC"), "UTC");
ok("curated zones all have coords", ZONE_LIBRARY.every(z => typeof z[2] === "number" && typeof z[3] === "number"));

// ---------- result ----------
console.log(`tests: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
