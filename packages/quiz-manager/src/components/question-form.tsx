import {
    createMemo,
    createSignal,
    For,
    onCleanup,
    untrack,
    Show,
} from "solid-js";
import { QuestionPreview, QUESTION_TYPES } from "~/components/question-preview";
import type { QuestionInput, MatchType } from "~/schemas";

type OptionInput = NonNullable<QuestionInput["options"]>[number];
type AcceptedAnswerInput = NonNullable<
    QuestionInput["acceptedAnswers"]
>[number];
export type QuestionFormData = Required<QuestionInput>;

interface Props {
    initial?: QuestionFormData;
    onSubmit: (data: QuestionFormData, addAnother: boolean) => void;
    onCancel?: () => void;
    onDirty?: (dirty: boolean) => void;
    saving: boolean;
    error: string | null;
    submitLabel: string;
    allowAddAnother?: boolean;
}

export function QuestionForm(props: Props) {
    const initial = untrack(() => props.initial);
    const [type, setType] = createSignal<QuestionFormData["type"]>(
        initial?.type ?? "multiple_choice",
    );
    const [text, setText] = createSignal(initial?.text ?? "");
    const [options, setOptions] = createSignal<readonly OptionInput[]>(
        initial?.options.length
            ? initial.options
            : [
                  { text: "", isCorrect: false },
                  { text: "", isCorrect: false },
              ],
    );
    const [answers, setAnswers] = createSignal<readonly AcceptedAnswerInput[]>(
        initial?.acceptedAnswers.length
            ? initial.acceptedAnswers
            : [{ pattern: "", matchType: "exact", caseInsensitive: true }],
    );
    const [validation, setValidation] = createSignal<string | null>(null);
    const [preview, setPreview] = createSignal(false);
    let dirty = false;
    let addAnother = false;
    const inputClass =
        "w-full min-w-0 border-2 border-line bg-card px-3 py-3 text-ink focus:border-navy outline-none";
    const actionClass =
        "min-h-11 whitespace-nowrap border-2 border-ink px-4 py-2 font-bebas tracking-wide shadow-ink-sm disabled:opacity-40";
    const draft = createMemo(
        (): QuestionFormData => ({
            type: type(),
            text: text(),
            options: options(),
            acceptedAnswers: answers(),
        }),
    );

    function changed() {
        dirty = true;
        props.onDirty?.(true);
        setValidation(null);
    }
    const beforeUnload = (event: BeforeUnloadEvent) => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    onCleanup(() => window.removeEventListener("beforeunload", beforeUnload));

    function updateOption<K extends keyof OptionInput>(
        index: number,
        field: K,
        value: OptionInput[K],
    ) {
        changed();
        setOptions((previous) =>
            previous.map((option, i) =>
                i === index ? { ...option, [field]: value } : option,
            ),
        );
    }
    function updateAnswer<K extends keyof AcceptedAnswerInput>(
        index: number,
        field: K,
        value: AcceptedAnswerInput[K],
    ) {
        changed();
        setAnswers((previous) =>
            previous.map((answer, i) =>
                i === index ? { ...answer, [field]: value } : answer,
            ),
        );
    }
    function handleSubmit(event: Event) {
        event.preventDefault();
        if (props.saving) return;
        const next = addAnother;
        addAnother = false;
        const cleanOptions = options().map((option) => ({
            ...option,
            text: option.text.trim(),
        }));
        const cleanAnswers = answers().map((answer) => ({
            ...answer,
            pattern: answer.matchType === "any" ? "*" : answer.pattern.trim(),
        }));
        if (!text().trim()) return setValidation("Write a question first.");
        if (type() === "multiple_choice") {
            if (
                cleanOptions.length < 2 ||
                cleanOptions.some((option) => !option.text)
            )
                return setValidation(
                    "Fill in at least two answers. Remove any unused options.",
                );
            if (!cleanOptions.some((option) => option.isCorrect))
                return setValidation("Mark at least one answer as correct.");
        }
        if (
            type() === "fill_in" &&
            cleanAnswers.some((answer) => !answer.pattern)
        )
            return setValidation(
                "Enter each accepted answer, or choose Any answer.",
            );
        props.onSubmit(
            {
                type: type(),
                text: text().trim(),
                options: type() === "multiple_choice" ? cleanOptions : [],
                acceptedAnswers: type() === "fill_in" ? cleanAnswers : [],
            },
            next,
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            class="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)]"
        >
            <fieldset disabled={props.saving} class="min-w-0 space-y-5">
                <div>
                    <p class="mb-2 font-bebas text-sm tracking-widest text-muted">
                        Question type
                    </p>
                    <div
                        class="grid grid-cols-2 gap-2"
                        role="group"
                        aria-label="Question type"
                    >
                        <For each={QUESTION_TYPES}>
                            {(entry) => (
                                <button
                                    type="button"
                                    aria-pressed={
                                        type() === entry.value
                                            ? "true"
                                            : "false"
                                    }
                                    onClick={() => {
                                        changed();
                                        setType(entry.value);
                                    }}
                                    class={`min-h-16 border-2 border-ink px-3 py-2 text-left ${type() === entry.value ? "bg-navy text-cream shadow-ink-sm" : "bg-card text-ink"}`}
                                >
                                    <span class="block font-bebas text-lg leading-tight">
                                        {entry.label}
                                    </span>
                                    <span class="block text-xs opacity-80">
                                        {entry.hint}
                                    </span>
                                </button>
                            )}
                        </For>
                    </div>
                </div>
                <div>
                    <label
                        for="question-text"
                        class="mb-2 block font-bebas text-sm tracking-widest text-muted"
                    >
                        {type() === "placeholder"
                            ? "Section title"
                            : "Question"}
                    </label>
                    <textarea
                        id="question-text"
                        value={text()}
                        onInput={(event) => {
                            changed();
                            setText(event.currentTarget.value);
                        }}
                        placeholder="Enter the question..."
                        required
                        maxlength={1000}
                        rows={3}
                        class={`${inputClass} resize-y`}
                    />
                </div>
                <Show when={type() === "multiple_choice"}>
                    <div class="space-y-3">
                        <p class="font-bebas text-sm tracking-widest text-muted">
                            Answers · mark the correct ones
                        </p>
                        <For each={options()} keyed={false}>
                            {(option, index) => (
                                <div
                                    class={`flex min-w-0 items-start gap-2 border-2 p-2 ${option().isCorrect ? "border-teal bg-teal/10" : "border-line bg-card"}`}
                                >
                                    <label
                                        class={`relative flex h-12 w-11 shrink-0 cursor-pointer items-center justify-center border-2 font-bebas text-xl ${option().isCorrect ? "border-ink bg-teal text-cream" : "border-line bg-cream"}`}
                                    >
                                        <input
                                            type="checkbox"
                                            aria-label={`Mark answer ${String.fromCharCode(65 + index)} correct`}
                                            checked={option().isCorrect}
                                            onChange={(event) =>
                                                updateOption(
                                                    index,
                                                    "isCorrect",
                                                    event.currentTarget.checked,
                                                )
                                            }
                                            class="absolute inset-0 h-full w-full cursor-pointer opacity-0 peer"
                                        />
                                        <span class="pointer-events-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4">
                                            {String.fromCharCode(65 + index)}
                                        </span>
                                    </label>
                                    <input
                                        aria-label={`Answer ${String.fromCharCode(65 + index)}`}
                                        value={option().text}
                                        onInput={(event) =>
                                            updateOption(
                                                index,
                                                "text",
                                                event.currentTarget.value,
                                            )
                                        }
                                        placeholder={`Answer ${String.fromCharCode(65 + index)}`}
                                        maxlength={500}
                                        class={`${inputClass} flex-1`}
                                    />
                                    <button
                                        type="button"
                                        aria-label={`Remove answer ${String.fromCharCode(65 + index)}`}
                                        disabled={options().length <= 2}
                                        onClick={() => {
                                            changed();
                                            setOptions((previous) =>
                                                previous.filter(
                                                    (_, i) => i !== index,
                                                ),
                                            );
                                        }}
                                        class="flex h-12 w-9 shrink-0 items-center justify-center text-tomato disabled:opacity-25"
                                    >
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 24 24"
                                            class="h-5 w-5"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="2"
                                        >
                                            <path d="M6 6l12 12M18 6L6 18" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </For>
                        <button
                            type="button"
                            disabled={options().length >= 12}
                            onClick={() => {
                                changed();
                                setOptions((previous) => [
                                    ...previous,
                                    { text: "", isCorrect: false },
                                ]);
                            }}
                            class={`${actionClass} bg-card text-navy`}
                        >
                            + Add answer
                        </button>
                    </div>
                </Show>
                <Show when={type() === "fill_in"}>
                    <div class="space-y-3">
                        <p class="font-bebas text-sm tracking-widest text-muted">
                            Accepted answers
                        </p>
                        <For each={answers()} keyed={false}>
                            {(answer, index) => (
                                <div class="space-y-3 border-2 border-line bg-card p-3">
                                    <Show when={answer().matchType !== "any"}>
                                        <input
                                            aria-label={`Accepted answer ${index + 1}`}
                                            value={answer().pattern}
                                            onInput={(event) =>
                                                updateAnswer(
                                                    index,
                                                    "pattern",
                                                    event.currentTarget.value,
                                                )
                                            }
                                            placeholder="e.g. Jupiter"
                                            maxlength={500}
                                            class={inputClass}
                                        />
                                    </Show>
                                    <div class="flex flex-wrap gap-2">
                                        <select
                                            aria-label={`Matching rule ${index + 1}`}
                                            value={answer().matchType}
                                            onChange={(event) =>
                                                updateAnswer(
                                                    index,
                                                    "matchType",
                                                    event.currentTarget
                                                        .value as MatchType,
                                                )
                                            }
                                            class="min-h-11 min-w-0 flex-1 border-2 border-line bg-cream px-2"
                                        >
                                            <option value="exact">
                                                Exact answer
                                            </option>
                                            <option value="contains">
                                                Contains these words
                                            </option>
                                            <option value="any">
                                                Any answer
                                            </option>
                                        </select>
                                        <button
                                            type="button"
                                            aria-label={`Remove accepted answer ${index + 1}`}
                                            disabled={answers().length <= 1}
                                            onClick={() => {
                                                changed();
                                                setAnswers((previous) =>
                                                    previous.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                );
                                            }}
                                            class="min-h-11 px-2 font-bebas text-tomato disabled:opacity-30"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    <Show when={answer().matchType !== "any"}>
                                        <label class="flex min-h-11 items-center gap-2 text-sm text-muted">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    answer().caseInsensitive
                                                }
                                                onChange={(event) =>
                                                    updateAnswer(
                                                        index,
                                                        "caseInsensitive",
                                                        event.currentTarget
                                                            .checked,
                                                    )
                                                }
                                                class="h-5 w-5 accent-teal"
                                            />
                                            Ignore capitalization
                                        </label>
                                    </Show>
                                </div>
                            )}
                        </For>
                        <button
                            type="button"
                            disabled={answers().length >= 50}
                            onClick={() => {
                                changed();
                                setAnswers((previous) => [
                                    ...previous,
                                    {
                                        pattern: "",
                                        matchType: "exact",
                                        caseInsensitive: true,
                                    },
                                ]);
                            }}
                            class={`${actionClass} bg-card text-navy`}
                        >
                            + Add accepted answer
                        </button>
                    </div>
                </Show>
                <button
                    type="button"
                    aria-expanded={preview() ? "true" : "false"}
                    onClick={() => setPreview(!preview())}
                    class="min-h-11 font-bebas text-navy underline underline-offset-4 lg:hidden"
                >
                    {preview() ? "Hide preview" : "Show preview"}
                </button>
                <Show when={validation() || props.error}>
                    <p
                        role="alert"
                        class="border-l-4 border-tomato bg-tomato/5 p-3 text-sm text-tomato"
                    >
                        {validation() || props.error}
                    </p>
                </Show>
                <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t-2 border-line bg-cream py-4 sm:flex sm:flex-wrap">
                    <button
                        type="submit"
                        onClick={() => {
                            addAnother = false;
                        }}
                        disabled={props.saving}
                        class={`${actionClass} col-span-2 bg-navy text-cream sm:flex-1`}
                    >
                        {props.saving ? "Saving…" : props.submitLabel}
                    </button>
                    <Show when={props.allowAddAnother}>
                        <button
                            type="submit"
                            onClick={() => {
                                addAnother = true;
                            }}
                            disabled={props.saving}
                            class={`${actionClass} min-w-0 bg-sun text-ink sm:flex-1`}
                        >
                            Save & add another
                        </button>
                    </Show>
                    <Show when={props.onCancel}>
                        <button
                            type="button"
                            onClick={props.onCancel}
                            class="min-h-11 justify-self-end px-2 font-bebas text-muted"
                        >
                            Cancel
                        </button>
                    </Show>
                </div>
            </fieldset>
            <div
                class={`${preview() ? "block" : "hidden lg:block"} min-w-0 lg:sticky lg:top-6`}
            >
                <QuestionPreview question={draft()} />
            </div>
        </form>
    );
}
