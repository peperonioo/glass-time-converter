"use strict";

/* Glass Time — ui/range-selection
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- range selection (pointer interactions) ---------- */

const DRAG_THRESHOLD = 5;   // mouse/pen: px before a drag becomes a selection
const TOUCH_HOLD_MS = 200;  // touch: hold this long (still) to enter selection mode
const TOUCH_MOVE_TOL = 10;  // touch: movement beyond this before the hold = a scroll

const drag = {
  active: false,
  selecting: false,
  anchor: 0,
  startX: 0,
  startY: 0,
  pointerType: "",
  pointerId: null,
  hoursEl: null,
  captureTarget: null,
  holdTimer: null
};

/* Map an absolute clientX to a half-hour slot using a row's .hours rect,
   so it stays correct regardless of horizontal scroll position. The rect spans
   the whole 3-day window, so the result is a base-relative slot. */
function slotFromClientX(clientX, hoursEl) {
  const rect = hoursEl.getBoundingClientRect();
  const cw = rect.width / VIEW_HOURS;
  const rel = clientX - rect.left;
  let idx = Math.floor(rel / cw);
  idx = Math.max(0, Math.min(VIEW_HOURS - 1, idx));
  const within = (rel - idx * cw) / cw;
  return clampSlot((idx + VIEW_H0) * 2 + (within >= 0.5 ? 1 : 0));
}

/* Apply a range to state + DOM without a full render. */
function liveRange(anchorSlot, currentSlot) {
  const a = clampSlot(anchorSlot);
  const b = clampSlot(currentSlot);
  const start = Math.min(a, b);
  const end = Math.min(VIEW_SLOT1, Math.max(a, b) + 1);
  state.selectedStartSlot = start;
  state.selectedEndSlot = end;
  applySelectionDOM();
  updateCursorDOM(b);
  renderIsland();
}

function clearHold() {
  if (drag.holdTimer) {
    clearTimeout(drag.holdTimer);
    drag.holdTimer = null;
  }
}

function startSelecting() {
  drag.selecting = true;
  document.body.classList.add("selecting"); // band tracks snappily + locks scroll
  try { drag.captureTarget?.setPointerCapture?.(drag.pointerId); } catch { /* ignore */ }
}

function beginPointer(event, hoursEl, captureTarget) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const slot = slotFromClientX(event.clientX, hoursEl);
  drag.active = true;
  drag.selecting = false;
  drag.anchor = slot;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.pointerType = event.pointerType;
  drag.pointerId = event.pointerId;
  drag.hoursEl = hoursEl;
  drag.captureTarget = captureTarget;
  clearHold();

  if (event.pointerType === "touch") {
    // Hold still to enter selection mode; a quick swipe scrolls instead.
    drag.holdTimer = setTimeout(() => {
      if (drag.active && !drag.selecting) {
        startSelecting();
        navigator.vibrate?.(15); // subtle haptic where supported
        liveRange(drag.anchor, drag.anchor); // seed a 30m selection immediately
      }
    }, TOUCH_HOLD_MS);
  }
}

function movePointer(event) {
  if (!drag.active) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;

  if (!drag.selecting) {
    if (drag.pointerType === "touch") {
      // Moved before the hold fired => it's a scroll; bail out of selection.
      if (Math.hypot(dx, dy) > TOUCH_MOVE_TOL) {
        clearHold();
        drag.active = false;
      }
      return;
    }
    // Mouse / pen: only start selecting after crossing the threshold.
    if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;
    startSelecting();
  }

  event.preventDefault();
  const cur = slotFromClientX(event.clientX, drag.hoursEl);
  liveRange(drag.anchor, cur);
}

function endPointer(event) {
  if (!drag.active) return;
  clearHold();
  const wasSelecting = drag.selecting;
  try { drag.captureTarget?.releasePointerCapture?.(drag.pointerId); } catch { /* ignore */ }
  drag.active = false;
  drag.selecting = false;
  document.body.classList.remove("selecting"); // re-enable the eased settle glide

  if (!wasSelecting) {
    liveRange(drag.anchor, drag.anchor); // tap = 30m minimum
  }
  // Selected on the rendered yesterday/tomorrow? Make that day the base date
  // (the absolute instant is untouched and the view doesn't move).
  applyCanonical();
  save();
}
