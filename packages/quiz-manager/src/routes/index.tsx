// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, createResource, For, Show } from "solid-js";
import { listQuizzes, deleteQuiz } from "~/server/quiz-fns";

export const Route = createFileRoute("/")({
    component: Dashboard,
});

function Dashboard() {
    const navigate = useNavigate();
    const [quizzes, { refetch }] = createResource(() => listQuizzes());
    const [deleting, setDeleting] = createSignal<string | null>(null);

    async function handleDelete(id: string) {
        if (!confirm("Delete this quiz and all its questions?")) return;
        setDeleting(id);
        try {
            await deleteQuiz({ data: id });
            refetch();
        } finally {
            setDeleting(null);
        }
    }

    function typeLabel(b: {
        multipleChoice: number;
        fillIn: number;
        open: number;
        placeholder: number;
    }) {
        const parts: string[] = [];
        if (b.multipleChoice) parts.push(`${b.multipleChoice} MC`);
        if (b.fillIn) parts.push(`${b.fillIn} fill-in`);
        if (b.open) parts.push(`${b.open} open`);
        if (b.placeholder) parts.push(`${b.placeholder} placeholder`);
        return parts.join(", ") || "No questions";
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center justify-between">
                <h1 class="font-bebas text-3xl tracking-wide">Quiz Manager</h1>
                <div class="flex items-center gap-4">
                    <a
                        href="/tags"
                        class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors"
                    >
                        TAGS
                    </a>
                    <a
                        href="/quiz/new"
                        class="font-bebas text-lg tracking-wide bg-[#c0261a] text-[#ddd5c4] px-5 py-2 border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] transition-all"
                    >
                        + New Quiz
                    </a>
                </div>
            </header>

            <main class="max-w-5xl mx-auto px-6 py-10">
                <Show
                    when={!quizzes.loading}
                    fallback={
                        <div class="text-center text-[#7a7060] font-bebas text-xl tracking-wide py-20">
                            Loading...
                        </div>
                    }
                >
                    <Show
                        when={quizzes() && quizzes()!.length > 0}
                        fallback={
                            <div class="text-center py-20">
                                <p class="text-[#7a7060] font-bebas text-2xl tracking-wide mb-4">
                                    No quizzes yet
                                </p>
                                <a
                                    href="/quiz/new"
                                    class="inline-block font-bebas text-lg tracking-wide bg-[#1a3a6e] text-[#ddd5c4] px-6 py-3 border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] transition-all"
                                >
                                    Create your first quiz
                                </a>
                            </div>
                        }
                    >
                        <div class="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a]">
                            <table class="w-full">
                                <thead>
                                    <tr class="border-b-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4]">
                                        <th class="text-left font-bebas text-sm tracking-widest px-5 py-3">
                                            Quiz
                                        </th>
                                        <th class="text-left font-bebas text-sm tracking-widest px-5 py-3">
                                            Questions
                                        </th>
                                        <th class="text-left font-bebas text-sm tracking-widest px-5 py-3">
                                            Tags
                                        </th>
                                        <th class="text-right font-bebas text-sm tracking-widest px-5 py-3">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={quizzes()}>
                                        {(quiz) => (
                                            <tr class="border-b border-[#e5dfd5] hover:bg-[#f9f5ef] transition-colors">
                                                <td class="px-5 py-4">
                                                    <a
                                                        href={`/quiz/${quiz.id}`}
                                                        class="font-bebas text-lg text-[#1a1a1a] hover:text-[#c0261a] transition-colors"
                                                    >
                                                        {quiz.title}
                                                    </a>
                                                    <Show when={quiz.description}>
                                                        <p class="text-sm text-[#7a7060] mt-0.5">
                                                            {quiz.description}
                                                        </p>
                                                    </Show>
                                                </td>
                                                <td class="px-5 py-4 text-sm text-[#5a5040]">
                                                    {quiz.questionCount}
                                                    <span class="text-[#9a9080] ml-1">
                                                        ({typeLabel(quiz.typeBreakdown)})
                                                    </span>
                                                </td>
                                                <td class="px-5 py-4">
                                                    <div class="flex flex-wrap gap-1.5">
                                                        <For each={quiz.tags}>
                                                            {(tag) => (
                                                                <span class="inline-block text-xs font-bebas tracking-wider bg-[#e5dfd5] text-[#5a5040] px-2 py-0.5">
                                                                    {tag.name}
                                                                </span>
                                                            )}
                                                        </For>
                                                    </div>
                                                </td>
                                                <td class="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(quiz.id)}
                                                        disabled={deleting() === quiz.id}
                                                        class="text-sm font-bebas tracking-wider text-[#c0261a] hover:text-[#8b1a10] disabled:opacity-40 transition-colors cursor-pointer"
                                                    >
                                                        {deleting() === quiz.id ? "..." : "DELETE"}
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </div>
                    </Show>
                </Show>
            </main>
        </div>
    );
}
