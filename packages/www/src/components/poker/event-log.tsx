import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { PokerEvent } from "~/game/poker";

const EVENT_COLORS: Record<string, string> = {
    hand_started: "#1a3a6e",
    blinds_posted: "#5a5040",
    player_action: "#1a1a1a",
    board_dealt: "#1a3a6e",
    showdown: "#c0261a",
    pot_awarded: "#1a3a6e",
    player_disconnected: "#c0261a",
    player_reconnected: "#1a3a6e",
    game_ended: "#c0261a",
    info: "#5a5040",
};

export const EventLog: Component<{
    events: PokerEvent[];
}> = (props) => {
    return (
        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-3">
            <div class="font-bebas text-[.6rem] tracking-[.22em] text-[#7a7060] mb-2">
                TABLE LOG
            </div>
            <div class="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                <For each={[...props.events].reverse()}>
                    {(event, index) => (
                        <div
                            class={`border-b border-[#b8ae9e] pb-1 last:border-b-0 last:pb-0 ${
                                index() === 0 ? "bg-[#ddd5c4]/60 -mx-1.5 px-1.5 py-0.5 rounded" : ""
                            }`}
                        >
                            <div
                                class="font-bebas text-[.55rem] tracking-[.16em] leading-none"
                                style={{ color: EVENT_COLORS[event.type] ?? "#1a1a1a" }}
                            >
                                {event.type.replaceAll("_", " ").toUpperCase()}
                            </div>
                            <div class="font-karla text-[.78rem] text-[#1a1a1a] leading-tight">
                                {event.message}
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};
