import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "artifacts", "mobile", "web-build");
const output = path.join(root, ".deliverables", "FitPulse-Frontend-Web-Deploy");

if (!fs.existsSync(path.join(source, "index.html"))) {
  throw new Error("Web build not found. Run `pnpm --filter @workspace/mobile run build:web` first.");
}

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, { recursive: true });

const apiUrl = process.env.FRONTEND_API_URL || "https://your-backend.onrender.com/api";
fs.writeFileSync(
  path.join(output, "config.js"),
  `window.__FITPULSE_CONFIG__ = { apiUrl: ${JSON.stringify(apiUrl)} };\n`,
);

const indexPath = path.join(output, "index.html");
const index = fs.readFileSync(indexPath, "utf8");
if (!index.includes('./config.js')) {
  fs.writeFileSync(indexPath, index.replace("</head>", "  <script src=\"./config.js\"></script>\n</head>"));
}

// Expo Router is a client-side SPA on static hosting. Netlify must send
// deep links back to the app shell instead of returning a 404 on refresh.
fs.writeFileSync(path.join(output, "_redirects"), "/* /index.html 200\n");

fs.writeFileSync(
  path.join(output, "DEPLOY-INSTRUCTIONS.txt"),
  `FITPULSE FRONTEND WEB DEPLOY\n\n1. Edit config.js and set apiUrl to your Render backend URL ending in /api.\n2. Upload the contents of this folder to Netlify, Vercel, GitHub Pages, or another static host.\n3. Keep HTTPS enabled because the camera and MediaPipe pose tracker require a secure context.\n4. Put the exact frontend URL into the backend CORS_ORIGIN environment variable.\n\nConfigured API URL at package time: ${apiUrl}\n`,
);

console.log(`Prepared ${path.relative(root, output)}`);
