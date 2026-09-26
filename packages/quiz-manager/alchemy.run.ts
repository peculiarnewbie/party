import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as State from "alchemy/State";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

const defaultState = () => {
    const dev = process.env.ALCHEMY_DEV?.toLowerCase();
    return dev === "1" || dev === "true"
        ? State.localState()
        : Cloudflare.state();
};

export const makeQuizManagerStack = (
    state: Alchemy.StackProps<unknown>["state"] = defaultState(),
) =>
    Alchemy.Stack(
        "QuizManager",
        {
            providers: Cloudflare.providers(),
            state,
        },
        Effect.gen(function* () {
            const stack = yield* Alchemy.Stack;
            const isProduction = stack.stage === "prod";
            const db = yield* Cloudflare.D1.Database("DB", {
                name: isProduction ? "quiz-manager" : undefined,
                migrationsDir: "./drizzle",
            });

            const app = yield* Cloudflare.Website.Vite("QuizManagerApp", {
                name: isProduction ? "quiz-manager" : undefined,
                main: "./src/worker/index.ts",
                dev: {
                    host: "127.0.0.1",
                    port: 3001,
                    strictPort: true,
                },
                compatibility: {
                    date: "2026-01-01",
                    flags: ["nodejs_compat"],
                },
                assets: {
                    runWorkerFirst: true,
                    notFoundHandling: "single-page-application",
                },
                env: {
                    DB: db,
                    ADMIN_PASSWORD: Config.redacted("ADMIN_PASSWORD"),
                    SESSION_SECRET: Config.redacted("SESSION_SECRET"),
                },
            });

            return {
                url: app.url,
                stage: stack.stage,
                workerName: app.workerName,
                databaseName: db.databaseName,
            };
        }),
    );

export default makeQuizManagerStack();
