// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { createQuiz } from "~/server/quiz-fns";

export const Route = createFileRoute("/quiz/new")({
    component: CreateQuiz,
});

function CreateQuiz() {
    const navigate = useNavigate();
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [error, setError] = createSignal<string | null>(null);
    const [saving, setSaving] = createSignal(false);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!title().trim()) return;

        setSaving(true);
        setError(null);

        try {
            const id = await createQuiz({
                data: {
                    title: title().trim(),
                    description: description().trim() || undefined,
                },
            });
            navigate({ to: `/quiz/${id}` });
        } catch (err: any) {
            setError(err?.message ?? "Failed to create quiz");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center gap-4">
                <a
                    href="/"
                    class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors"
                >
                    BACK
                </a>
                <h1 class="font-bebas text-3xl tracking-wide">New Quiz</h1>
            </header>

            <main class="max-w-xl mx-auto px-6 py-10">
                <form onSubmit={handleSubmit} class="space-y-6">
                    <div>
                        <label class="block font-bebas text-sm tracking-widest text-[#5a5040] mb-2">
                            TITLE
                        </label>
                        <input
                            type="text"
                            value={title()}
                            onInput={(e) => setTitle(e.currentTarget.value)}
                            placeholder="e.g. Geography Trivia"
                            required
                            autofocus
                            class="w-full px-4 py-3 bg-white border-2 border-[#b8ae9e] font-karla text-[#1a1a1a] focus:border-[#1a3a6e] outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label class="block font-bebas text-sm tracking-widest text-[#5a5040] mb-2">
                            DESCRIPTION
                        </label>
                        <textarea
                            value={description()}
                            onInput={(e) => setDescription(e.currentTarget.value)}
                            placeholder="Optional description"
                            rows={3}
                            class="w-full px-4 py-3 bg-white border-2 border-[#b8ae9e] font-karla text-[#1a1a1a] focus:border-[#1a3a6e] outline-none transition-colors resize-y"
                        />
                    </div>

                    <Show when={error()}>
                        <p class="text-[#c0261a] text-sm font-karla">{error()}</p>
                    </Show>

                    <button
                        type="submit"
                        disabled={saving() || !title().trim()}
                        class="w-full font-bebas text-xl tracking-wide bg-[#1a3a6e] text-[#ddd5c4] py-3 border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] transition-all disabled:opacity-40 disabled:shadow-none disabled:transform-none cursor-pointer"
                    >
                        {saving() ? "Creating..." : "Create Quiz"}
                    </button>
                </form>
            </main>
        </div>
    );
}
