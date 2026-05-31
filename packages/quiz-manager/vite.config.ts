import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import viteSolid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    server: {
        port: 3001,
    },
    plugins: [
        tailwindcss(),
        tsConfigPaths({
            projects: ['./tsconfig.json'],
        }),
        cloudflare({ viteEnvironment: { name: 'ssr' } }),
        tanstackStart(),
        viteSolid({ ssr: true }),
    ],
})
