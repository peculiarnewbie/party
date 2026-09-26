import { createRootRoute, Link, Outlet } from "@tanstack/solid-router";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";

export const Route = createRootRoute({
    errorComponent: DefaultCatchBoundary,
    notFoundComponent: () => <NotFound />,
    component: RootLayout,
});

function RootLayout() {
    return (
        <>
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
            <Outlet />
        </>
    );
}
