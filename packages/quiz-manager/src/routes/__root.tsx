/// <reference types="vite/client" />
import {
    HeadContent,
    Scripts,
    createRootRoute,
} from "@tanstack/solid-router";
import { HydrationScript } from "solid-js/web";
import type * as Solid from "solid-js";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
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
        <html>
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
