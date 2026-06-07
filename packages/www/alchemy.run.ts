import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export default Alchemy.Stack(
    "Party",
    {
        providers: Cloudflare.providers(),
        state: Cloudflare.state(),
    },
    Effect.gen(function* () {
        const db = yield* Cloudflare.D1Database("DB", {
            name: "party",
        });

        const bucket = yield* Cloudflare.R2Bucket("BUCKET", {
            name: "party",
        });

        const gameRoom = Cloudflare.DurableObjectNamespace("WS", {
            className: "GameRoom",
        });

        const app = yield* Cloudflare.Vite("PartyApp", {
            name: "party",
            compatibility: {
                date: "2026-01-01",
                flags: ["nodejs_compat"],
            },
            bindings: {
                DB: db,
                BUCKET: bucket,
                WS: gameRoom,
            },
            env: {
                MY_VAR: "Hello from Cloudflare",
            },
            domain: "party.peculiarnewbie.com",
        });

        return { url: app.url };
    }),
);
