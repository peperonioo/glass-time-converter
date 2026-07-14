"use strict";

/* Glass Time — ui/onboarding
   First-run coach marks (the gestures are invisible otherwise) and a one-time
   iOS "add to home screen" hint. Everything dismisses on tap, persists in
   localStorage, and never shows twice. */

const ONBOARD_KEY = "glass-time-onboard-v1";
const INSTALL_KEY = "glass-time-install-hint";
const VISITS_KEY = "glass-time-visits";

function showCoach(step) {
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const tips = [
    {
      anchor: () => els.rows.querySelector(".row:first-child .cell[data-hour='9']") || els.rows.querySelector(".cell"),
      text: isTouch
        ? "<b>Mantén pulsado</b> y arrastra para elegir un rango de horas"
        : "<b>Haz clic y arrastra</b> para elegir un rango de horas"
    },
    {
      anchor: () => els.rows.querySelector(".city-card"),
      text: isTouch
        ? "Toca una ciudad para cambiarla · <b>doble toque</b> = ahora · <b>mantén y arrastra ↑↓</b> para reordenar"
        : "Haz clic en una ciudad para cambiarla · <b>doble clic</b> = ahora · <b>arrastra ↑↓</b> para reordenar"
    }
  ];

  if (step >= tips.length) {
    try { localStorage.setItem(ONBOARD_KEY, "1"); } catch { /* ignore */ }
    return;
  }

  const target = tips[step].anchor();
  if (!target) { showCoach(step + 1); return; }

  const rect = target.getBoundingClientRect();
  const tip = document.createElement("div");
  tip.className = "coach";
  tip.innerHTML = `<span>${tips[step].text}</span><em>toca para seguir</em>`;
  document.body.appendChild(tip);

  // Place under the anchor, clamped to the viewport.
  const place = () => {
    const w = tip.offsetWidth;
    const left = Math.max(10, Math.min(window.innerWidth - w - 10, rect.left + rect.width / 2 - w / 2));
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.min(window.innerHeight - tip.offsetHeight - 12, rect.bottom + 10)}px`;
  };
  place();
  requestAnimationFrame(() => tip.classList.add("show"));

  let done = false;
  const next = () => {
    if (done) return;
    done = true;
    tip.classList.remove("show");
    setTimeout(() => tip.remove(), 250);
    setTimeout(() => showCoach(step + 1), 320);
  };
  tip.addEventListener("pointerdown", next);
  document.addEventListener("pointerdown", next, { once: true, capture: true });
  setTimeout(next, 8000); // auto-advance
}

function maybeShowInstallHint() {
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const standalone = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  if (!isIOS || standalone) return;
  let visits = 0;
  try {
    if (localStorage.getItem(INSTALL_KEY)) return;
    visits = (parseInt(localStorage.getItem(VISITS_KEY), 10) || 0) + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
  } catch { return; }
  if (visits < 2) return; // don't nag on the very first visit

  const hint = document.createElement("div");
  hint.className = "install-hint";
  hint.innerHTML = `<span>Instálala: <b>Compartir <svg viewBox="0 0 16 20" aria-hidden="true"><path d="M8 1l3.5 3.5-.9.9L8.6 3.4V13H7.4V3.4L5.4 5.4l-.9-.9L8 1zM3 8h2v1.2H4.2v8.6h7.6V9.2H10V8h2a1 1 0 0 1 1 1v9.8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="currentColor"/></svg></b> → “Añadir a pantalla de inicio”</span><button aria-label="Cerrar">×</button>`;
  document.body.appendChild(hint);
  requestAnimationFrame(() => hint.classList.add("show"));
  const dismiss = () => {
    try { localStorage.setItem(INSTALL_KEY, "1"); } catch { /* ignore */ }
    hint.classList.remove("show");
    setTimeout(() => hint.remove(), 300);
  };
  hint.querySelector("button").addEventListener("click", dismiss);
  setTimeout(dismiss, 12000);
}

function initOnboarding() {
  let seen = null;
  try { seen = localStorage.getItem(ONBOARD_KEY); } catch { seen = "1"; }
  if (!seen) setTimeout(() => showCoach(0), 1400);
  setTimeout(maybeShowInstallHint, 2600);
}
