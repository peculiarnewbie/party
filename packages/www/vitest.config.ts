import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        projects: ["./vitest.ui.config.ts", "./vitest.worker.config.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "json-summary"],
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.test.{ts,tsx}",
                "src/**/test-helpers.ts",
                "src/**/fixtures.ts",
                "src/**/fixture-transcripts.ts",
                "src/test/**",
                "src/routes/**",
                "src/worker/**",
                "src/routeTree.gen.ts",
                "src/router.tsx",
                "src/ssr.tsx",
                "src/client.tsx",
                "src/assets/**",
            ],
        },
    },
});
