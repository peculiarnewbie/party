import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";
import viteSolid from "vite-plugin-solid";

export default defineConfig({
    plugins: [
        tsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
        viteSolid(),
    ],
    test: {
        include: ["src/**/*.test.{ts,tsx}"],
        environment: "happy-dom",
        setupFiles: ["./src/test/setup.ts"],
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
