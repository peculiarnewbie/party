import { readdirSync, readFileSync } from "node:fs";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: { tsconfigPaths: true },
    plugins: [
        cloudflareTest({
            main: "./src/worker/index.ts",
            miniflare: {
                compatibilityDate: "2026-01-01",
                compatibilityFlags: ["nodejs_compat"],
                d1Databases: ["DB"],
                bindings: {
                    ADMIN_PASSWORD: "test-password",
                    SESSION_SECRET: "test-session-secret",
                    TEST_MIGRATIONS: readdirSync("./drizzle")
                        .filter((name) => name.endsWith(".sql"))
                        .sort()
                        .map((name) => ({
                            name,
                            queries: readFileSync(`./drizzle/${name}`, "utf8")
                                .split("--> statement-breakpoint")
                                .map((query) => query.trim())
                                .filter(Boolean),
                        })),
                },
            },
        }),
    ],
    test: { include: ["src/rpc/*.worker.test.ts"], testTimeout: 15_000 },
});
