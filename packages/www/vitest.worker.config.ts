import { defineProject } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineProject({
    resolve: {
        tsconfigPaths: true,
    },
    plugins: [
        cloudflareTest({
            main: "./src/worker/test-entry.ts",
            miniflare: {
                compatibilityDate: "2026-01-01",
                compatibilityFlags: ["nodejs_compat"],
                durableObjects: {
                    WS: { className: "GameRoom", useSQLite: true },
                },
            },
        }),
    ],
    test: {
        name: "worker",
        testTimeout: 15_000,
        // Tests here run inside workerd with real Durable Objects, SQLite,
        // WebSockets, alarms, R2, etc. Add files as they are migrated.
        include: [
            "src/worker/room-storage.test.ts",
            "src/worker/*-room.test.ts",
            "src/worker/player-capability.test.ts",
            "src/worker/room-auth.test.ts",
        ],
    },
});
