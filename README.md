# Glass Time

Conversor visual de zonas horarias con estética *liquid glass*. Compara varias
ciudades en una línea de tiempo de 24 h, selecciona un rango con precisión de
30 minutos y expórtalo a Google Calendar o `.ics`.

**App (PWA):** https://peperonioo.github.io/glass-time-converter/

![Glass Time](docs/icons/icon-512.png)

## Características

- Línea de tiempo horizontal de 24 h, multi-ciudad.
- La primera ciudad es la base; al cambiar/añadir una ciudad pasa a ser la base
  preservando el instante real seleccionado.
- Selección de rango por clic-y-arrastre con precisión de 30 min.
- Banda de selección flotante que se desliza suavemente entre las filas.
- Marcas de cambio de día (divisor a medianoche + fecha) y AM/PM bajo cada hora.
- Export a **Google Calendar** y **.ics** (con recordatorio de 15 min) usando el
  rango exacto y la conversión a todas las ciudades.
- Persistencia en `localStorage`.
- DST-safe (usa `Intl` para las conversiones).
- Instalable como **PWA** y funciona **offline**.

## Estructura

```
/src
  /core   date-utils.js · timezone-engine.js · calendar-export.js
  /state  store.js · persistence.js
  /ui     timeline-renderer.js · cursor-controller.js · range-selection.js
          timezone-picker.js · calendar-menu.js
  /data   timezone-library.js
  /pwa    manifest.webmanifest · sw.js · icons/
  shell.html   (markup + estilos, fuente única)
  build.js     (concatena módulos → dist + docs)
  main.js      (acciones, wiring, bootstrap)
/dist
  glass-time.html   (single-file autocontenido — usar offline desde disco)
/docs
  index.html + manifest + sw.js + icons  (PWA desplegada en GitHub Pages)
```

Los módulos son scripts clásicos que comparten *scope* global (sin `import` /
`export`), así que el "build" es una concatenación ordenada **sin dependencias
externas**.

## Build

```bash
node src/build.js
```

Regenera `dist/glass-time.html` (single file) y `docs/` (sitio PWA). Edita los
módulos en `/src`, no los archivos generados.

## Desarrollo local

Sirve la carpeta `docs/` sobre `http://localhost` (el service worker necesita un
contexto seguro; `localhost` cuenta):

```bash
node .claude/server.js   # sirve /docs en http://localhost:4173
```

## Licencia

MIT — ver [LICENSE](LICENSE).
