import {
    createRootRoute,
    Link,
    Outlet,
    useRouterState,
} from "@tanstack/solid-router";
import { Show } from "solid-js";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";

export const Route = createRootRoute({
    errorComponent: DefaultCatchBoundary,
    notFoundComponent: () => <NotFound />,
    component: RootLayout,
});

function RootLayout() {
    const immersive = useRouterState({
        select: (state) =>
            state.location.search.view === "display" ||
            state.location.search.view === "controller",
    });
    return (
        <>
            <Show when={!immersive()}>
                <div class="p-2 flex gap-2 text-lg">
                    <Link
                        to="/"
                        activeProps={{ class: "font-bold" }}
                        activeOptions={{ exact: true }}
                    >
                        Home
                    </Link>
                </div>
                <hr />
            </Show>
            <Outlet />
        </>
    );
}
