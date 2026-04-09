import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STAGEHAND_BASE_URL = "http://127.0.0.1:3000";
export const STAGEHAND_VIEWPORT = { width: 1440, height: 1200 };
export const STAGEHAND_ARTIFACT_DIR = path.resolve(
    __dirname,
    "../.artifacts/yahtzee-seeded",
);
export const STAGEHAND_EXECUTABLE_PATH = chromium.executablePath();
