// Fails when any file under src/ exceeds the 200-line component budget.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const LIMIT = 200;
const offenders = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx?|css)$/.test(name)) {
      const lines = readFileSync(path, "utf8").split("\n").length;
      if (lines > LIMIT) offenders.push(`${path}: ${lines}`);
    }
  }
})("src");

if (offenders.length) {
  console.error(`Over ${LIMIT} lines:\n  ${offenders.join("\n  ")}`);
  process.exit(1);
}
console.log(`All files under src/ are within ${LIMIT} lines.`);
