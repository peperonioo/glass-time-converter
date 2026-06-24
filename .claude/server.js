const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "docs");
const port = 4173;

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.join(root, urlPath);
  if (!file.startsWith(root)) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    const ext = path.extname(file);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".webmanifest": "application/manifest+json; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "text/plain; charset=utf-8", "Service-Worker-Allowed": "/" });
    res.end(data);
  });
}).listen(port, () => console.log("serving dist on " + port));
