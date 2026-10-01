import { createSignal, For, Show } from "solid-js";
import type { QuestionInput } from "~/schemas";

export const QUESTION_TYPES = [
    {
        value: "multiple_choice",
        label: "Multiple choice",
        hint: "Choose from answers",
    },
    { value: "fill_in", label: "Short answer", hint: "Type an answer" },
    { value: "open", label: "Open question", hint: "Discuss together" },
    { value: "placeholder", label: "Section break", hint: "Introduce a round" },
] as const;

export function QuestionPreview(props: { question: QuestionInput }) {
    const [showAnswers, setShowAnswers] = createSignal(false);
    return (
        <section
            aria-label="Question preview"
            class="border-2 border-ink bg-cream shadow-ink overflow-hidden"
        >
            <div class="flex min-h-12 items-center justify-between gap-2 border-b-2 border-ink bg-navy px-4 text-cream">
                <h3 class="font-bebas text-xl tracking-wide">Preview</h3>
                <Show
                    when={
                        props.question.type === "multiple_choice" ||
                        props.question.type === "fill_in"
                    }
                >
                    <button
                        type="button"
                        aria-pressed={showAnswers() ? "true" : "false"}
                        onClick={() => setShowAnswers(!showAnswers())}
                        class="min-h-11 text-xs underline underline-offset-4"
                    >
                        {showAnswers() ? "Hide answers" : "Show answers"}
                    </button>
                </Show>
            </div>
            <div class="space-y-5 p-4 sm:p-6">
                <p class="font-bebas text-xs tracking-widest text-muted">
                    {
                        QUESTION_TYPES.find(
                            (entry) => entry.value === props.question.type,
                        )?.label
                    }
                </p>
                <h4 class="break-words font-bebas text-3xl leading-tight">
                    {props.question.text.trim() || "Your question goes here"}
                </h4>
                <Show when={props.question.type === "multiple_choice"}>
                    <div class="grid gap-3">
                        <For each={props.question.options ?? []} keyed={false}>
                            {(option, index) => (
                                <div
                                    class={`flex min-h-14 items-center gap-3 border-2 border-ink p-3 shadow-ink-sm ${showAnswers() && option().isCorrect ? "bg-teal text-cream" : "bg-card text-ink"}`}
                                >
                                    <span class="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-current font-bebas text-xl">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span class="min-w-0 flex-1 break-words">
                                        {option().text.trim() ||
                                            `Answer ${String.fromCharCode(65 + index)}`}
                                    </span>
                                    <Show
                                        when={
                                            showAnswers() && option().isCorrect
                                        }
                                    >
                                        <span class="font-bebas text-sm">
                                            Correct
                                        </span>
                                    </Show>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>
                <Show when={props.question.type === "fill_in"}>
                    <div class="border-2 border-line bg-card px-4 py-3 text-muted">
                        Type your answer…
                    </div>
                    <Show when={showAnswers()}>
                        <div class="flex flex-wrap gap-2">
                            <For
                                each={props.question.acceptedAnswers ?? []}
                                keyed={false}
                            >
                                {(answer) => (
                                    <span class="max-w-full break-words border-2 border-ink bg-teal px-3 py-1 text-sm text-cream">
                                        {answer().matchType === "any"
                                            ? "Any non-empty answer"
                                            : answer().pattern ||
                                              "Accepted answer"}
                                    </span>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
                <Show when={props.question.type === "open"}>
                    <div class="border-t-2 border-line pt-4 text-sm text-muted">
                        Answer out loud together.
                    </div>
                </Show>
            </div>
        </section>
    );
}
