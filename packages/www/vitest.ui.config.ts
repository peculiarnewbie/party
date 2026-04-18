import { defineProject } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";
import viteSolid from "vite-plugin-solid";

export default defineProject({
    plugins: [
        tsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
        viteSolid(),
    ],
    test: {
        name: "ui",
        include: ["src/**/*.test.{ts,tsx}"],
        exclude: [
            // Tests migrated to the real Cloudflare runtime run in the
            // "worker" project instead (see vitest.worker.config.ts).
            "src/worker/*.test.ts",
        ],
        environment: "happy-dom",
        setupFiles: ["./src/test/setup.ts"],
    },
});
