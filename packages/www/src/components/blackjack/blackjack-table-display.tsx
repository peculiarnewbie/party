import { Show } from "solid-js";
import { Confetti, PlayerAvatar } from "~/components/casino";
import { BlackjackFelt } from "./blackjack-felt";
import type { BlackjackTableView } from "~/game/blackjack/table-view";

export function BlackjackTableDisplay(props: { view: BlackjackTableView }) {
    const currentPlayer = () =>
        props.view.phase === "playing"
            ? props.view.players[props.view.currentPlayerIndex]
            : undefined;
    const status = () => {
        if (props.view.phase === "betting")
            return "Place your bets on your phones";
        if (props.view.phase === "insurance")
            return "Dealer shows an ace · insurance?";
        if (props.view.phase === "settled") {
            const winners =
                props.view.results?.filter((result) => result.netChips > 0) ??
                [];
            if (props.view.dealer.busted) return "Dealer busts!";
            return winners.length > 0
                ? `${winners.map((result) => result.playerName).join(" & ")} ${winners.length === 1 ? "wins" : "win"}`
                : "House wins this round";
        }
        if (props.view.phase === "dealer_turn") return "Dealer’s turn";
        return `${currentPlayer()?.name ?? "Player"}’s turn`;
    };
    const celebrate = () =>
        props.view.phase === "settled" &&
        (props.view.dealer.busted ||
            (props.view.results ?? []).some((result) =>
                result.hands.some((hand) => hand.outcome === "blackjack"),
            ));

    return (
        <section
            data-testid="blackjack-table-display"
            class="relative mx-auto w-full max-w-[1800px] px-6 pt-4 pb-6 flex flex-col items-center"
        >
            <div class="w-full flex items-center justify-between gap-4 mb-3 font-bebas tracking-wider">
                <h1 class="text-4xl bg-[#0f766e] text-[#f7f2de] border-2 border-[#1a1a1a] px-4 pt-1.5 pb-0.5 shadow-[4px_4px_0_#1a1a1a] -rotate-2">
                    Blackjack
                </h1>
                <p
                    role="status"
                    class="text-5xl text-[#1a1a1a] flex items-center gap-3"
                >
                    <Show when={currentPlayer()}>
                        {(player) => (
                            <PlayerAvatar
                                id={player().id}
                                name={player().name}
                                index={props.view.currentPlayerIndex}
                                class="w-12 h-12 text-2xl"
                            />
                        )}
                    </Show>
                    <Show when={status()} keyed>
                        {(text) => <span class="animate-rise-in">{text}</span>}
                    </Show>
                </p>
                <span class="text-2xl text-[#1a1a1a] border-2 border-[#1a1a1a] bg-[#f7f2de] px-4 pt-1.5 pb-0.5 shadow-[4px_4px_0_#1a1a1a]">
                    Round {props.view.roundNumber} ·{" "}
                    <span class="text-[#c0261a]">
                        {props.view.phase.replaceAll("_", " ")}
                    </span>
                </span>
            </div>
            <div class="w-full max-w-[calc((100vh-160px)*2.1)]">
                <BlackjackFelt
                    view={props.view}
                    seatTestIdPrefix="display-seat"
                    dealerTestId="blackjack-display-dealer"
                />
            </div>
            <Show when={celebrate() ? props.view.roundNumber : null} keyed>
                {(_round) => <Confetti count={80} />}
            </Show>
        </section>
    );
}
