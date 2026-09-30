import { Show } from "solid-js";
import { CheeseThiefResults } from "./cheese-thief-results";
import type { CheeseThiefTableView } from "~/game/cheese-thief/table-view";

export function CheeseThiefTableDisplay(props: { view: CheeseThiefTableView }) {
    const phase = () =>
        ({
            night: "Night",
            day: "Discussion",
            voting: "Voting",
            reveal: "Results",
        })[props.view.phase];
    const prompt = () =>
        ({
            night: "Check your secret role",
            day: "Who stole the cheese?",
            voting: "Vote on your phone",
            reveal: "Round over",
        })[props.view.phase];
    const instruction = () =>
        ({
            night: "Read your role and clue on your phone. Keep them to yourself.",
            day: "Share what you saw, ask questions, and find the thief.",
            voting: "Choose who you think stole the cheese. Votes stay hidden until the reveal.",
            reveal: "The host can start another round from their phone.",
        })[props.view.phase];
    return (
        <section
            data-testid="cheese-thief-table-display"
            class="mx-auto max-w-[1600px] p-5 lg:p-8 font-karla text-ink"
        >
            <header class="flex flex-wrap items-center justify-between gap-4 mb-6 font-bebas tracking-wider">
                <h1 class="border-2 border-ink bg-sun px-4 py-2 text-4xl shadow-ink">
                    Cheese Thief
                </h1>
                <p class="text-2xl">
                    Round {props.view.round} · {phase()}
                </p>
            </header>
            <Show
                when={props.view.result}
                fallback={
                    <div class="border-2 border-ink bg-cream p-8 lg:p-12 shadow-ink">
                        <h2 class="font-bebas text-5xl lg:text-6xl leading-tight">
                            {prompt()}
                        </h2>
                        <p class="mt-4 text-2xl text-navy">{instruction()}</p>
                        <Show when={props.view.phase === "voting"}>
                            <p
                                data-testid="display-vote-count"
                                class="mt-8 font-bebas text-4xl"
                            >
                                {props.view.votedCount} /{" "}
                                {props.view.totalVoters} voted
                            </p>
                        </Show>
                        <p class="mt-8 text-lg text-muted">
                            Roles and clues stay on phones. The results appear
                            here at the end.
                        </p>
                    </div>
                }
            >
                {(result) => (
                    <CheeseThiefResults
                        players={props.view.players}
                        result={result()}
                        display
                    />
                )}
            </Show>
        </section>
    );
}
