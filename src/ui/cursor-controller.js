"use strict";

/* Glass Time — ui/cursor-controller
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- cursor controller (class-only updates) ---------- */

function updateCursorDOM(slot) {
  state.cursorSlot = clampSlot(slot);
  const hour = slotHour(state.cursorSlot);
  document.querySelectorAll(".hour-head.cursor, .cell.cursor").forEach(el => el.classList.remove("cursor"));
  document.querySelectorAll(`.hour-head[data-hour="${hour}"], .cell[data-hour="${hour}"]`).forEach(el => el.classList.add("cursor"));
}
