"use strict";

/* Glass Time — data/timezone-library
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */

/* [label, IANA timeZone, latitude, longitude] — coords drive the real sun engine. */
const ZONE_LIBRARY = [
  ["Madrid", "Europe/Madrid", 40.42, -3.70],
  ["Barcelona", "Europe/Madrid", 41.39, 2.17],
  ["Las Palmas", "Atlantic/Canary", 28.12, -15.44],
  ["London", "Europe/London", 51.51, -0.13],
  ["Lisbon", "Europe/Lisbon", 38.72, -9.14],
  ["Paris", "Europe/Paris", 48.85, 2.35],
  ["Berlin", "Europe/Berlin", 52.52, 13.40],
  ["Amsterdam", "Europe/Amsterdam", 52.37, 4.90],
  ["Rome", "Europe/Rome", 41.90, 12.50],
  ["Dublin", "Europe/Dublin", 53.35, -6.26],
  ["Sydney", "Australia/Sydney", -33.87, 151.21],
  ["Melbourne", "Australia/Melbourne", -37.81, 144.96],
  ["Brisbane", "Australia/Brisbane", -27.47, 153.03],
  ["Perth", "Australia/Perth", -31.95, 115.86],
  ["Auckland", "Pacific/Auckland", -36.85, 174.76],
  ["Bali", "Asia/Makassar", -8.65, 115.22],
  ["Singapore", "Asia/Singapore", 1.35, 103.82],
  ["Bangkok", "Asia/Bangkok", 13.76, 100.50],
  ["Tokyo", "Asia/Tokyo", 35.68, 139.69],
  ["Seoul", "Asia/Seoul", 37.57, 126.98],
  ["Dubai", "Asia/Dubai", 25.20, 55.27],
  ["Mumbai", "Asia/Kolkata", 19.08, 72.88],
  ["Hong Kong", "Asia/Hong_Kong", 22.32, 114.17],
  ["Shanghai", "Asia/Shanghai", 31.23, 121.47],
  ["New York", "America/New_York", 40.71, -74.01],
  ["Los Angeles", "America/Los_Angeles", 34.05, -118.24],
  ["San Francisco", "America/Los_Angeles", 37.77, -122.42],
  ["Chicago", "America/Chicago", 41.88, -87.63],
  ["Denver", "America/Denver", 39.74, -104.99],
  ["Mexico City", "America/Mexico_City", 19.43, -99.13],
  ["Costa Rica", "America/Costa_Rica", 9.93, -84.08],
  ["Nicaragua", "America/Managua", 12.11, -86.24],
  ["Lima", "America/Lima", -12.05, -77.04],
  ["Bogotá", "America/Bogota", 4.71, -74.07],
  ["Buenos Aires", "America/Argentina/Buenos_Aires", -34.60, -58.38],
  ["São Paulo", "America/Sao_Paulo", -23.55, -46.63],
  ["Toronto", "America/Toronto", 43.65, -79.38],
  ["Vancouver", "America/Vancouver", 49.28, -123.12],
  ["UTC", "UTC", 0, 0]
];

const COLORS = ["#9fd7ff", "#d9b8ff", "#bdf7d2", "#ffd2b7", "#ffb5df", "#c6d4ff"];

/* Coordinate lookups for the sun engine. */
const COORDS_BY_LABEL = {};
const COORDS_BY_TZ = {};
ZONE_LIBRARY.forEach(([label, tz, lat, lon]) => {
  COORDS_BY_LABEL[label] = [lat, lon];
  if (!(tz in COORDS_BY_TZ)) COORDS_BY_TZ[tz] = [lat, lon];
});
