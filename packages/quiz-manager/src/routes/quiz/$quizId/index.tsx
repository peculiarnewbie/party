import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, Loading, refresh, For, Show, untrack } from "solid-js";
import { QuestionForm } from "~/components/question-form";
import { QUESTION_TYPES, QuestionPreview } from "~/components/question-preview";
import { callQuiz, createQuizQuery, createQuizActions } from "~/rpc/client";
import type { QuestionFormData } from "~/components/question-form";
import type { Question, QuizWithQuestions, TagWithCount } from "~/schemas";

export const Route = createFileRoute("/quiz/$quizId/")({
    component: QuizDetail,
});

function QuizDetail() {
    const params = Route.useParams();
    const quiz = createQuizQuery(() =>
        callQuiz((client) => client.getQuiz(params().quizId)),
    );
    const tags = createQuizQuery(() => callQuiz((client) => client.listTags()));
    return (
        <div class="min-h-screen bg-paper">
            <header class="flex min-h-20 items-center gap-5 border-b-2 border-ink bg-navy px-4 py-4 text-cream sm:px-8">
                <a
                    href="/"
                    class="flex min-h-11 items-center font-bebas tracking-wide"
                >
                    All quizzes
                </a>
                <span class="border-l border-cream/40 pl-5 font-bebas text-2xl">
                    Quiz editor
                </span>
            </header>
            <main class="mx-auto max-w-7xl px-3 py-6 sm:px-6">
                <Loading
                    fallback={
                        <p class="p-8 font-bebas text-xl">Loading quiz…</p>
                    }
                >
                    <Show when={quiz()} fallback={<p>Quiz not found.</p>}>
                        {(q) => (
                            <QuizEditor
                                quiz={q()}
                                tags={tags()}
                                onRefresh={() => refresh(quiz)}
                            />
                        )}
                    </Show>
                </Loading>
            </main>
        </div>
    );
}

type Editor = { question?: Question };

