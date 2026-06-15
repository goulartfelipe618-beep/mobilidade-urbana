const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const requiredFiles = [
  "services/core-node/src/main.ts",
  "services/core-node/src/modules/drivers/domain/driver.ts",
  "apps/client-web/package.json",
  "apps/client-web/src/App.tsx",
  "apps/driver-web/package.json",
  "apps/driver-web/src/App.tsx",
  "apps/admin-web/package.json",
  "apps/admin-web/src/main.tsx",
];

let failed = false;
for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    console.error(`[missing] ${rel}`);
    failed = true;
  } else {
    console.log(`[ok] ${rel}`);
  }
}

const criticalDirs = [
  "services/core-node/src/modules/drivers",
  "apps/client-web/src/pages",
  "apps/driver-web/src/pages",
  "apps/admin-web/src",
];
for (const rel of criticalDirs) {
  const full = path.join(root, rel);
  const files = fs.existsSync(full) ? fs.readdirSync(full, { recursive: true }).filter((item) => /\.(ts|tsx|css|json|html|svg)$/.test(String(item))) : [];
  if (!files.length) {
    console.error(`[empty-dir] ${rel}`);
    failed = true;
  } else {
    console.log(`[ok-dir] ${rel}: ${files.length} files`);
  }
}

if (failed) process.exit(1);
