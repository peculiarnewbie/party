import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["infra/**/*.infra.test.ts"],
        testTimeout: 60_000,
        hookTimeout: 300_000,
        fileParallelism: false,
    },
});
