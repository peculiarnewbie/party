import type { Component } from "solid-js";
import { For } from "solid-js";
import type { PokerEvent } from "~/game/poker";

export const EventLog: Component<{
    events: PokerEvent[];
}> = (props) => {
    return (
        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-4">
            <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#7a7060] mb-3">
                TABLE LOG
            </div>
            <div class="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                <For each={[...props.events].reverse()}>
                    {(event) => (
                        <div class="border-b border-[#b8ae9e] pb-2 last:border-b-0 last:pb-0">
                            <div class="font-bebas text-[.6rem] tracking-[.18em] text-[#c0261a]">
                                {event.type.replaceAll("_", " ").toUpperCase()}
                            </div>
                            <div class="font-karla text-[.88rem] text-[#1a1a1a]">
                                {event.message}
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};
