// @ts-nocheck - Route types will be generated when dev server runs
import { createFileRoute, redirect } from "@tanstack/solid-router";
import { env } from "cloudflare:workers";
import {
    createSessionCookie,
    buildSetCookieHeader,
    parseCookies,
    getSessionCookieName,
    validateSession,
} from "~/worker/session";

export const Route = createFileRoute("/login")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const cookieHeader = request.headers.get("Cookie") ?? "";
                const cookies = parseCookies(cookieHeader);
                const sessionCookie = cookies[getSessionCookieName()];

                if (
                    sessionCookie &&
                    (await validateSession(env.ADMIN_PASSWORD, sessionCookie))
                ) {
                    return redirect({ to: "/" });
                }

                return new Response(
                    loginPage({ error: null }),
                    { headers: { "Content-Type": "text/html" } },
                );
            },
            POST: async ({ request }) => {
                const formData = await request.formData();
                const password = formData.get("password") as string;

                if (!password || password !== env.ADMIN_PASSWORD) {
                    return new Response(
                        loginPage({ error: "Invalid password" }),
                        {
                            status: 401,
                            headers: { "Content-Type": "text/html" },
                        },
                    );
                }

                const sessionValue = await createSessionCookie(
                    env.SESSION_SECRET,
                );
                const setCookie = buildSetCookieHeader(sessionValue);

                return new Response(null, {
                    status: 302,
                    headers: {
                        Location: "/",
                        "Set-Cookie": setCookie,
                    },
                });
            },
        },
    },
});

function loginPage({ error }: { error: string | null }) {
    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quiz Manager — Login</title>
    <link rel="stylesheet" href="/src/styles/app.css">
    <style>
        body { font-family: 'Karla', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    </style>
</head>
<body class="bg-gray-50 dark:bg-gray-950">
    <div class="w-full max-w-sm p-6">
        <h1 class="text-3xl font-bebas mb-6 text-center">Quiz Manager</h1>
        <form method="POST" class="space-y-4">
            <div>
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    required
                    autofocus
                    class="w-full px-3 py-2 border rounded bg-white dark:bg-gray-900 dark:border-gray-700"
                />
            </div>
            ${error ? `<p class="text-red-500 text-sm">${error}</p>` : ""}
            <button
                type="submit"
                class="w-full px-3 py-2 bg-emerald-600 text-white rounded uppercase font-bold text-sm hover:bg-emerald-700 transition-colors"
            >
                Log In
            </button>
        </form>
    </div>
</body>
</html>`;
}
