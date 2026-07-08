"use strict";

/* Glass Time — ui/reorder
   Drag a city card vertically to reorder rows. Mouse: drag past a small
   vertical threshold. Touch: hold ~220ms to lift (a quick vertical swipe still
   scrolls the page), then drag. Dropping into position 0 makes that city the
   base, preserving the selected real-world instant. */

const rowDrag = {
  active: false,
  lifted: false,
  pointerId: null,
  pointerType: "",
  row: null,
  startX: 0,
  startY: 0,
  holdTimer: null,
  rows: [],
  mids: [],
  fromIndex: 0,
  target: 0,
  rowH: 0,
  instant: null,
  baseId: null,
  suppressClick: false
};

function rowDragClearHold() {
  if (rowDrag.holdTimer) {
    clearTimeout(rowDrag.holdTimer);
    rowDrag.holdTimer = null;
  }
}

function liftRow() {
  rowDrag.lifted = true;
  rowDrag.suppressClick = true;
  rowDrag.rows = [...els.rows.querySelectorAll(".row")];
  rowDrag.fromIndex = rowDrag.rows.indexOf(rowDrag.row);
  rowDrag.target = rowDrag.fromIndex;
  rowDrag.mids = rowDrag.rows.map(r => {
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2;
  });
  rowDrag.rowH = rowDrag.row.getBoundingClientRect().height;
  rowDrag.instant = selectedInstant();
  rowDrag.baseId = state.zones[0] ? state.zones[0].id : null;
  document.body.classList.add("reordering");
  rowDrag.row.classList.add("lifting");
  navigator.vibrate?.(15);
}

function followRow(clientY) {
  rowDrag.row.style.transform = `translateY(${clientY - rowDrag.startY}px)`;

  // Insertion index = how many *other* rows' (original) midpoints sit above the pointer.
  let t = 0;
  rowDrag.mids.forEach((m, i) => {
    if (i !== rowDrag.fromIndex && m < clientY) t++;
  });
  rowDrag.target = Math.max(0, Math.min(rowDrag.rows.length - 1, t));

  rowDrag.rows.forEach((r, i) => {
    if (r === rowDrag.row) return;
    let shift = 0;
    if (i > rowDrag.fromIndex && i <= rowDrag.target) shift = -rowDrag.rowH;
    else if (i < rowDrag.fromIndex && i >= rowDrag.target) shift = rowDrag.rowH;
    r.style.transform = shift ? `translateY(${shift}px)` : "";
  });
}

function dropRow() {
  const { fromIndex, target } = rowDrag;
  document.body.classList.remove("reordering");
  rowDrag.row.classList.remove("lifting");
  rowDrag.row.style.transform = "";
  rowDrag.rows.forEach(r => { r.style.transform = ""; });
  rowDrag.lifted = false;

  if (target === fromIndex) return; // nothing moved

  const [zone] = state.zones.splice(fromIndex, 1);
  state.zones.splice(target, 0, zone);

  // New base? Re-express the selected instant in its wall time (same rule as
  // moveZoneToBase) so the absolute selection never shifts.
  if (state.zones[0] && state.zones[0].id !== rowDrag.baseId && rowDrag.instant) {
    const duration = normalizedRange().durationSlots;
    const p = getParts(rowDrag.instant, state.zones[0].timeZone);
    const startSlot = p.hour * 2 + (p.minute >= 30 ? 1 : 0);
    state.dateISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    state.selectedStartSlot = startSlot;
    state.selectedEndSlot = clampSlot(startSlot + duration);
    state.cursorSlot = startSlot;
  }

  render();
  showToast(target === 0 ? `${zone.label} ahora es la base.` : `${zone.label} reordenada.`);
}

function initRowReorder() {
  els.rows.addEventListener("pointerdown", event => {
    const card = event.target.closest(".city-card");
    if (!card || event.target.closest(".mini-btn")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    rowDrag.active = true;
    rowDrag.lifted = false;
    rowDrag.suppressClick = false;
    rowDrag.row = card.closest(".row");
    rowDrag.pointerId = event.pointerId;
    rowDrag.pointerType = event.pointerType;
    rowDrag.startX = event.clientX;
    rowDrag.startY = event.clientY;
    rowDragClearHold();
    if (event.pointerType === "touch") {
      rowDrag.holdTimer = setTimeout(() => {
        if (rowDrag.active && !rowDrag.lifted) liftRow();
      }, 220);
    }
  });

  document.addEventListener("pointermove", event => {
    if (!rowDrag.active) return;
    const dx = event.clientX - rowDrag.startX;
    const dy = event.clientY - rowDrag.startY;

    if (!rowDrag.lifted) {
      if (rowDrag.pointerType === "touch") {
        // Moved before the hold fired => it's a page scroll; bail out.
        if (Math.hypot(dx, dy) > 10) {
          rowDragClearHold();
          rowDrag.active = false;
        }
        return;
      }
      // Mouse/pen: a mostly-vertical drag lifts the row.
      if (Math.abs(dy) <= 6 || Math.abs(dy) < Math.abs(dx)) return;
      liftRow();
    }

    event.preventDefault();
    followRow(event.clientY);
  }, { passive: false });

  const endRowDrag = () => {
    if (!rowDrag.active) return;
    rowDragClearHold();
    if (rowDrag.lifted) dropRow();
    rowDrag.active = false;
  };
  document.addEventListener("pointerup", endRowDrag);
  document.addEventListener("pointercancel", endRowDrag);

  // While a row is lifted on touch, block native panning so the drag reorders.
  document.addEventListener("touchmove", event => {
    if (rowDrag.lifted) event.preventDefault();
  }, { passive: false });
}
