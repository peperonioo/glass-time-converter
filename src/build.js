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
  "data/zone-coords.js",
  "data/timezone-library.js",
  "core/date-utils.js",
  "core/timezone-engine.js",
  "core/sun-engine.js",
  "state/store.js",
  "state/persistence.js",
  "core/calendar-export.js",
  "ui/cursor-controller.js",
  "ui/timeline-renderer.js",
  "ui/range-selection.js",
  "ui/reorder.js",
  "ui/timezone-picker.js",
  "ui/calendar-menu.js",
  "ui/share.js",
  "ui/onboarding.js",
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

// Run the core test suite first — a red suite must never ship.
const { execFileSync } = require("child_process");
execFileSync(process.execPath, [path.join(root, "test", "run-tests.js")], { stdio: "inherit" });

const shell = fs.readFileSync(path.join(srcDir, "shell.html"), "utf8");
if (!shell.includes("/*__GLASS_TIME_BUNDLE__*/")) {
  throw new Error("shell.html is missing the /*__GLASS_TIME_BUNDLE__*/ placeholder");
}
if (!shell.includes("/*__GLASS_TIME_STYLES__*/")) {
  throw new Error("shell.html is missing the /*__GLASS_TIME_STYLES__*/ placeholder");
}

const css = fs.readFileSync(path.join(srcDir, "styles.css"), "utf8");
const out = shell
  .replace("/*__GLASS_TIME_STYLES__*/", indent(css, 4))
  .replace("/*__GLASS_TIME_BUNDLE__*/", indent(bundle, 4));

// 1) Clean, self-contained single file — the distributable.
const distPath = path.join(root, "dist", "glass-time.html");
fs.writeFileSync(distPath, out);
console.log(`Built ${path.relative(root, distPath)} (${out.length} bytes) from ${MODULES.length} modules.`);

// 2) PWA site for GitHub Pages: same bundle + manifest/SW tags, plus assets.
const SITE_URL = "https://peperonioo.github.io/glass-time-converter/";
const SITE_DESC = "Convierte horas entre ciudades, con luz solar real. Elige un rango y guárdalo en tu calendario.";

const pwaHead = [
  '<link rel="manifest" href="./manifest.webmanifest" />',
  '<meta name="theme-color" content="#070812" />',
  '<link rel="icon" href="./icons/icon-192.png" />',
  '<link rel="apple-touch-icon" href="./icons/icon-192.png" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="Glass Time" />',
  `<meta name="description" content="${SITE_DESC}" />`,
  '<meta property="og:type" content="website" />',
  '<meta property="og:title" content="Glass Time — conversor visual de zonas horarias" />',
  `<meta property="og:description" content="${SITE_DESC}" />`,
  `<meta property="og:url" content="${SITE_URL}" />`,
  `<meta property="og:image" content="${SITE_URL}og-image.png" />`,
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  '<meta name="twitter:card" content="summary_large_image" />'
].map(l => "  " + l).join("\n");

const swReg =
  '  <script>\n' +
  '    if ("serviceWorker" in navigator) {\n' +
  '      window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));\n' +
  '    }\n' +
  '  </script>';

let docsHtml = out
  .replace("</head>", pwaHead + "\n</head>")
  .replace("</body>", swReg + "\n</body>");

const docsDir = path.join(root, "docs");
fs.mkdirSync(path.join(docsDir, "icons"), { recursive: true });
fs.writeFileSync(path.join(docsDir, "index.html"), docsHtml);

const pwaDir = path.join(srcDir, "pwa");
fs.copyFileSync(path.join(pwaDir, "manifest.webmanifest"), path.join(docsDir, "manifest.webmanifest"));
fs.copyFileSync(path.join(pwaDir, "sw.js"), path.join(docsDir, "sw.js"));
fs.copyFileSync(path.join(pwaDir, "og-image.png"), path.join(docsDir, "og-image.png"));
for (const icon of fs.readdirSync(path.join(pwaDir, "icons"))) {
  fs.copyFileSync(path.join(pwaDir, "icons", icon), path.join(docsDir, "icons", icon));
}
// Disable Jekyll so GitHub Pages serves files as-is.
fs.writeFileSync(path.join(docsDir, ".nojekyll"), "");
console.log(`Built ${path.relative(root, path.join(docsDir, "index.html"))} (PWA) + manifest, sw.js, icons.`);
