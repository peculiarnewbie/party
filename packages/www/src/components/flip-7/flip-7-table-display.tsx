import { For, Show } from "solid-js";
import { PartyTableFrame } from "~/components/party-table-frame";
import { PlayerBoard } from "./player-board";
import type { Flip7TableView } from "~/game/flip-7/table-view";

export function Flip7TableDisplay(props: { view: Flip7TableView }) {
    const name = (id: string | null) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const status = () => {
        if (props.view.phase === "game_over")
            return props.view.endedByHost
                ? "Game ended by host"
                : `${props.view.winners?.map(name).join(" & ")} wins`;
        if (props.view.phase === "round_over")
            return "Round complete · waiting for the host";
        if (props.view.targetChoice)
            return `${name(props.view.targetChoice.chooserPlayerId)} chooses a target`;
        if (props.view.currentPlayerId)
            return `${name(props.view.currentPlayerId)}’s turn`;
        return "Dealing opening cards";
    };
    return (
        <PartyTableFrame
            game="flip-7"
            title="Flip 7"
            round={props.view.roundNumber}
            phase={props.view.phase}
            status={status()}
        >
            <p class="text-center text-xl mb-6">
                First to {props.view.targetScore} points · Dealer:{" "}
                {name(props.view.dealerId)} · {props.view.deckCount} cards left
            </p>
            <Show when={props.view.targetChoice}>
                {(choice) => (
                    <p class="text-center font-bebas text-3xl mb-6">
                        {choice().card.replaceAll("_", " ")}
                    </p>
                )}
            </Show>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
                <For each={props.view.players}>
                    {(player) => (
                        <div
                            data-testid={`display-seat-${player.id}`}
                            data-acting={String(
                                props.view.currentPlayerId === player.id,
                            )}
                        >
                            <PlayerBoard
                                large
                                player={player}
                                isCurrent={
                                    props.view.currentPlayerId === player.id
                                }
                                isWinner={
                                    props.view.winners?.includes(player.id) ??
                                    false
                                }
                            />
                        </div>
                    )}
                </For>
            </div>
        </PartyTableFrame>
    );
}
