import { TableCard } from "~/components/casino";
import { Show } from "solid-js";
import { RANK_LABEL } from "~/assets/card-deck/types";
import type { GoFishTableView } from "~/game/go-fish/table-view";

export function FishArt(props: { class?: string }) {
    return (
        <svg
            aria-hidden="true"
            class={props.class ?? "h-16 w-20"}
            viewBox="0 0 100 70"
        >
            <path
                d="M66 35L92 13v44ZM9 35Q37 0 73 35Q37 70 9 35Z"
                fill="#f5c542"
                stroke="#1a1a1a"
                stroke-width="3"
                stroke-linejoin="round"
            />
            <path
                d="M45 12l10-9 8 21M45 58l12 9 4-20"
                fill="#e07a2e"
                stroke="#1a1a1a"
                stroke-width="3"
            />
            <path
                d="M30 17q-9 18 0 36"
                fill="none"
                stroke="#1a1a1a"
                stroke-width="2"
            />
            <circle cx="21" cy="31" r="3" fill="#1a1a1a" />
            <path
                d="M5 61q8-8 16 0t16 0t16 0t16 0t16 0t16 0"
                fill="none"
                stroke="#8fb3d9"
                stroke-width="3"
            />
        </svg>
    );
}

export function GoFishStatus(props: { view: GoFishTableView }) {
    const name = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const request = () =>
        props.view.lastAction?.type === "ask" ? props.view.lastAction : null;
    const result = () => props.view.lastResult;
    const transferred = () => {
        const current = result();
        return current?.type === "cards_given" ? current : null;
    };
    const drawn = () => {
        const current = result();
        return current?.type === "go_fish" ? current : null;
    };
    return (
        <section
            data-testid="go-fish-status"
            class="table-mat flex flex-wrap items-center justify-center gap-3 border-3 border-ink bg-navy p-3 text-cream shadow-ink"
        >
            <Show
                when={request()}
                fallback={
                    <>
                        <FishArt />
                        <Show when={drawn()}>
                            <TableCard
                                card={null}
                                class="w-10"
                                animate={false}
                            />
                        </Show>
                        <span class="font-bebas text-2xl">
                            {drawn()
                                ? name(drawn()!.playerId)
                                : `${name(props.view.currentPlayerId)}'s turn`}
                        </span>
                    </>
                }
            >
                {(ask) => (
                    <>
                        <div class="min-w-0 max-w-[32%] truncate text-center font-bebas text-xl">
                            {name(ask().askerId)}
                        </div>
                        <svg
                            aria-hidden="true"
                            class="h-6 w-6 shrink-0"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M2 12h18m-7-7 7 7-7 7"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="3"
                            />
                        </svg>
                        <div
                            aria-label={`Asked for ${RANK_LABEL[ask().rank]}s`}
                            class="flex h-16 w-12 shrink-0 items-center justify-center rounded-sm border-2 border-ink bg-cream font-bebas text-4xl text-ink shadow-ink-sm"
                        >
                            {RANK_LABEL[ask().rank]}
                        </div>
                        <div class="min-w-0 max-w-[32%] truncate text-center font-bebas text-xl">
                            {name(ask().targetId)}
                        </div>
                    </>
                )}
            </Show>
            <Show when={props.view.turnPhase === "go_fish"}>
                <FishArt class="h-12 w-16" />
                <span class="font-bebas text-xl text-sun">GO FISH!</span>
            </Show>
            <Show when={transferred()}>
                {(transfer) => (
                    <span class="border-2 border-ink bg-sun px-3 py-1 font-bebas text-2xl text-ink">
                        +{transfer().count}{" "}
                        {transfer().count === 1 ? "CARD" : "CARDS"}
                    </span>
                )}
            </Show>
            <Show
                when={
                    result()?.type === "go_fish" &&
                    props.view.turnPhase !== "go_fish"
                }
            >
                <span class="font-bebas text-lg">
                    {drawn()?.drewAskedRank ? "MATCH · GO AGAIN" : "CARD DRAWN"}
                </span>
            </Show>
        </section>
    );
}
