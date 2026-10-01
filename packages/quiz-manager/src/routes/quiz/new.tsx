import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { callQuiz, createQuizActions } from "~/rpc/client";

export const Route = createFileRoute("/quiz/new")({ component: CreateQuiz });

function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const { pending: saving, error, run } = createQuizActions();
    function handleSubmit(event: Event) {
        event.preventDefault();
        if (!title().trim()) return;
        run(
            callQuiz((client) =>
                client.createQuiz({
                    title: title().trim(),
                    description: description().trim() || undefined,
                }),
            ),
            (id) => {
                void navigate({ to: "/quiz/$quizId", params: { quizId: id } });
            },
        );
    }
    return (
        <div class="min-h-screen bg-paper">
            <header class="flex items-center gap-5 border-b-2 border-ink bg-navy px-4 py-4 text-cream sm:px-8">
                <a
                    href="/"
                    class="flex min-h-11 items-center font-bebas tracking-wide"
                >
                    All quizzes
                </a>
                <h1 class="border-l border-cream/40 pl-5 font-bebas text-2xl">
                    New quiz
                </h1>
            </header>
            <main class="mx-auto max-w-xl px-4 py-8 sm:py-12">
                <form
                    onSubmit={handleSubmit}
                    class="space-y-6 border-2 border-ink bg-cream p-5 shadow-ink sm:p-8"
                >
                    <div>
                        <p class="mb-2 font-bebas text-xs tracking-widest text-muted">
                            1 · Name your quiz
                        </p>
                        <h2 class="font-bebas text-3xl">
                            What are we playing?
                        </h2>
                        <p class="mt-2 text-sm text-muted">
                            Next, add your questions and answers.
                        </p>
                    </div>
                    <fieldset disabled={saving()} class="space-y-5">
                        <div>
                            <label
                                for="quiz-title"
                                class="mb-2 block font-bebas tracking-wide"
                            >
                                Quiz title
                            </label>
                            <input
                                id="quiz-title"
                                value={title()}
                                onInput={(event) =>
                                    setTitle(event.currentTarget.value)
                                }
                                placeholder="e.g. Geography Trivia"
                                required
                                maxlength={200}
                                autofocus
                                class="w-full min-w-0 border-2 border-line bg-card px-4 py-3 outline-none focus:border-navy"
                            />
                        </div>
                        <details>
                            <summary class="cursor-pointer font-bebas tracking-wide text-muted">
                                Add a description (optional)
                            </summary>
                            <label for="quiz-description" class="sr-only">
                                Description
                            </label>
                            <textarea
                                id="quiz-description"
                                value={description()}
                                onInput={(event) =>
                                    setDescription(event.currentTarget.value)
                                }
                                placeholder="What should players expect?"
                                rows={3}
                                maxlength={2000}
                                class="mt-3 w-full border-2 border-line bg-card px-4 py-3 outline-none focus:border-navy"
                            />
                        </details>
                        <Show when={error()}>
                            <p role="alert" class="text-sm text-tomato">
                                {error()}
                            </p>
                        </Show>
                        <button
                            type="submit"
                            disabled={saving() || !title().trim()}
                            class="min-h-12 w-full border-2 border-ink bg-navy px-4 py-3 font-bebas text-xl tracking-wide text-cream shadow-ink-sm disabled:opacity-40"
                        >
                            {saving() ? "Creating…" : "Create quiz"}
                        </button>
                    </fieldset>
                </form>
            </main>
        </div>
    );
}
