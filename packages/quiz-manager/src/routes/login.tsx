import { createFileRoute } from "@tanstack/solid-router";
import { Show } from "solid-js";

export const Route = createFileRoute("/login")({
    validateSearch: (search: Record<string, unknown>) => ({
        invalid: search.error === "invalid",
    }),
    component: Login,
});

function Login() {
    const search = Route.useSearch();
    return (
        <main class="min-h-screen grid place-items-center bg-[#f5f0e8] font-karla">
            <form
                action="/login"
                method="post"
                class="w-full max-w-sm space-y-4 border-2 border-[#1a1a1a] bg-white p-8"
            >
                <h1 class="font-bebas text-3xl">Quiz Manager</h1>
                <label class="block">
                    Admin password
                    <input
                        type="password"
                        name="password"
                        required
                        autocomplete="current-password"
                        class="mt-2 w-full border-2 p-3"
                    />
                </label>
                <Show when={search().invalid}>
                    <p role="alert" class="text-[#c0261a]">
                        Invalid password
                    </p>
                </Show>
                <button
                    type="submit"
                    class="w-full bg-[#1a3a6e] p-3 text-white"
                >
                    Sign in
                </button>
            </form>
        </main>
    );
}
