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
        environment: "node",
    },
});
