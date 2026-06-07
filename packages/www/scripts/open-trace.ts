import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const traceDir = path.resolve(__dirname, "../../test-results/traces");

if (!fs.existsSync(traceDir)) {
    console.log("No traces directory found. Run tests first.");
    process.exit(0);
}

const traces = fs
    .readdirSync(traceDir)
    .filter((f) => f.endsWith(".zip") || f.endsWith(".json"))
    .sort()
    .reverse();

if (traces.length === 0) {
    console.log("No traces found. Run tests first.");
    process.exit(0);
}

const traceArg = process.argv[2];
const traceFile = traceArg || traces[0];

if (!traceFile) {
    console.log("No trace file specified.");
    process.exit(1);
}

const tracePath = path.isAbsolute(traceFile)
    ? traceFile
    : path.join(traceDir, traceFile);

if (!fs.existsSync(tracePath)) {
    console.log(`Trace file not found: ${tracePath}`);
    process.exit(1);
}

console.log(`Opening trace: ${tracePath}`);
execSync(`npx playwright show-trace "${tracePath}"`, { stdio: "inherit" });
