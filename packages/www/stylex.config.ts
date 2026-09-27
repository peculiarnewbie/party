import { fileURLToPath } from "node:url";
import stylex from "@stylexjs/unplugin";
import type { UserOptions } from "@stylexjs/unplugin";

export function stylexPlugin({ test = false } = {}) {
    const options = {
        aliases: {
            "~/*": [fileURLToPath(new URL("./src/*", import.meta.url))],
        },
        unstable_moduleResolution: { type: "commonJS" },
        useCSSLayers: {
            before: ["theme", "base", "components", "utilities"],
            prefix: "stylex",
        },
        sxPropName: false,
    } satisfies Partial<UserOptions>;
    return test ? stylex.rollup(options) : stylex.vite(options);
}
