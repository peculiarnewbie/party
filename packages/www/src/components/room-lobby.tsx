import {
    Show,
    For,
    Component,
    createSignal,
    createEffect,
    onMount,
} from "solid-js";
import { Player } from "~/game";

export const RoomLobby: Component<{
    roomId: string;
    playerId: string | null;
    name: string;
    setName: (name: string) => void;
    players: Player[];
    isHost: boolean;
    isJoined: boolean;
    onJoin: (name: string) => void;
    onLeave: () => void;
    onStart: () => void;
}> = (props) => {
    const [isEditing, setIsEditing] = createSignal(false);
    let inputRef: HTMLInputElement | undefined;

    onMount(() => {
        if (!props.isJoined) setIsEditing(true);
    });

    createEffect(() => {
        if (isEditing()) {
            inputRef?.focus();
        }
    });

    const handleRenameClick = () => {
        setIsEditing(true);
    };

    const handleSaveName = () => {
        if (props.name) {
            props.onJoin(props.name);
            setIsEditing(false);
        }
    };

    return (
        <div class="p-4">
            <h1 class="text-xl font-bold mb-2">Room: {props.roomId}</h1>
            <Show when={props.playerId}>
                <p class="text-sm text-gray-500 mb-4">ID: {props.playerId}</p>
            </Show>

            <div class="space-y-3">
                <div class="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Your name"
                        value={props.name}
                        onInput={(e) => props.setName(e.currentTarget.value)}
                        disabled={!isEditing()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && props.name) {
                                handleSaveName();
                            }
                        }}
                        class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded disabled:opacity-50"
                    />
                    <Show
                        when={props.isJoined}
                        fallback={
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    props.name && props.onJoin(props.name);
                                }}
                                disabled={!props.name}
                                class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                Join
                            </button>
                        }
                    >
                        <Show
                            when={isEditing()}
                            fallback={
                                <button
                                    onClick={handleRenameClick}
                                    class="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
                                >
                                    Rename
                                </button>
                            }
                        >
                            <button
                                onClick={handleSaveName}
                                disabled={!props.name}
                                class="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                Save
                            </button>
                        </Show>
                    </Show>
                </div>
                <div class="flex gap-2">
                    <Show
                        when={!props.isJoined}
                        fallback={
                            <button
                                onClick={() => {
                                    props.onLeave();
                                    setIsEditing(true);
                                }}
                                class="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                            >
                                Leave
                            </button>
                        }
                    >
                        <button
                            onClick={props.onLeave}
                            class="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                    </Show>
                    <Show when={props.isHost}>
                        <button
                            onClick={props.onStart}
                            disabled={props.players.length < 2}
                            class="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            Start
                        </button>
                    </Show>
                </div>

                <div class="border-t border-gray-700 pt-3 mt-4">
                    <h2 class="font-semibold mb-2">
                        Players ({props.players.length})
                    </h2>
                    <Show when={props.isHost}>
                        <span class="text-yellow-500 text-sm">Host</span>
                    </Show>
                    <ul class="space-y-1 mt-2">
                        <For each={props.players}>
                            {(p) => (
                                <li class="flex items-center gap-2">
                                    <span class="w-6 h-6 flex items-center justify-center bg-gray-700 rounded text-xs">
                                        {p.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span>
                                        {p.name}
                                        {p.id === props.playerId && (
                                            <span class="text-gray-500 text-sm">
                                                {" "}
                                                (You)
                                            </span>
                                        )}
                                    </span>
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            </div>
        </div>
    );
};
