import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const E2E_BASE_URL =
    process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const E2E_VIEWPORT = { width: 1440, height: 1200 };
export const E2E_EXECUTABLE_PATH = chromium.executablePath();

export function getE2eArtifactDir(suiteName: string) {
    return path.resolve(__dirname, `../.artifacts/${suiteName}-seeded`);
}
