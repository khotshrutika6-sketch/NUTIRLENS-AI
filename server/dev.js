import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import analyzeHandler from "../api/scanner/analyze.js";
import recalculateHandler from "../api/scanner/recalculate.js";

const root = resolve(import.meta.dirname, "..");
const inheritedVariables = new Set(Object.keys(process.env));

async function loadEnvironment(fileName) {
  let contents;
  try {
    contents = await readFile(resolve(root, fileName), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || inheritedVariables.has(match[1])) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    process.env[match[1]] = value;
  }
}

await loadEnvironment(".env");
await loadEnvironment(".env.local");

const routes = new Map([
  ["/api/scanner/analyze", analyzeHandler],
  ["/api/scanner/recalculate", recalculateHandler],
]);
const maxBodyBytes = 4_300_000;

const server = createServer(async (req, res) => {
  const handler = routes.get(new URL(req.url || "/", "http://localhost").pathname);
  if (!handler) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "API route not found." }));
    return;
  }

  try {
    const chunks = [];
    let byteCount = 0;
    for await (const chunk of req) {
      byteCount += chunk.length;
      if (byteCount > maxBodyBytes) {
        res.writeHead(413, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Image payload is too large." }));
        return;
      }
      chunks.push(chunk);
    }
    if (chunks.length) {
      try {
        req.body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "Invalid request body." }));
        return;
      }
    }
    await handler(req, res);
  } catch (error) {
    console.error("Local scanner backend error:", error.message);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    if (!res.writableEnded) res.end(JSON.stringify({ error: "Scanner backend error." }));
  }
});

const port = Number(process.env.SCANNER_API_PORT || 3000);
server.listen(port, "127.0.0.1", () => {
  console.log(`NutriLens scanner API listening on http://127.0.0.1:${port}`);
});
