import { For, Show } from "solid-js";
import type { AnswerGroupView } from "~/game/herd/views";

export function HerdAnswerGroups(props: {
    groups: readonly AnswerGroupView[];
    majorityGroupId?: string | null;
    pending?: boolean;
    selectedId?: string | null;
    display?: boolean;
    onCombine?: (groupId: string) => void;
    onSeparate?: (groupId: string, answer: string) => void;
}) {
    return (
        <ul
            class={
                props.display
                    ? `space-y-2 gap-3 columns-1 md:columns-2 ${props.groups.length > 12 ? "xl:columns-4" : "xl:columns-2"} ${props.groups.length > 32 ? "2xl:columns-5" : ""}`
                    : "space-y-2"
            }
        >
            <For each={props.groups} keyed={false}>
                {(group) => (
                    <li
                        data-testid={
                            props.display
                                ? "herd-display-answer-group"
                                : "herd-answer-group"
                        }
                        class={`break-inside-avoid border-2 shadow-ink-sm ${props.display && props.groups.length > 12 ? "p-2" : "p-2.5"} ${props.selectedId === group().id ? "border-tomato outline-2 outline-tomato" : "border-ink"} ${props.majorityGroupId === group().id ? "bg-teal text-cream" : "bg-cream text-ink"}`}
                    >
                        <Show
                            when={
                                group().answers.length > 1 ||
                                props.majorityGroupId === group().id
                            }
                        >
                            <div class="flex flex-wrap items-center justify-between gap-x-3 text-xs mb-1">
                                <Show when={group().answers.length > 1}>
                                    <span class="font-bold">
                                        Combined · {group().count} answers
                                    </span>
                                </Show>
                                <Show
                                    when={props.majorityGroupId === group().id}
                                >
                                    <span class="font-bebas tracking-wider">
                                        {props.pending
                                            ? "+1 pending"
                                            : "+1 point"}
                                    </span>
                                </Show>
                            </div>
                        </Show>
                        <For each={group().answers} keyed={false}>
                            {(answer) => (
                                <div class="flex items-center gap-2">
                                    <Show
                                        when={props.onCombine}
                                        fallback={
                                            <div
                                                class={`flex flex-1 min-w-0 items-baseline justify-between gap-3 font-bebas ${props.display ? (props.groups.length > 12 ? "text-2xl leading-tight" : "text-3xl leading-tight") : "text-xl"}`}
                                            >
                                                <span class="break-words min-w-0">
                                                    {answer().answer}
                                                </span>
                                                <span class="shrink-0">
                                                    ×{answer().count}
                                                </span>
                                            </div>
                                        }
                                    >
                                        <button
                                            type="button"
                                            aria-label={`${answer().answer}: ${answer().count} answers`}
                                            aria-pressed={
                                                props.selectedId === group().id
                                                    ? "true"
                                                    : "false"
                                            }
                                            onClick={() =>
                                                props.onCombine?.(group().id)
                                            }
                                            class="flex flex-1 min-w-0 items-baseline justify-between gap-3 text-left font-bebas text-xl leading-tight min-h-11 py-1 focus-visible:outline-2 focus-visible:outline-current"
                                        >
                                            <span class="break-words min-w-0">
                                                {answer().answer}
                                            </span>
                                            <span class="shrink-0">
                                                ×{answer().count}
                                            </span>
                                        </button>
                                    </Show>
                                    <Show
                                        when={
                                            props.onSeparate &&
                                            group().answers.length > 1
                                        }
                                    >
                                        <button
                                            type="button"
                                            aria-label={`Separate ${answer().answer}`}
                                            onClick={() =>
                                                props.onSeparate?.(
                                                    group().id,
                                                    answer().answer,
                                                )
                                            }
                                            class="text-xs underline underline-offset-2 min-h-11 px-1 shrink-0 focus-visible:outline-2 focus-visible:outline-current"
                                        >
                                            Separate
                                        </button>
                                    </Show>
                                </div>
                            )}
                        </For>
                        <p
                            class={`${props.display ? (props.groups.length > 12 ? "text-sm" : "text-base") : "text-xs"} truncate opacity-80 mt-1`}
                            title={group().playerNames.join(", ")}
                        >
                            {group().playerNames.join(", ")}
                        </p>
                    </li>
                )}
            </For>
        </ul>
    );
}
