"use strict";

/* Glass Time — ui/share
   Shareable state: a URL that encodes the current selection, and a glass image
   card (canvas -> PNG) shared via the Web Share API or downloaded. */

function buildShareURL() {
  const { start, end } = normalizedRange();
  const params = new URLSearchParams();
  params.set("d", state.dateISO);
  params.set("s", start);
  params.set("e", end);
  params.set("z", state.zones.map(z => `${z.label}~${z.timeZone}`).join(";"));
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

/* Apply state encoded in the URL (if any). Returns true when applied. */
function applyStateFromURL() {
  const p = new URLSearchParams(location.search);
  if (!p.has("z") && !p.has("d")) return false;
  try {
    const z = p.get("z");
    if (z) {
      const zones = z.split(";").map(item => {
        const sep = item.indexOf("~");
        const label = item.slice(0, sep);
        const timeZone = item.slice(sep + 1);
        return { id: id(), label, timeZone };
      }).filter(zone => zone.timeZone);
      if (zones.length) state.zones = zones;
    }
    if (p.get("d")) state.dateISO = p.get("d");
    const s = parseInt(p.get("s"), 10);
    const e = parseInt(p.get("e"), 10);
    if (Number.isInteger(s)) state.selectedStartSlot = clampSlot(s);
    if (Number.isInteger(e)) state.selectedEndSlot = clampSlot(e);
    state.cursorSlot = state.selectedStartSlot;
    return true;
  } catch {
    return false;
  }
}

function roundRectPath(ctx, px, py, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(px + r, py);
  ctx.arcTo(px + w, py, px + w, py + h, r);
  ctx.arcTo(px + w, py + h, px, py + h, r);
  ctx.arcTo(px, py + h, px, py, r);
  ctx.arcTo(px, py, px + w, py, r);
  ctx.closePath();
}

/* Render a premium glass card summarising the selection across all cities. */
function buildShareCanvas() {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");

  // Background
  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#080a16");
  bg.addColorStop(0.6, "#10152a");
  bg.addColorStop(1, "#181d38");
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const glow1 = x.createRadialGradient(W * 0.16, H * 0.08, 0, W * 0.16, H * 0.08, W * 0.7);
  glow1.addColorStop(0, "rgba(115,198,255,.34)"); glow1.addColorStop(1, "rgba(115,198,255,0)");
  x.fillStyle = glow1; x.fillRect(0, 0, W, H);
  const glow2 = x.createRadialGradient(W * 0.9, H * 0.95, 0, W * 0.9, H * 0.95, W * 0.7);
  glow2.addColorStop(0, "rgba(255,181,223,.24)"); glow2.addColorStop(1, "rgba(255,181,223,0)");
  x.fillStyle = glow2; x.fillRect(0, 0, W, H);

  const base = baseZone();
  const startInstant = selectedInstant();
  const endInstant = selectedEndInstant();
  const baseStart = getParts(startInstant, base.timeZone);
  const baseEnd = getParts(endInstant, base.timeZone);
  const { durationSlots } = normalizedRange();

  const pad = 84;
  let y = 150;

  // Brand
  x.fillStyle = "rgba(255,255,255,.62)";
  x.font = "600 30px -apple-system, Inter, Segoe UI, sans-serif";
  x.textBaseline = "alphabetic";
  x.fillText("G L A S S   T I M E", pad, y);

  // Headline
  y += 110;
  x.fillStyle = "#ffffff";
  x.font = "800 116px -apple-system, Inter, Segoe UI, sans-serif";
  x.fillText(durationText(durationSlots), pad, y);

  y += 70;
  x.fillStyle = "rgba(255,255,255,.82)";
  x.font = "600 44px -apple-system, Inter, Segoe UI, sans-serif";
  x.fillText(`${base.label} · ${fmtDisplayTime(baseStart.hour, baseStart.minute)}–${fmtDisplayTime(baseEnd.hour, baseEnd.minute)}`, pad, y);

  y += 56;
  x.fillStyle = "rgba(255,255,255,.5)";
  x.font = "500 34px -apple-system, Inter, Segoe UI, sans-serif";
  x.fillText(new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: base.timeZone }).format(startInstant), pad, y);

  // City rows
  y += 96;
  const rowH = 132;
  const colors = COLORS;
  state.zones.forEach((zone, i) => {
    if (y + rowH > H - 130) return; // keep within the card
    roundRectPath(x, pad, y - 60, W - pad * 2, rowH - 24, 28);
    x.fillStyle = "rgba(255,255,255,.05)";
    x.fill();

    // color dot
    x.fillStyle = colors[i % colors.length];
    x.beginPath(); x.arc(pad + 44, y, 16, 0, Math.PI * 2); x.fill();

    const s = getParts(startInstant, zone.timeZone);
    const e = getParts(endInstant, zone.timeZone);

    x.fillStyle = "#ffffff";
    x.font = "700 42px -apple-system, Inter, Segoe UI, sans-serif";
    x.fillText(zone.label, pad + 84, y + 4);

    x.fillStyle = "rgba(255,255,255,.55)";
    x.font = "500 28px -apple-system, Inter, Segoe UI, sans-serif";
    x.fillText(zoneSubtitle(zone.timeZone, zone.label), pad + 84, y + 40);

    const range = `${fmtDisplayTime(s.hour, s.minute)}–${fmtDisplayTime(e.hour, e.minute)}`;
    x.fillStyle = "rgba(255,255,255,.92)";
    x.font = "700 42px -apple-system, Inter, Segoe UI, sans-serif";
    x.textAlign = "right";
    x.fillText(range, W - pad - 24, y + 4);
    x.fillStyle = "rgba(255,255,255,.5)";
    x.font = "500 28px -apple-system, Inter, Segoe UI, sans-serif";
    x.fillText(offsetText(startInstant, zone.timeZone), W - pad - 24, y + 40);
    x.textAlign = "left";

    y += rowH;
  });

  // Footer
  x.fillStyle = "rgba(255,255,255,.4)";
  x.font = "500 30px -apple-system, Inter, Segoe UI, sans-serif";
  x.fillText("peperonioo.github.io/glass-time-converter", pad, H - 70);

  return c;
}

async function shareSelection() {
  const url = buildShareURL();
  const canvas = buildShareCanvas();
  canvas.toBlob(async blob => {
    const file = blob && new File([blob], `glass-time-${state.dateISO}.png`, { type: "image/png" });
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Glass Time",
          text: `Hora seleccionada · ${baseZone().label}`,
          url
        });
        return;
      } catch { /* user cancelled or unsupported — fall through */ }
    }
    if (blob) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    }
    navigator.clipboard?.writeText(url);
    showToast("Imagen guardada · link copiado");
  }, "image/png");
}
