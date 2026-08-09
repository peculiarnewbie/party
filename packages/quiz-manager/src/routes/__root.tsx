/// <reference types="vite/client" />
import {
    HeadContent,
    Scripts,
    createRootRoute,
    redirect,
} from "@tanstack/solid-router";
import { HydrationScript } from "solid-js/web";
import type * as Solid from "solid-js";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import appCss from "~/styles/app.css?url";
import { getAdminSession } from "~/server/admin-auth";

export const Route = createRootRoute({
    beforeLoad: async ({ location }) => {
        if (location.pathname === "/login") return;
        if (!(await getAdminSession())) {
            throw redirect({ to: "/login" });
        }
    },
    head: () => ({
        meta: [
            {
                charset: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
        ],
        links: [{ rel: "stylesheet", href: appCss }],
    }),
    errorComponent: DefaultCatchBoundary,
    notFoundComponent: () => <NotFound />,
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: Solid.JSX.Element }) {
    return (
        <html lang="en">
            <head>
                <HydrationScript />
            </head>
            <body>
                <HeadContent />
                {children}
                <Scripts />
            </body>
        </html>
    );
}
