"use strict";

/* Glass Time — core/sun-engine
   Real solar position (no API): given an instant + lat/lon, returns the sun's
   altitude in degrees, which we classify into day / golden / twilight / night.
   Algorithm adapted from the standard SunCalc approach. */

const RAD = Math.PI / 180;
const OBLIQUITY = RAD * 23.4397;

function toDays(date) {
  return date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545; // days since J2000
}

function solarMeanAnomaly(d) {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372; // perihelion of Earth
  return M + C + P + Math.PI;
}

/* Sun altitude (degrees above the horizon) at a UTC instant for lat/lon. */
function sunAltitude(date, lat, lon) {
  const d = toDays(date);
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const dec = Math.asin(Math.sin(L) * Math.sin(OBLIQUITY));
  const ra = Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
  const lw = RAD * -lon;
  const phi = RAD * lat;
  const th = RAD * (280.16 + 360.9856235 * d) - lw; // sidereal time
  const H = th - ra; // hour angle
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  return alt / RAD;
}

/* Phase name from altitude — used for cell tints and ambient mood. */
function sunPhase(altitudeDeg) {
  if (altitudeDeg >= 6) return "day";
  if (altitudeDeg >= -0.833) return "golden";   // sun near/just below horizon
  if (altitudeDeg >= -12) return "twilight";     // civil + nautical
  return "night";
}

/* Resolve coordinates for a zone: prefer its city, then its timezone, then a
   rough longitude from the current UTC offset (lat 0). Never throws. */
function coordsFor(zone, atDate) {
  if (typeof zone.lat === "number" && typeof zone.lon === "number") return [zone.lat, zone.lon];
  if (zone.label && COORDS_BY_LABEL[zone.label]) return COORDS_BY_LABEL[zone.label];
  if (zone.timeZone && COORDS_BY_TZ[zone.timeZone]) return COORDS_BY_TZ[zone.timeZone];
  const mins = offsetMinutes(atDate || new Date(), zone.timeZone);
  return [0, Math.max(-180, Math.min(180, mins / 4))];
}

/* UTC offset in minutes for a timezone at a given instant. */
function offsetMinutes(date, timeZone) {
  const p = getParts(date, timeZone);
  const localAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((localAsUTC - date.getTime()) / 60000);
}

/* Convenience: the sun phase for a zone at a UTC instant. */
function zonePhaseAt(zone, instant) {
  const [lat, lon] = coordsFor(zone, instant);
  return sunPhase(sunAltitude(instant, lat, lon));
}
