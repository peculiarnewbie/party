import { redirect } from "@tanstack/solid-router";
import { createMiddleware, createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import {
    getSessionCookieName,
    parseCookies,
    validateSession,
} from "~/worker/session";

export async function isAuthenticatedRequest(
    headers: Headers,
    secret: string,
): Promise<boolean> {
    const cookies = parseCookies(headers.get("cookie") ?? "");
    const session = cookies[getSessionCookieName()];
    return session !== undefined && validateSession(secret, session);
}

export const requireAdmin = createMiddleware({ type: "function" }).server(
    async ({ next }) => {
        if (
            !(await isAuthenticatedRequest(
                getRequestHeaders(),
                env.SESSION_SECRET,
            ))
        ) {
            throw redirect({ to: "/login" });
        }
        return next({ context: { isAdmin: true as const } });
    },
);

export const getAdminSession = createServerFn({ method: "GET" }).handler(() =>
    isAuthenticatedRequest(getRequestHeaders(), env.SESSION_SECRET),
);
