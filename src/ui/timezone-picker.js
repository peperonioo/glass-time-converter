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

const RECENT_KEY = "glass-time-recent-zones";

function recentZones() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}

function rememberZone(label, timeZone) {
  try {
    const list = [[label, timeZone], ...recentZones().filter(z => z[1] !== timeZone || z[0] !== label)].slice(0, 3);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

function zoneOptionHTML(now) {
  return ([label, timeZone]) => {
    const p = getParts(now, timeZone);
    return `
      <button class="zone-option" data-label="${escapeHTML(label)}" data-timezone="${escapeHTML(timeZone)}">
        <span>
          <strong>${escapeHTML(label)}</strong>
          <span>${escapeHTML(zoneSubtitle(timeZone, label))} · Ahora ${fmtDisplayTime(p.hour, p.minute)}</span>
        </span>
        <em>${offsetText(now, timeZone)}</em>
      </button>
    `;
  };
}

function renderZoneOptions(query) {
  const q = normSearch(query.trim());
  const now = new Date();
  const hit = ([label, timeZone]) => !q || normSearch(`${label} ${timeZone}`).includes(q);
  const option = zoneOptionHTML(now);

  // Curated cities first; with a query, extend into the full IANA list (~418
  // zones from the runtime) skipping timezones the curated hits already cover.
  const curated = ZONE_LIBRARY.filter(hit);

  if (!q) {
    // Browsing: last-used zones on top, then the curated library.
    const recent = recentZones();
    const recentHTML = recent.length
      ? `<div class="zone-group-label">Recientes</div>` + recent.map(option).join("") +
        `<div class="zone-group-label">Todas las ciudades</div>`
      : "";
    els.zoneList.innerHTML = recentHTML + curated.map(option).join("");
    return;
  }

  const seenTz = new Set(curated.map(z => z[1]));
  const extra = fullZoneList().filter(z => !seenTz.has(z[1]) && hit(z));
  const matches = curated.concat(extra).slice(0, 60);

  if (!matches.length) {
    els.zoneList.innerHTML = `<div class="zone-empty">Sin resultados para “${escapeHTML(query)}”.</div>`;
    return;
  }

  els.zoneList.innerHTML = matches.map(option).join("");
}

/* The base only changes when the user says so (⌖ button, dragging a row to the
   top, or editing the base row itself). Adding or editing other cities never
   steals the base. */
function chooseZone(label, timeZone) {
  rememberZone(label, timeZone);

  if (state.pickerMode === "add") {
    state.zones.push({ id: id(), label, timeZone });
    showToast(`${label} añadida.`);
  } else {
    const zone = state.zones.find(z => z.id === state.editingZoneId);
    if (zone) {
      const isBase = state.zones[0] && state.zones[0].id === zone.id;
      if (isBase) {
        // Editing the base row: it stays base with the new timezone, and the
        // selected absolute instant is re-expressed in its wall time.
        const instant = selectedInstant();
        const duration = normalizedRange().durationSlots;
        zone.label = label;
        zone.timeZone = timeZone;
        const p = getParts(instant, timeZone);
        const startSlot = p.hour * 2 + (p.minute >= 30 ? 1 : 0);
        state.dateISO = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
        state.selectedStartSlot = startSlot;
        state.selectedEndSlot = clampSlot(startSlot + duration);
        state.cursorSlot = startSlot;
        showToast(`Base cambiada a ${label}.`);
      } else {
        // Non-base city: replace in place — order and base untouched.
        zone.label = label;
        zone.timeZone = timeZone;
        showToast(`${label} actualizada.`);
      }
    }
  }

  closePicker();
  render();
}
