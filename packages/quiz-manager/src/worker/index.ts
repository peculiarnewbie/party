import { Effect } from "effect";
import { makeQuizRpcHandler } from "~/rpc/server";
import { QuizDb } from "~/services/quiz-db";
import {
    buildSetCookieHeader,
    createSessionCookie,
    getSessionCookieName,
    parseCookies,
    validatePassword,
    validateSession,
} from "./session";

const login = Effect.fn("Quiz.login")(function* (request: Request, env: Env) {
    const form = yield* Effect.promise(() => request.formData());
    const password = form.get("password");
    if (
        typeof password !== "string" ||
        !(yield* Effect.promise(() =>
            validatePassword(password, env.ADMIN_PASSWORD),
        ))
    ) {
        return new Response(null, {
            status: 303,
            headers: {
                Location: "/login?error=invalid",
                "Cache-Control": "no-store",
            },
        });
    }
    const cookie = yield* Effect.promise(() =>
        createSessionCookie(env.SESSION_SECRET),
    );
    return new Response(null, {
        status: 303,
        headers: {
            Location: "/",
            "Set-Cookie": buildSetCookieHeader(cookie),
            "Cache-Control": "no-store",
        },
    });
});

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const pathname = url.pathname.replace(/\/$/, "");
        if (
            request.method === "POST" &&
            (pathname === "/api/rpc" || pathname === "/login")
        ) {
            if (request.headers.get("Origin") !== url.origin) {
                return new Response("Origin not allowed", { status: 403 });
            }
            if (pathname === "/login")
                return Effect.runPromise(login(request, env), {
                    signal: request.signal,
                });
            if (
                !request.headers
                    .get("Content-Type")
                    ?.startsWith("application/json")
            ) {
                return new Response("Expected JSON", { status: 415 });
            }
            const session = parseCookies(request.headers.get("cookie") ?? "")[
                getSessionCookieName()
            ];
            const authenticated =
                session !== undefined &&
                (await validateSession(env.SESSION_SECRET, session));
            const response = await makeQuizRpcHandler(
                QuizDb.layer(env.DB),
                authenticated,
            )(request);
            response.headers.set("Cache-Control", "no-store");
            return response;
        }
        if (url.pathname.startsWith("/api/"))
            return new Response("Not found", { status: 404 });
        return env.ASSETS.fetch(request);
    },
} satisfies ExportedHandler<Env>;

export { QuizManager } from "./rpc";