function QuizEditor(props: {
    quiz: QuizWithQuestions;
    tags: readonly TagWithCount[];
    onRefresh: () => void;
}) {
    const initialQuiz = untrack(() => props.quiz);
    const [editor, setEditor] = createSignal<Editor | null>(
        initialQuiz.questions.length ? null : {},
    );
    const [dirty, setDirty] = createSignal(false);
    const [notice, setNotice] = createSignal("");
    const [showQuestions, setShowQuestions] = createSignal(false);
    const [editingDetails, setEditingDetails] = createSignal(false);
    const [title, setTitle] = createSignal(initialQuiz.title);
    const [description, setDescription] = createSignal(
        initialQuiz.description ?? "",
    );
    const [previewQuestion, setPreviewQuestion] = createSignal<Question | null>(
        null,
    );
    const { pending: saving, error, run } = createQuizActions();
    const buttonClass =
        "min-h-11 border-2 border-ink px-4 py-2 font-bebas tracking-wide shadow-ink-sm disabled:opacity-40";
    const inputClass =
        "w-full min-w-0 border-2 border-line bg-card px-3 py-3 outline-none focus:border-navy";

    function selectEditor(next: Editor | null) {
        if (saving()) return;
        if (dirty() && !confirm("Discard your unsaved question changes?"))
            return;
        setDirty(false);
        setPreviewQuestion(null);
        setEditor(next);
        setShowQuestions(false);
    }
    function saveQuestion(data: QuestionFormData, addAnother: boolean) {
        const question = editor()?.question;
        const program = question
            ? callQuiz((client) =>
                  client.updateQuestion({ questionId: question.id, ...data }),
              )
            : callQuiz((client) =>
                  client.createQuestion({ quizId: props.quiz.id, ...data }),
              );
        run(program, () => {
            setDirty(false);
            setNotice("Question saved.");
            setEditor(addAnother ? {} : null);
            props.onRefresh();
        });
    }
    function moveQuestion(index: number, direction: -1 | 1) {
        const ids = props.quiz.questions.map((question) => question.id);
        const target = index + direction;
        if (target < 0 || target >= ids.length) return;
        [ids[index], ids[target]] = [ids[target], ids[index]];
        run(
            callQuiz((client) =>
                client.reorderQuestions({
                    quizId: props.quiz.id,
                    orderedIds: ids,
                }),
            ),
            () => {
                setNotice("Question order saved.");
                props.onRefresh();
            },
        );
    }
    function deleteQuestion(question: Question) {
        if (!confirm(`Delete “${question.text}”?`)) return;
        if (
            editor()?.question?.id === question.id &&
            dirty() &&
            !confirm("Discard your unsaved question changes?")
        )
            return;
        run(
            callQuiz((client) => client.deleteQuestion(question.id)),
            () => {
                if (editor()?.question?.id === question.id) {
                    setDirty(false);
                    setEditor(null);
                }
                if (previewQuestion()?.id === question.id)
                    setPreviewQuestion(null);
                setNotice("Question deleted.");
                props.onRefresh();
            },
        );
    }
    function toggleTag(tagId: string) {
        const ids = props.quiz.tags.map((tag) => tag.id);
        const tagIds = ids.includes(tagId)
            ? ids.filter((id) => id !== tagId)
            : [...ids, tagId];
        run(
            callQuiz((client) =>
                client.setQuizTags({ quizId: props.quiz.id, tagIds }),
            ),
            props.onRefresh,
        );
    }
    function saveDetails(event: Event) {
        event.preventDefault();
        run(
            callQuiz((client) =>
                client.updateQuiz({
                    id: props.quiz.id,
                    title: title().trim(),
                    description: description().trim(),
                }),
            ),
            () => {
                setEditingDetails(false);
                setNotice("Quiz details saved.");
                props.onRefresh();
            },
        );
    }

    return (
        <div class="space-y-6">
            <section class="border-2 border-ink bg-cream p-4 shadow-ink sm:p-6">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="min-w-0 flex-1">
                        <h1 class="break-words font-bebas text-3xl sm:text-4xl">
                            {props.quiz.title}
                        </h1>
                        <Show when={props.quiz.description}>
                            <p class="mt-1 break-words text-sm text-muted">
                                {props.quiz.description}
                            </p>
                        </Show>
                        <p class="mt-3 font-bebas tracking-wide text-muted">
                            {props.quiz.questions.length} saved{" "}
                            {props.quiz.questions.length === 1
                                ? "question"
                                : "questions"}
                        </p>
                    </div>
                    <button
                        disabled={saving()}
                        onClick={() => {
                            setTitle(props.quiz.title);
                            setDescription(props.quiz.description ?? "");
                            setEditingDetails(!editingDetails());
                        }}
                        class="min-h-11 font-bebas text-navy underline underline-offset-4"
                    >
                        Edit details
                    </button>
                </div>
                <Show when={editingDetails()}>
                    <form
                        onSubmit={saveDetails}
                        class="mt-4 grid gap-3 border-t-2 border-line pt-4"
                    >
                        <label class="space-y-1">
                            <span class="font-bebas text-muted">Title</span>
                            <input
                                value={title()}
                                onInput={(event) =>
                                    setTitle(event.currentTarget.value)
                                }
                                required
                                maxlength={200}
                                disabled={saving()}
                                class={inputClass}
                            />
                        </label>
                        <label class="space-y-1">
                            <span class="font-bebas text-muted">
                                Description
                            </span>
                            <textarea
                                value={description()}
                                onInput={(event) =>
                                    setDescription(event.currentTarget.value)
                                }
                                rows={2}
                                maxlength={2000}
                                disabled={saving()}
                                class={inputClass}
                            />
                        </label>
                        <div class="flex gap-3">
                            <button
                                type="submit"
                                disabled={saving() || !title().trim()}
                                class={`${buttonClass} bg-navy text-cream`}
                            >
                                Save details
                            </button>
                            <button
                                type="button"
                                disabled={saving()}
                                onClick={() => setEditingDetails(false)}
                                class="min-h-11 px-3 font-bebas text-muted"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </Show>
                <Show when={props.tags.length}>
                    <details class="mt-4 border-t-2 border-line pt-3">
                        <summary class="cursor-pointer font-bebas tracking-wide text-muted">
                            Tags{" "}
                            {props.quiz.tags.length
                                ? `· ${props.quiz.tags.map((tag) => tag.name).join(", ")}`
                                : ""}
                        </summary>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <For each={props.tags}>
                                {(tag) => (
                                    <button
                                        disabled={saving()}
                                        aria-pressed={
                                            props.quiz.tags.some(
                                                (item) => item.id === tag.id,
                                            )
                                                ? "true"
                                                : "false"
                                        }
                                        onClick={() => toggleTag(tag.id)}
                                        class={`min-h-11 border-2 border-ink px-3 font-bebas tracking-wide ${props.quiz.tags.some((item) => item.id === tag.id) ? "bg-navy text-cream" : "bg-card"}`}
                                    >
                                        {tag.name}
                                    </button>
                                )}
                            </For>
                        </div>
                    </details>
                </Show>
            </section>
            <div role="status" aria-live="polite" class="text-sm text-teal">
                {notice()}
            </div>
            <Show when={error() && !editor()}>
                <p
                    role="alert"
                    class="border-l-4 border-tomato p-3 text-tomato"
                >
                    {error()}
                </p>
            </Show>
            <div class="grid items-start gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
                <aside
                    aria-label="Saved questions"
                    class={`min-w-0 space-y-3 ${props.quiz.questions.length ? "" : "hidden xl:block"}`}
                >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <h2 class="font-bebas text-2xl">Questions</h2>
                        <button
                            disabled={saving()}
                            onClick={() => selectEditor({})}
                            class={`${buttonClass} bg-sun text-ink`}
                        >
                            + Add question
                        </button>
                    </div>
                    <Show when={props.quiz.questions.length}>
                        <button
                            aria-expanded={showQuestions() ? "true" : "false"}
                            onClick={() => setShowQuestions(!showQuestions())}
                            class="min-h-11 font-bebas text-navy underline underline-offset-4 xl:hidden"
                        >
                            {showQuestions()
                                ? "Hide saved questions"
                                : "Show saved questions"}
                        </button>
                    </Show>
                    <Show
                        when={props.quiz.questions.length}
                        fallback={
                            <p class="border-2 border-dashed border-line p-4 text-sm text-muted">
                                Start with your first question.
                            </p>
                        }
                    >
                        <ol
                            class={`${showQuestions() ? "grid" : "hidden xl:grid"} gap-3 sm:grid-cols-2 xl:grid-cols-1`}
                        >
                            <For each={props.quiz.questions}>
                                {(question, index) => (
                                    <li
                                        data-testid={`saved-question-${question.id}`}
                                        class={`min-w-0 border-2 border-ink p-3 shadow-ink-sm ${editor()?.question?.id === question.id ? "bg-sun" : "bg-cream"}`}
                                    >
                                        <div class="flex items-start gap-3">
                                            <span class="font-bebas text-2xl text-muted">
                                                {index() + 1}
                                            </span>
                                            <div class="min-w-0 flex-1">
                                                <p class="break-words font-bold leading-snug">
                                                    {question.text}
                                                </p>
                                                <p class="mt-1 text-xs text-muted">
                                                    {
                                                        QUESTION_TYPES.find(
                                                            (entry) =>
                                                                entry.value ===
                                                                question.type,
                                                        )?.label
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <div class="mt-2 flex flex-wrap items-center gap-1">
                                            <button
                                                disabled={saving()}
                                                onClick={() =>
                                                    selectEditor({ question })
                                                }
                                                aria-label={`Edit question ${index() + 1}`}
                                                class="min-h-11 px-2 font-bebas text-navy"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                disabled={saving()}
                                                onClick={() => {
                                                    if (
                                                        dirty() &&
                                                        !confirm(
                                                            "Discard your unsaved question changes?",
                                                        )
                                                    )
                                                        return;
                                                    setDirty(false);
                                                    setEditor(null);
                                                    setPreviewQuestion(
                                                        question,
                                                    );
                                                }}
                                                aria-label={`Preview question ${index() + 1}`}
                                                class="min-h-11 px-2 font-bebas text-navy"
                                            >
                                                Preview
                                            </button>
                                            <button
                                                aria-label={`Move question ${index() + 1} up`}
                                                disabled={
                                                    saving() || index() === 0
                                                }
                                                onClick={() =>
                                                    moveQuestion(index(), -1)
                                                }
                                                class="flex h-11 w-9 items-center justify-center disabled:opacity-25"
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                    class="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2"
                                                >
                                                    <path d="m6 14 6-6 6 6" />
                                                </svg>
                                            </button>
                                            <button
                                                aria-label={`Move question ${index() + 1} down`}
                                                disabled={
                                                    saving() ||
                                                    index() ===
                                                        props.quiz.questions
                                                            .length -
                                                            1
                                                }
                                                onClick={() =>
                                                    moveQuestion(index(), 1)
                                                }
                                                class="flex h-11 w-9 items-center justify-center disabled:opacity-25"
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    aria-hidden="true"
                                                    class="h-5 w-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2"
                                                >
                                                    <path d="m6 10 6 6 6-6" />
                                                </svg>
                                            </button>
                                            <button
                                                aria-label={`Delete question ${index() + 1}`}
                                                disabled={saving()}
                                                onClick={() =>
                                                    deleteQuestion(question)
                                                }
                                                class="min-h-11 px-2 font-bebas text-tomato"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                )}
                            </For>
                        </ol>
                    </Show>
                </aside>
                <section class="min-w-0 border-2 border-ink bg-cream p-4 shadow-ink sm:p-6">
                    <Show
                        when={editor()}
                        keyed
                        fallback={
                            <Show
                                when={previewQuestion()}
                                fallback={
                                    <div class="space-y-4 py-8 text-center">
                                        <h2 class="font-bebas text-3xl">
                                            {props.quiz.questions.length
                                                ? "Your questions are saved"
                                                : "Build your quiz"}
                                        </h2>
                                        <p class="text-sm text-muted">
                                            Add a question or select one to
                                            edit.
                                        </p>
                                        <button
                                            disabled={saving()}
                                            onClick={() => selectEditor({})}
                                            class={`${buttonClass} bg-navy text-cream`}
                                        >
                                            + Add question
                                        </button>
                                    </div>
                                }
                            >
                                {(question) => (
                                    <QuestionPreview question={question()} />
                                )}
                            </Show>
                        }
                    >
                        {(current) => (
                            <div>
                                <div class="mb-5 flex flex-wrap items-center justify-between gap-2">
                                    <h2 class="font-bebas text-2xl">
                                        {current.question
                                            ? "Edit question"
                                            : `Question ${props.quiz.questions.length + 1}`}
                                    </h2>
                                    <span class="text-xs text-muted">
                                        {saving()
                                            ? "Saving…"
                                            : dirty()
                                              ? "Unsaved changes"
                                              : "Draft"}
                                    </span>
                                </div>
                                <QuestionForm
                                    initial={
                                        current.question
                                            ? {
                                                  type: current.question.type,
                                                  text: current.question.text,
                                                  options:
                                                      current.question.options,
                                                  acceptedAnswers:
                                                      current.question
                                                          .acceptedAnswers,
                                              }
                                            : undefined
                                    }
                                    onSubmit={saveQuestion}
                                    onCancel={() => selectEditor(null)}
                                    onDirty={setDirty}
                                    saving={saving()}
                                    error={error()}
                                    submitLabel={
                                        current.question
                                            ? "Save changes"
                                            : "Save question"
                                    }
                                    allowAddAnother
                                />
                            </div>
                        )}
                    </Show>
                </section>
            </div>
        </div>
    );
}
