import { For, Show } from "solid-js";
import { AnimatedNumber, PlayerAvatar } from "~/components/casino";
import type { CheeseThiefPlayerInfo } from "~/game/cheese-thief/views";
import type { VoteResult } from "~/game/cheese-thief/types";

type ResultProps = {
    players: readonly CheeseThiefPlayerInfo[];
    result: VoteResult;
    display?: boolean;
};

export function CheeseThiefOutcome(props: ResultProps) {
    const thiefName = () =>
        props.players.find((player) => player.id === props.result.thiefId)
            ?.name ?? "The thief";
    const followers = () =>
        props.players
            .filter((player) => props.result.followerIds.includes(player.id))
            .map((player) => player.name);
    return (
        <div
            class={`border-2 border-ink shadow-ink p-5 text-cream ${props.result.thiefCaught ? "bg-teal" : "bg-tomato"}`}
        >
            <p class="font-bebas tracking-wider text-sm mb-1">The reveal</p>
            <h2
                class={`font-bebas leading-tight ${props.display ? "text-5xl lg:text-6xl" : "text-3xl"}`}
            >
                {props.result.thiefCaught
                    ? "Sleepyheads win"
                    : "The thief escapes"}
            </h2>
            <p
                class={
                    props.display
                        ? "text-2xl mt-2 break-words"
                        : "mt-2 break-words"
                }
            >
                {thiefName()}{" "}
                {props.result.thiefCaught
                    ? "was caught with the cheese."
                    : "got away with the cheese."}
            </p>
            <Show when={followers().length}>
                <p
                    class={`mt-2 break-words ${props.display ? "text-xl" : "text-sm"}`}
                >
                    Followers: {followers().join(", ")}
                </p>
            </Show>
            <Show when={props.result.mostVotedIds.length > 1}>
                <p class={`mt-2 ${props.display ? "text-xl" : "text-sm"}`}>
                    A tie for most votes. The thief is caught if they are in the
                    tie.
                </p>
            </Show>
        </div>
    );
}

export function CheeseThiefResults(props: ResultProps) {
    const players = () =>
        [...props.players].sort(
            (a, b) =>
                (props.result.voteCounts[b.id] ?? 0) -
                (props.result.voteCounts[a.id] ?? 0),
        );
    const voters = (id: string) =>
        props.players
            .filter((player) => props.result.votes[player.id] === id)
            .map((player) => player.name)
            .join(", ");
    return (
        <div class="space-y-5">
            <CheeseThiefOutcome
                players={props.players}
                result={props.result}
                display={props.display}
            />
            <ul
                class={`grid gap-3 ${props.display ? "md:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}
            >
                <For each={players()} keyed={false}>
                    {(player) => (
                        <li
                            data-testid="cheese-thief-result-player"
                            class={`border-2 border-ink p-4 shadow-ink-sm min-w-0 ${props.result.mostVotedIds.includes(player().id) ? "bg-sun/20" : "bg-cream"}`}
                        >
                            <div class="flex items-center gap-3">
                                <PlayerAvatar
                                    id={player().id}
                                    name={player().name}
                                    class="size-10 text-xl"
                                />
                                <div class="min-w-0 flex-1">
                                    <p
                                        class={`font-bold break-words ${props.display ? "text-xl" : "text-base"}`}
                                    >
                                        {player().name}
                                    </p>
                                    <p
                                        class={`font-bebas tracking-wider ${player().id === props.result.thiefId ? "text-tomato" : "text-navy"}`}
                                    >
                                        {player().id === props.result.thiefId
                                            ? "Thief"
                                            : props.result.followerIds.includes(
                                                    player().id,
                                                )
                                              ? "Follower"
                                              : "Sleepyhead"}
                                    </p>
                                </div>
                            </div>
                            <div class="flex items-baseline justify-between gap-2 mt-3">
                                <p class="font-bebas text-2xl">
                                    {props.result.voteCounts[player().id] ?? 0}{" "}
                                    {props.result.voteCounts[player().id] === 1
                                        ? "vote"
                                        : "votes"}
                                </p>
                                <p class="text-sm text-muted">
                                    <AnimatedNumber value={player().score} />{" "}
                                    {player().score === 1 ? "pt" : "pts"}
                                </p>
                            </div>
                            <p
                                class={`mt-1 text-muted break-words ${props.display ? "text-base" : "text-sm"}`}
                            >
                                {voters(player().id)
                                    ? `Voted by ${voters(player().id)}`
                                    : "No votes"}
                            </p>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    );
}
