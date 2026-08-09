import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as State from "alchemy/State";
import * as Effect from "effect/Effect";

import type { GameRoom } from "./src/worker/ws";

const defaultState = () => {
    const dev = process.env.ALCHEMY_DEV?.toLowerCase();
    return dev === "1" || dev === "true"
        ? State.localState()
        : Cloudflare.state();
};

export const makePartyStack = (
    state: Alchemy.StackProps<unknown>["state"] = defaultState(),
) =>
    Alchemy.Stack(
        "Party",
        {
            providers: Cloudflare.providers(),
            state,
        },
        Effect.gen(function* () {
            const stack = yield* Alchemy.Stack;
            const isProduction = stack.stage === "prod";
            const db = yield* Cloudflare.D1.Database("DB", {
                name: isProduction ? "party" : undefined,
            });

            const bucket = yield* Cloudflare.R2.Bucket("BUCKET", {
                name: isProduction ? "party" : undefined,
            });

            const gameRoom = Cloudflare.DurableObject<GameRoom>("WS", {
                className: "GameRoom",
            });

            const app = yield* Cloudflare.Website.Vite("PartyApp", {
                name: isProduction ? "party" : undefined,
                main: "./src/worker/index.ts",
                dev: {
                    host: "127.0.0.1",
                    port: 3000,
                    strictPort: true,
                },
                compatibility: {
                    date: "2026-01-01",
                    flags: ["nodejs_compat"],
                },
                assets: {
                    runWorkerFirst: true,
                },
                env: {
                    DB: db,
                    BUCKET: bucket,
                    WS: gameRoom,
                    MY_VAR: "Hello from Cloudflare",
                },
                domain: isProduction ? "party.peculiarnewbie.com" : undefined,
            });

            return {
                url: app.url,
                stage: stack.stage,
                workerName: app.workerName,
                databaseName: db.databaseName,
                bucketName: bucket.bucketName,
                domain: app.domain,
                durableObjectNamespaces: app.durableObjectNamespaces,
            };
        }),
    );

export default makePartyStack();
