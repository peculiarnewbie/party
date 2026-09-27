import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { PokerEvent } from "~/game/poker";

const EVENT_COLORS: Record<string, string> = {
    hand_started: "#1a3a6e",
    blinds_posted: "#9a9080",
    player_action: "#5a5040",
    board_dealt: "#1a3a6e",
    showdown: "#c0261a",
    pot_awarded: "#0f766e",
    player_disconnected: "#c0261a",
    player_reconnected: "#0f766e",
    game_ended: "#c0261a",
    info: "#9a9080",
};

export const EventLog: Component<{
    events: PokerEvent[];
}> = (props) => {
    return (
        <div class="border-2 border-[#1a1a1a] bg-[#f7f2de] p-3 shadow-[4px_4px_0_#1a1a1a]">
            <div class="font-bebas text-xs tracking-[.22em] text-[#5a5040] mb-2">
                TABLE LOG
            </div>
            <div class="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                <For each={props.events}>
                    {(event, index) => (
                        <div
                            class={`border-b border-[#ddd5c4] pb-1 last:border-b-0 last:pb-0 ${
                                index() === 0 ? "bg-[#f5c542]/35 -mx-1.5 px-1.5 py-0.5 animate-rise-in" : ""
                            }`}
                        >
                            <div
                                class="font-bebas text-[.55rem] tracking-[.16em] leading-none"
                                style={{ color: EVENT_COLORS[event.type] ?? "#5a5040" }}
                            >
                                {event.type.replaceAll("_", " ").toUpperCase()}
                            </div>
                            <div class="font-karla text-[.8rem] text-[#1a1a1a] leading-tight">
                                {event.message}
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};
