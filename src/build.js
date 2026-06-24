#!/usr/bin/env node
/* Glass Time — build step.
 *
 * Concatenates the /src modules (in dependency order) and inlines them into
 * src/shell.html, producing the self-contained distributable dist/glass-time.html.
 *
 * The modules are plain classic scripts that share the global scope (no import /
 * export), so "bundling" is an ordered concatenation — no third-party tooling.
 *
 * Usage:  node src/build.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcDir = __dirname;

// Dependency-safe load order. All functions are hoisted; only top-level consts
// (data tables, state, els) must exist before bootstrap runs — and it runs last.
const MODULES = [
  "data/timezone-library.js",
  "core/date-utils.js",
  "core/timezone-engine.js",
  "state/store.js",
  "state/persistence.js",
  "core/calendar-export.js",
  "ui/cursor-controller.js",
  "ui/timeline-renderer.js",
  "ui/range-selection.js",
  "ui/timezone-picker.js",
  "ui/calendar-menu.js",
  "main.js"
];

function stripModulePreamble(code) {
  // Drop the per-file "use strict"; (one is added for the whole bundle) but keep
  // the file banner comment for traceability.
  return code.replace(/^"use strict";\r?\n/, "").trimEnd();
}

function indent(code, spaces) {
  const pad = " ".repeat(spaces);
  return code.split("\n").map(l => (l ? pad + l : l)).join("\n");
}

const parts = MODULES.map(rel => {
  const code = fs.readFileSync(path.join(srcDir, rel), "utf8");
  return `/* ===== ${rel} ===== */\n${stripModulePreamble(code)}`;
}).join("\n\n");

const bundle = `"use strict";\n\n${parts}\n`;

const shell = fs.readFileSync(path.join(srcDir, "shell.html"), "utf8");
if (!shell.includes("/*__GLASS_TIME_BUNDLE__*/")) {
  throw new Error("shell.html is missing the /*__GLASS_TIME_BUNDLE__*/ placeholder");
}

const out = shell.replace("/*__GLASS_TIME_BUNDLE__*/", indent(bundle, 4));
const outPath = path.join(root, "dist", "glass-time.html");
fs.writeFileSync(outPath, out);
console.log(`Built ${path.relative(root, outPath)} (${out.length} bytes) from ${MODULES.length} modules.`);
