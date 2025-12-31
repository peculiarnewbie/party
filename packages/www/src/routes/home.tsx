import { createFileRoute } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/home")({
    loader: () => getData(),
    component: Home,
});

const getData = createServerFn().handler(() => {
    return {
        message: `Running in ${typeof navigator !== "undefined" ? navigator.userAgent : "server"}`,
        myVar: env.MY_VAR,
    };
});

function Home() {
    const data = Route.useLoaderData();

    return (
        <div class="p-2">
            <h3>Welcome Home!!!</h3>
            <p>{data()?.message}</p>
            <p>{data()?.myVar}</p>
        </div>
    );
}
