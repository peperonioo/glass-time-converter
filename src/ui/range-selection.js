"use strict";

/* Glass Time — ui/range-selection
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- range selection (pointer interactions) ---------- */

const DRAG_THRESHOLD = 5; // px before a mouse drag becomes a selection

const drag = {
  active: false,
  selecting: false,
  anchor: 0,
  startX: 0,
  startY: 0,
  pointerType: "",
  pointerId: null,
  hoursEl: null,
  isHeader: false,
  captureTarget: null
};

/* Map an absolute clientX to a half-hour slot using a row's .hours rect,
   so it stays correct regardless of horizontal scroll position. */
function slotFromClientX(clientX, hoursEl) {
  const rect = hoursEl.getBoundingClientRect();
  const cw = rect.width / 24;
  const rel = clientX - rect.left;
  let hour = Math.floor(rel / cw);
  hour = Math.max(0, Math.min(23, hour));
  const within = (rel - hour * cw) / cw;
  return clampSlot(hour * 2 + (within >= 0.5 ? 1 : 0));
}

/* Apply a range to state + DOM without a full render. */
function liveRange(anchorSlot, currentSlot) {
  const a = clampSlot(anchorSlot);
  const b = clampSlot(currentSlot);
  const start = Math.min(a, b);
  const end = Math.min(48, Math.max(a, b) + 1);
  state.selectedStartSlot = start;
  state.selectedEndSlot = end;
  applySelectionDOM();
  updateCursorDOM(b);
  renderIsland();
}

function beginPointer(event, hoursEl, isHeader, captureTarget) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  let slot;
  if (isHeader) {
    const head = event.target.closest(".hour-head");
    if (!head) return;
    slot = Number(head.dataset.hour) * 2;
  } else {
    slot = slotFromClientX(event.clientX, hoursEl);
  }
  drag.active = true;
  drag.selecting = false;
  drag.anchor = slot;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.pointerType = event.pointerType;
  drag.pointerId = event.pointerId;
  drag.hoursEl = hoursEl;
  drag.isHeader = isHeader;
  drag.captureTarget = captureTarget;
}

function movePointer(event) {
  if (!drag.active) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  if (!drag.selecting) {
    if (drag.pointerType === "touch") {
      // A touch that moves is a scroll gesture — abandon selection, let it pan.
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) drag.active = false;
      return;
    }
    // Mouse / pen: only start selecting after crossing the threshold.
    if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;
    drag.selecting = true;
    try { drag.captureTarget?.setPointerCapture?.(drag.pointerId); } catch { /* ignore */ }
  }

  event.preventDefault();
  const cur = slotFromClientX(event.clientX, drag.hoursEl);
  liveRange(drag.anchor, cur);
}

function endPointer(event) {
  if (!drag.active) return;
  const wasSelecting = drag.selecting;
  try { drag.captureTarget?.releasePointerCapture?.(drag.pointerId); } catch { /* ignore */ }
  drag.active = false;
  drag.selecting = false;

  if (!wasSelecting) {
    // Tap: header => 1h, cell => 30m minimum.
    if (drag.isHeader) liveRange(drag.anchor, drag.anchor + 1);
    else liveRange(drag.anchor, drag.anchor);
  }
  save();
}
