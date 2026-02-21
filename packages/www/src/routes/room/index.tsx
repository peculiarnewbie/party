import { createFileRoute, Link } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { createSignal, onMount } from "solid-js";

export const Route = createFileRoute("/room/")({
    component: RouteComponent,
});

function RouteComponent() {
    let ws: WebSocket;

    onMount(async () => {
        ws = new WebSocket("ws://localhost:3000/api/room/hey");
        ws.onmessage = (e) => {
            console.log(e.data);
        };
    });

    const connect = (name: string) => {
        ws.send(JSON.stringify({ user: name, data: { message: "hello" } }));
    };

    const [name, setName] = createSignal("");

    const [roomId, setRoomId] = createSignal("");

    const joinRoom = (e: Event) => {
        e.preventDefault();
        if (roomId()) {
            window.location.href = `/room/${roomId()}`;
        }
    };

    return (
        <div class="min-h-screen flex flex-col items-center justify-center p-4">
            <h1 class="text-4xl font-bold mb-8">Quiz Party</h1>
            <form
                onSubmit={joinRoom}
                class="flex flex-col gap-4 w-full max-w-sm"
            >
                <input
                    type="text"
                    placeholder="Enter room name"
                    value={roomId()}
                    onInput={(e) => setRoomId(e.currentTarget.value)}
                    class="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={!roomId()}
                    class="px-4 py-3 text-lg bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Join Room
                </button>
            </form>
            <div class="mt-8 text-gray-500">
                <Link to="/" class="hover:underline">
                    Home
                </Link>
            </div>
        </div>
    );
}
