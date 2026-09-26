import { createRootRoute, Outlet, redirect } from "@tanstack/solid-router";
import { Loading } from "solid-js";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import { runQuiz } from "~/rpc/client";

export const Route = createRootRoute({
    beforeLoad: async ({ location, abortController }) => {
        if (location.pathname === "/login") return;
        if (
            !(await runQuiz(
                (client) => client.getAdminSession(),
                abortController.signal,
            ))
        ) {
            throw redirect({ to: "/login" });
        }
    },
    errorComponent: DefaultCatchBoundary,
    notFoundComponent: () => <NotFound />,
    component: () => (
        <Loading fallback={<p class="p-8 font-karla">Loading...</p>}>
            <Outlet />
        </Loading>
    ),
});
