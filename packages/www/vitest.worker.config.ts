import { defineProject } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineProject({
    plugins: [
        cloudflareTest({
            main: "./src/worker/test-entry.ts",
            wrangler: { configPath: "./wrangler.jsonc" },
        }),
        tsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
    ],
    test: {
        name: "worker",
        // Tests here run inside workerd with real Durable Objects, SQLite,
        // WebSockets, alarms, R2, etc. Add files as they are migrated.
        include: [
            "src/worker/room-storage.test.ts",
            "src/worker/poker-room.test.ts",
            "src/worker/yahtzee-room.test.ts",
        ],
    },
});
