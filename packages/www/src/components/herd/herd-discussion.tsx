import { createSignal, Show } from "solid-js";
import { TableButton } from "~/components/casino";
import { HerdAnswerGroups } from "./herd-answer-groups";
import type { HerdPlayerView } from "~/game/herd/views";

export function HerdDiscussion(props: {
    view: HerdPlayerView;
    compact: boolean;
    onCombine: (groupId1: string, groupId2: string) => void;
    onSeparate: (groupId: string, answer: string) => void;
    onNextRound: () => void;
}) {
    const [selectedId, setSelectedId] = createSignal<string | null>(null);
    const [search, setSearch] = createSignal("");
    const selected = () =>
        props.view.answerGroups.find((group) => group.id === selectedId());
    const chooseGroup = (groupId: string) => {
        if (selectedId() === groupId) {
            setSelectedId(null);
        } else if (selected()) {
            props.onCombine(selectedId()!, groupId);
            setSelectedId(null);
        } else {
            setSelectedId(groupId);
        }
    };
    const groups = () => {
        const query = search().trim().toLowerCase();
        return props.view.answerGroups.filter(
            (group) =>
                group.answers.some((answer) =>
                    answer.answer.toLowerCase().includes(query),
                ) ||
                group.playerNames.some((name) =>
                    name.toLowerCase().includes(query),
                ),
        );
    };

    return (
        <div class={props.view.isHost ? "pb-24" : ""}>
            <div class="border-2 border-ink bg-navy text-cream p-3 shadow-ink-sm mb-3">
                <h2 class="font-bebas text-xl leading-tight">
                    {props.view.currentQuestion}
                </h2>
            </div>
            <p role="status" class="text-sm text-muted mb-3">
                <Show
                    when={props.view.isHost}
                    fallback="Discuss the answers. Points are provisional until the next round."
                >
                    <Show
                        when={selected()}
                        fallback="Tap an answer, then another to combine. Points are provisional."
                    >
                        {(group) => (
                            <>
                                Combine “
                                {group()
                                    .answers.map((answer) => answer.answer)
                                    .join(" + ")}
                                ” with another answer. Tap it again to cancel.
                            </>
                        )}
                    </Show>
                </Show>
            </p>
            <Show
                when={props.view.isHost && props.view.answerGroups.length > 8}
            >
                <input
                    type="search"
                    aria-label="Search answers"
                    placeholder="Find an answer or player…"
                    value={search()}
                    onInput={(event) => setSearch(event.currentTarget.value)}
                    class="w-full min-w-0 mb-3 border-2 border-ink bg-cream px-3 py-2 font-karla focus:outline-2 focus:outline-navy"
                />
            </Show>
            <HerdAnswerGroups
                groups={groups()}
                majorityGroupId={props.view.previewRoundResult?.majorityGroupId}
                pending
                selectedId={selectedId()}
                onCombine={props.view.isHost ? chooseGroup : undefined}
                onSeparate={
                    props.view.isHost
                        ? (groupId, answer) => {
                              setSelectedId(null);
                              props.onSeparate(groupId, answer);
                          }
                        : undefined
                }
            />
            <Show when={groups().length === 0}>
                <p class="p-3 text-muted">
                    {props.view.answerGroups.length
                        ? "No matching answers."
                        : "No answers this round."}
                </p>
            </Show>
            <Show when={props.view.isHost}>
                <div
                    class={`fixed bottom-0 inset-x-0 z-20 mx-auto border-t-2 border-ink bg-paper px-4 py-3 ${props.compact ? "max-w-lg" : "max-w-3xl"}`}
                >
                    <div class="flex items-center justify-end gap-3">
                        <TableButton
                            onClick={props.onNextRound}
                            tone="navy"
                            size="compact"
                            class="px-5 min-h-11 shrink-0"
                        >
                            NEXT ROUND
                        </TableButton>
                    </div>
                </div>
            </Show>
        </div>
    );
}
