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
        <div class="min-h-screen grid grid-cols-[2fr_1fr] bg-[#ddd5c4] font-karla overflow-hidden max-sm:grid-cols-1">
            {/* ── Left: content ── */}
            <div class="pt-12 pr-10 pb-20 pl-12 flex flex-col justify-center min-h-screen relative z-[1] max-sm:px-6 max-sm:py-10">
                <div class="inline-block self-start font-bebas text-[.95rem] tracking-[.18em] bg-[#c0261a] text-[#ddd5c4] px-4 py-1 mb-4">
                    Room Lobby
                </div>

                <div class="mb-1">
                    <div class="font-bebas text-[.7rem] tracking-[.28em] text-[#9a9080] mb-[-4px]">
                        ROOM CODE
                    </div>
                    <h1 class="font-bebas text-[clamp(3rem,5vw,5.5rem)] text-[#1a1a1a] leading-[.9] tracking-[.05em] m-0">
                        {props.roomId.toUpperCase()}
                    </h1>
                </div>

                <div class="h-[3px] bg-[#1a1a1a] mb-6" />

                {/* Name input */}
                <div class="flex gap-2 mb-6">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="YOUR NAME"
                        value={props.name}
                        onInput={(e) => props.setName(e.currentTarget.value)}
                        disabled={!isEditing()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && props.name) {
                                handleSaveName();
                            }
                        }}
                        class="flex-1 min-w-0 bg-[#c9c0b0] border-2 border-[#b8ae9e] px-4 py-[.85rem] font-bebas text-[1.25rem] tracking-[.1em] text-[#1a1a1a] outline-none transition-[border-color] duration-150 focus:border-[#1a1a1a] placeholder:text-[#9a9080] disabled:opacity-50"
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
                                class="font-bebas text-[1.1rem] tracking-[.1em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-3 cursor-pointer whitespace-nowrap shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#1a1a1a]"
                            >
                                Join →
                            </button>
                        }
                    >
                        <Show
                            when={isEditing()}
                            fallback={
                                <button
                                    onClick={handleRenameClick}
                                    class="font-bebas text-[1.1rem] tracking-[.1em] bg-[#c9c0b0] text-[#1a1a1a] border-2 border-[#b8ae9e] px-6 py-3 cursor-pointer whitespace-nowrap shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                                >
                                    Rename
                                </button>
                            }
                        >
                            <button
                                onClick={handleSaveName}
                                disabled={!props.name}
                                class="font-bebas text-[1.1rem] tracking-[.1em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-3 cursor-pointer whitespace-nowrap shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#1a1a1a]"
                            >
                                Save
                            </button>
                        </Show>
                    </Show>
                </div>

                {/* Players */}
                <div class="mb-8">
                    <div class="flex items-baseline gap-3 mb-3">
                        <span class="font-bebas text-[.7rem] tracking-[.28em] text-[#9a9080]">
                            PLAYERS ({props.players.length})
                        </span>
                        <Show when={props.isHost}>
                            <span class="font-bebas text-[.7rem] tracking-[.18em] text-[#c0261a]">
                                YOU ARE HOST
                            </span>
                        </Show>
                    </div>
                    <div>
                        <For each={props.players}>
                            {(p) => (
                                <div class="flex items-center gap-3 py-[.6rem] border-b border-[#b8ae9e] last:border-b-0">
                                    <span
                                        class={`w-8 h-8 flex-shrink-0 flex items-center justify-center font-bebas text-[1rem] ${
                                            p.id === props.playerId
                                                ? "bg-[#1a3a6e] text-[#ddd5c4]"
                                                : "bg-[#c9c0b0] text-[#1a1a1a]"
                                        }`}
                                    >
                                        {p.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span class="font-karla text-[#1a1a1a] flex-1">
                                        {p.name}
                                    </span>
                                    <Show when={p.id === props.playerId}>
                                        <span class="font-bebas text-[.7rem] tracking-[.15em] text-[#9a9080]">
                                            YOU
                                        </span>
                                    </Show>
                                </div>
                            )}
                        </For>
                        <Show when={props.players.length === 0}>
                            <div class="py-4 font-bebas text-[.85rem] tracking-[.12em] text-[#b8ae9e]">
                                CONNECTING...
                            </div>
                        </Show>
                    </div>
                </div>

                {/* Actions */}
                <div class="flex gap-3 flex-wrap">
                    <Show
                        when={!props.isJoined}
                        fallback={
                            <button
                                onClick={() => {
                                    props.onLeave();
                                    setIsEditing(true);
                                }}
                                class="font-bebas text-[1.1rem] tracking-[.1em] bg-[#c9c0b0] text-[#5a5040] border-2 border-[#b8ae9e] px-6 py-3 cursor-pointer transition-all duration-[120ms] hover:bg-[#bfb5a4] hover:border-[#5a5040] hover:text-[#1a1a1a]"
                            >
                                Leave
                            </button>
                        }
                    >
                        <button
                            onClick={props.onLeave}
                            class="font-bebas text-[1.1rem] tracking-[.1em] bg-[#c9c0b0] text-[#5a5040] border-2 border-[#b8ae9e] px-6 py-3 cursor-pointer transition-all duration-[120ms] hover:bg-[#bfb5a4] hover:border-[#5a5040] hover:text-[#1a1a1a]"
                        >
                            Cancel
                        </button>
                    </Show>
                    <Show when={props.isHost}>
                        <button
                            onClick={props.onStart}
                            disabled={props.players.length < 2}
                            class="flex-1 font-bebas text-[1.25rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-[.85rem] cursor-pointer shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#9a9080]"
                        >
                            + Start Game
                        </button>
                    </Show>
                </div>

                <Show when={props.isHost && props.players.length < 2}>
                    <div class="mt-3 font-bebas text-[.75rem] tracking-[.18em] text-[#b8ae9e]">
                        NEED AT LEAST 2 PLAYERS TO START
                    </div>
                </Show>
            </div>

            {/* ── Right: navy slab ── */}
            <div
                class="bg-[#1a3a6e] relative overflow-hidden max-sm:hidden"
                style={{ "clip-path": "polygon(22% 0, 100% 0, 100% 100%, 0% 100%)" }}
            >
                {/* Concentric rings */}
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "320px", height: "320px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "200px", height: "200px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "80px", height: "80px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />

                {/* Room code invite */}
                <div
                    class="absolute top-[13%] left-1/2 text-center"
                    style={{ transform: "translateX(-50%)", animation: "bob1 4s ease-in-out infinite" }}
                >
                    <div class="font-bebas text-[.6rem] tracking-[.25em] text-[#ddd5c4] opacity-45 mb-1">
                        SHARE THIS CODE
                    </div>
                    <div class="font-bebas text-[2.4rem] tracking-[.1em] text-[#ddd5c4] leading-none">
                        {props.roomId.toUpperCase()}
                    </div>
                </div>

                {/* Player count badge */}
                <div
                    class="absolute top-[44%] left-1/2"
                    style={{ transform: "translateX(-50%)", animation: "bob2 5.5s ease-in-out 1s infinite" }}
                >
                    <div class="bg-[#c0261a] px-5 py-2 font-bebas text-[1.6rem] tracking-[.06em] text-[#ddd5c4] shadow-[4px_4px_0_rgba(0,0,0,.35)] whitespace-nowrap">
                        {props.players.length}{" "}
                        <span class="text-[#ddd5c4] opacity-70 text-[1rem]">
                            {props.players.length === 1 ? "PLAYER" : "PLAYERS"}
                        </span>
                    </div>
                </div>

                {/* Token accents */}
                <div
                    style={{ position: "absolute", bottom: "20%", left: "22%", opacity: ".3", animation: "bob3 5s ease-in-out .5s infinite" }}
                >
                    <svg width="42" height="42" viewBox="0 0 36 36" fill="none">
                        <circle cx="18" cy="18" r="16" fill="#ddd5c4" />
                        <circle cx="18" cy="18" r="11" fill="none" stroke="white" stroke-width="1.5" stroke-opacity=".3" />
                        <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
                    </svg>
                </div>
                <div
                    style={{ position: "absolute", top: "68%", right: "10%", opacity: ".22", animation: "bob1 6s ease-in-out 2s infinite" }}
                >
                    <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
                        <circle cx="18" cy="18" r="16" fill="#c0261a" />
                        <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
                    </svg>
                </div>
                <div
                    style={{ position: "absolute", top: "28%", right: "14%", opacity: ".18", animation: "bob2 7s ease-in-out .8s infinite" }}
                >
                    <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
                        <circle cx="18" cy="18" r="16" fill="#ddd5c4" />
                        <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
