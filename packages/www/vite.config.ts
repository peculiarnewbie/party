import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteSolid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { stylexPlugin } from "./stylex.config";

export default defineConfig({
    build: {
        rolldownOptions: {
            external: [/^cloudflare:/],
        },
    },
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        port: 3000,
        host: "127.0.0.1",
    },
    plugins: [
        stylexPlugin(),
        tailwindcss(),
        tanstackRouter({ target: "solid", autoCodeSplitting: true }),
        viteSolid(),
    ],
});
