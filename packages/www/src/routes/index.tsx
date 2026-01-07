import { createFileRoute, Link } from "@tanstack/solid-router";
import { createSignal } from "solid-js";

export const Route = createFileRoute("/")({
    component: Index,
});

function Index() {
    return (
        <div class="p-2 flex flex-col items-center">
            <h1 class="text-7xl font-bold pb-4">AL AUDI ENGLISH HOME </h1>
            <a
                href="http://wa.me/6282160421987"
                target="_blank"
                class="bg-cyan-900 p-3 rounded-md font-medium text-lg"
            >
                Register
            </a>
        </div>
    );
}
