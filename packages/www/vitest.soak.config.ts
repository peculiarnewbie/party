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
        name: "worker-soak",
        testTimeout: 60_000,
        include: ["src/worker/room-soak.test.ts"],
    },
});
