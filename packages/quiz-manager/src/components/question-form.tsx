import { createSignal, For, Show } from "solid-js";

interface OptionInput {
    text: string;
    isCorrect: boolean;
}

interface AcceptedAnswerInput {
    pattern: string;
    matchType: "exact" | "contains" | "any";
    caseInsensitive: boolean;
}

export interface QuestionFormData {
    type: "multiple_choice" | "fill_in" | "open" | "placeholder";
    text: string;
    options: OptionInput[];
    acceptedAnswers: AcceptedAnswerInput[];
}

interface Props {
    initial?: QuestionFormData;
    onSubmit: (data: QuestionFormData) => void;
    saving: boolean;
    error: string | null;
    submitLabel: string;
}

const DEFAULT_FORM: QuestionFormData = {
    type: "open",
    text: "",
    options: [],
    acceptedAnswers: [],
};

export function QuestionForm(props: Props) {
    const [type, setType] = createSignal<QuestionFormData["type"]>(
        props.initial?.type ?? DEFAULT_FORM.type,
    );
    const [text, setText] = createSignal(props.initial?.text ?? "");
    const [options, setOptions] = createSignal<OptionInput[]>(
        props.initial?.options.length
            ? props.initial.options
            : [
                  { text: "", isCorrect: true },
                  { text: "", isCorrect: false },
              ],
    );
    const [answers, setAnswers] = createSignal<AcceptedAnswerInput[]>(
        props.initial?.acceptedAnswers.length
            ? props.initial.acceptedAnswers
            : [{ pattern: "", matchType: "exact", caseInsensitive: true }],
    );

    function addOption() {
        setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
    }

    function removeOption(index: number) {
        setOptions((prev) => prev.filter((_, i) => i !== index));
    }

    function updateOption(index: number, field: keyof OptionInput, value: any) {
        setOptions((prev) =>
            prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
        );
    }

    function addAnswer() {
        setAnswers((prev) => [
            ...prev,
            { pattern: "", matchType: "exact", caseInsensitive: true },
        ]);
    }

    function removeAnswer(index: number) {
        setAnswers((prev) => prev.filter((_, i) => i !== index));
    }

    function updateAnswer(
        index: number,
        field: keyof AcceptedAnswerInput,
        value: any,
    ) {
        setAnswers((prev) =>
            prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
        );
    }

    function handleSubmit(e: Event) {
        e.preventDefault();
        if (!text().trim()) return;

        props.onSubmit({
            type: type(),
            text: text().trim(),
            options:
                type() === "multiple_choice"
                    ? options().filter((o) => o.text.trim())
                    : [],
            acceptedAnswers:
                type() === "fill_in"
                    ? answers().filter((a) => a.pattern.trim() || a.matchType === "any")
                    : [],
        });
    }

    return (
        <form onSubmit={handleSubmit} class="space-y-6">
            {/* Type selector */}
            <div>
                <label class="block font-bebas text-sm tracking-widest text-[#5a5040] mb-2">
                    QUESTION TYPE
                </label>
                <div class="grid grid-cols-4 gap-2">
                    <For
                        each={
                            [
                                { value: "multiple_choice", label: "Multiple Choice" },
                                { value: "fill_in", label: "Fill In" },
                                { value: "open", label: "Open" },
                                { value: "placeholder", label: "Placeholder" },
                            ] as const
                        }
                    >
                        {(t) => (
                            <button
                                type="button"
                                onClick={() => setType(t.value)}
                                class={`font-bebas text-sm tracking-wider py-2.5 border-2 transition-all cursor-pointer ${
                                    type() === t.value
                                        ? "bg-[#1a3a6e] text-[#ddd5c4] border-[#1a3a6e]"
                                        : "bg-white text-[#5a5040] border-[#b8ae9e] hover:border-[#5a5040]"
                                }`}
                            >
                                {t.label}
                            </button>
                        )}
                    </For>
                </div>
            </div>

            {/* Question text */}
            <div>
                <label class="block font-bebas text-sm tracking-widest text-[#5a5040] mb-2">
                    QUESTION TEXT
                </label>
                <textarea
                    value={text()}
                    onInput={(e) => setText(e.currentTarget.value)}
                    placeholder="Enter the question..."
                    required
                    rows={3}
                    class="w-full px-4 py-3 bg-white border-2 border-[#b8ae9e] font-karla text-[#1a1a1a] focus:border-[#1a3a6e] outline-none transition-colors resize-y"
                />
            </div>

            {/* Multiple choice options */}
            <Show when={type() === "multiple_choice"}>
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="font-bebas text-sm tracking-widest text-[#5a5040]">
                            ANSWER OPTIONS
                        </label>
                        <button
                            type="button"
                            onClick={addOption}
                            class="font-bebas text-xs tracking-widest text-[#1a3a6e] hover:text-[#c0261a] transition-colors cursor-pointer"
                        >
                            + ADD OPTION
                        </button>
                    </div>
                    <div class="space-y-2">
                        <For each={options()}>
                            {(opt, i) => (
                                <div class="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={opt.isCorrect}
                                        onChange={(e) =>
                                            updateOption(i(), "isCorrect", e.currentTarget.checked)
                                        }
                                        class="w-4 h-4 accent-[#1a3a6e]"
                                    />
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onInput={(e) =>
                                            updateOption(i(), "text", e.currentTarget.value)
                                        }
                                        placeholder={`Option ${i() + 1}`}
                                        class="flex-1 px-3 py-2 bg-white border-2 border-[#b8ae9e] font-karla text-sm text-[#1a1a1a] focus:border-[#1a3a6e] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(i())}
                                        disabled={options().length <= 1}
                                        class="font-bebas text-xs tracking-widest text-[#c0261a] hover:text-[#8b1a10] disabled:opacity-30 transition-colors cursor-pointer"
                                    >
                                        REMOVE
                                    </button>
                                </div>
                            )}
                        </For>
                    </div>
                    <p class="text-xs text-[#9a9080] mt-2">Check the box to mark correct answers</p>
                </div>
            </Show>

            {/* Fill-in accepted answers */}
            <Show when={type() === "fill_in"}>
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="font-bebas text-sm tracking-widest text-[#5a5040]">
                            ACCEPTED ANSWERS
                        </label>
                        <button
                            type="button"
                            onClick={addAnswer}
                            class="font-bebas text-xs tracking-widest text-[#1a3a6e] hover:text-[#c0261a] transition-colors cursor-pointer"
                        >
                            + ADD ANSWER
                        </button>
                    </div>
                    <div class="space-y-3">
                        <For each={answers()}>
                            {(ans, i) => (
                                <div class="bg-[#f9f5ef] border border-[#e5dfd5] p-3 space-y-2">
                                    <div class="flex items-center gap-3">
                                        <Show when={ans.matchType !== "any"}>
                                            <input
                                                type="text"
                                                value={ans.pattern}
                                                onInput={(e) =>
                                                    updateAnswer(i(), "pattern", e.currentTarget.value)
                                                }
                                                placeholder="Answer pattern"
                                                class="flex-1 px-3 py-2 bg-white border-2 border-[#b8ae9e] font-karla text-sm text-[#1a1a1a] focus:border-[#1a3a6e] outline-none"
                                            />
                                        </Show>
                                        <select
                                            value={ans.matchType}
                                            onChange={(e) =>
                                                updateAnswer(
                                                    i(),
                                                    "matchType",
                                                    e.currentTarget.value as any,
                                                )
                                            }
                                            class="px-3 py-2 bg-white border-2 border-[#b8ae9e] font-karla text-sm text-[#1a1a1a] focus:border-[#1a3a6e] outline-none"
                                        >
                                            <option value="exact">Exact</option>
                                            <option value="contains">Contains</option>
                                            <option value="any">Any</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeAnswer(i())}
                                            disabled={answers().length <= 1}
                                            class="font-bebas text-xs tracking-widest text-[#c0261a] hover:text-[#8b1a10] disabled:opacity-30 transition-colors cursor-pointer"
                                        >
                                            REMOVE
                                        </button>
                                    </div>
                                    <label class="flex items-center gap-2 text-xs text-[#5a5040]">
                                        <input
                                            type="checkbox"
                                            checked={ans.caseInsensitive}
                                            onChange={(e) =>
                                                updateAnswer(
                                                    i(),
                                                    "caseInsensitive",
                                                    e.currentTarget.checked,
                                                )
                                            }
                                            class="w-3.5 h-3.5 accent-[#1a3a6e]"
                                        />
                                        Case insensitive
                                    </label>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </Show>

            <Show when={props.error}>
                <p class="text-[#c0261a] text-sm">{props.error}</p>
            </Show>

            <button
                type="submit"
                disabled={props.saving || !text().trim()}
                class="w-full font-bebas text-xl tracking-wide bg-[#1a3a6e] text-[#ddd5c4] py-3 border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] transition-all disabled:opacity-40 disabled:shadow-none disabled:transform-none cursor-pointer"
            >
                {props.saving ? "Saving..." : props.submitLabel}
            </button>
        </form>
    );
}
