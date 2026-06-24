"use strict";

/* Glass Time — ui/timezone-picker
   Auto-split from the tested bundle. Edit here; run `node src/build.js` to regenerate dist. */
/* ---------- timezone picker (bottom sheet) ---------- */

function openPicker(mode, zoneId = null) {
  state.pickerMode = mode;
  state.editingZoneId = zoneId;
  const zone = state.zones.find(z => z.id === zoneId);

  els.sheetTitle.textContent = mode === "add" ? "Añadir ciudad" : `Cambiar ${zone?.label || "ciudad"}`;
  els.sheetSubtitle.textContent = mode === "add"
    ? "Elige una zona horaria para añadirla a la timeline."
    : "Toca una opción para reemplazar esta ciudad.";

  els.zoneSearch.value = "";
  renderZoneOptions("");
  els.backdrop.classList.add("open");
  els.sheet.classList.add("open");
  setTimeout(() => els.zoneSearch.focus(), 80);
}

function closePicker() {
  els.backdrop.classList.remove("open");
  els.sheet.classList.remove("open");
  state.editingZoneId = null;
}

function renderZoneOptions(query) {
  const q = query.trim().toLowerCase();
  const now = new Date();

  const matches = ZONE_LIBRARY.filter(([label, timeZone]) => {
    const text = `${label} ${timeZone}`.toLowerCase();
    return !q || text.includes(q);
  });

  if (!matches.length) {
    els.zoneList.innerHTML = `<div class="zone-empty">Sin resultados para “${escapeHTML(query)}”.</div>`;
    return;
  }

  els.zoneList.innerHTML = matches.map(([label, timeZone]) => {
    const p = getParts(now, timeZone);
    return `
      <button class="zone-option" data-label="${escapeHTML(label)}" data-timezone="${escapeHTML(timeZone)}">
        <span>
          <strong>${escapeHTML(label)}</strong>
          <span>${escapeHTML(timeZone)} · Ahora ${fmtDisplayTime(p.hour, p.minute)}</span>
        </span>
        <em>${offsetText(now, timeZone)}</em>
      </button>
    `;
  }).join("");
}

function chooseZone(label, timeZone) {
  if (state.pickerMode === "add") {
    const instant = selectedInstant();
    const duration = normalizedRange().durationSlots;
    const newZone = { id: id(), label, timeZone };
    state.zones.unshift(newZone);
    // New city becomes base — preserve the real-world instant + duration.
    const p = getParts(instant, timeZone);
    const startSlot = p.hour * 2 + (p.minute >= 30 ? 1 : 0);
    state.dateISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
    state.selectedStartSlot = startSlot;
    state.selectedEndSlot = clampSlot(startSlot + duration);
    state.cursorSlot = startSlot;
    showToast(`${label} añadido como base.`);
  } else {
    const zone = state.zones.find(z => z.id === state.editingZoneId);
    if (zone) {
      const editedId = zone.id;
      zone.label = label;
      zone.timeZone = timeZone;
      moveZoneToBase(editedId, true);
      showToast(`${label} seleccionado como base.`);
    }
  }

  closePicker();
  render();
}
