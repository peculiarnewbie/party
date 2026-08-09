import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import viteSolid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        port: 3000,
        host: "127.0.0.1",
    },
    plugins: [
        tailwindcss(),
        cloudflare({ viteEnvironment: { name: "ssr" } }),
        tanstackStart(),
        viteSolid({ ssr: true }),
    ],
});
