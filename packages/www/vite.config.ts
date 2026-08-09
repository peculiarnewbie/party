import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import viteSolid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

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
    plugins: [tailwindcss(), tanstackStart(), viteSolid({ ssr: true })],
});
