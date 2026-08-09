import { defineProject } from "vitest/config";
import viteSolid from "vite-plugin-solid";

export default defineProject({
    resolve: {
        tsconfigPaths: true,
    },
    plugins: [viteSolid({ hot: false })],
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
