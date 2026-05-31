// @ts-nocheck
import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, createResource, For, Show } from "solid-js";
import { getQuiz, updateQuiz, deleteQuestion, listTags, setQuizTags } from "~/server/quiz-fns";

export const Route = createFileRoute("/quiz/$quizId")({
    component: QuizDetail,
});

function QuizDetail() {
    const { quizId } = Route.useParams();
    const [quiz, { refetch }] = createResource(() => quizId(), (id) => getQuiz({ data: id }));
    const [allTags] = createResource(() => listTags());

    const [editing, setEditing] = createSignal(false);
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [saving, setSaving] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    function startEdit() {
        const q = quiz();
        if (!q) return;
        setTitle(q.title);
        setDescription(q.description ?? "");
        setEditing(true);
    }

    async function saveEdit() {
        setSaving(true);
        setError(null);
        try {
            await updateQuiz({
                data: {
                    id: quizId(),
                    title: title().trim(),
                    description: description().trim() || undefined,
                },
            });
            setEditing(false);
            refetch();
        } catch (err: any) {
            setError(err?.message ?? "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteQuestion(questionId: string) {
        if (!confirm("Delete this question?")) return;
        await deleteQuestion({ data: questionId });
        refetch();
    }

    async function toggleTag(tagId: string, isActive: boolean) {
        const q = quiz();
        if (!q) return;
        const currentTagIds = q.tags
            .map((t: any) => {
                const found = allTags()?.find((at: any) => at.slug === t.slug);
                return found?.id;
            })
            .filter(Boolean);
        const next = isActive
            ? currentTagIds.filter((id: string) => id !== tagId)
            : [...currentTagIds, tagId];
        await setQuizTags({ data: { quizId: quizId(), tagIds: next } });
        refetch();
    }

    function questionTypeLabel(type: string) {
        switch (type) {
            case "multiple_choice": return "Multiple Choice";
            case "fill_in": return "Fill In";
            case "open": return "Open";
            case "placeholder": return "Placeholder";
            default: return type;
        }
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center gap-4">
                <a href="/" class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors">
                    BACK
                </a>
                <h1 class="font-bebas text-3xl tracking-wide">Quiz Details</h1>
            </header>

            <main class="max-w-3xl mx-auto px-6 py-10">
                <Show when={!quiz.loading} fallback={<div class="text-center text-[#7a7060] font-bebas text-xl tracking-wide py-20">Loading...</div>}>
                    <Show when={quiz()} fallback={<div class="text-center py-20"><p class="text-[#7a7060] font-bebas text-2xl">Quiz not found</p></div>}>
                        {(q) => (
                            <div class="space-y-8">
                                <div class="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0_#1a1a1a] p-6">
                                    <Show when={editing()} fallback={
                                        <div>
                                            <div class="flex items-start justify-between mb-4">
                                                <div>
                                                    <h2 class="font-bebas text-2xl text-[#1a1a1a]">{q().title}</h2>
                                                    <Show when={q().description}><p class="text-[#5a5040] mt-1">{q().description}</p></Show>
                                                </div>
                                                <button onClick={startEdit} class="font-bebas text-sm tracking-widest text-[#1a3a6e] hover:text-[#c0261a] transition-colors cursor-pointer">EDIT</button>
                                            </div>
                                            <Show when={allTags()}>
                                                <div class="border-t border-[#e5dfd5] pt-4 mt-4">
                                                    <label class="block font-bebas text-xs tracking-widest text-[#5a5040] mb-2">TAGS</label>
                                                    <div class="flex flex-wrap gap-2">
                                                        <For each={allTags()}>
                                                            {(tag: any) => {
                                                                const isActive = () => q().tags.some((t: any) => t.slug === tag.slug);
                                                                return (
                                                                    <button onClick={() => toggleTag(tag.id, isActive())}
                                                                        class={`text-xs font-bebas tracking-wider px-2.5 py-1 border transition-colors cursor-pointer ${isActive() ? "bg-[#1a3a6e] text-[#ddd5c4] border-[#1a3a6e]" : "bg-[#e5dfd5] text-[#5a5040] border-[#b8ae9e] hover:bg-[#d5cfc5]"}`}>
                                                                        {tag.name}
                                                                    </button>
                                                                );
                                                            }}
                                                        </For>
                                                    </div>
                                                </div>
                                            </Show>
                                        </div>
                                    }>
                                        <div class="space-y-4">
                                            <div>
                                                <label class="block font-bebas text-xs tracking-widest text-[#5a5040] mb-1">TITLE</label>
                                                <input type="text" value={title()} onInput={(e) => setTitle(e.currentTarget.value)}
                                                    class="w-full px-3 py-2 bg-white border-2 border-[#b8ae9e] font-karla text-[#1a1a1a] focus:border-[#1a3a6e] outline-none" />
                                            </div>
                                            <div>
                                                <label class="block font-bebas text-xs tracking-widest text-[#5a5040] mb-1">DESCRIPTION</label>
                                                <textarea value={description()} onInput={(e) => setDescription(e.currentTarget.value)} rows={2}
                                                    class="w-full px-3 py-2 bg-white border-2 border-[#b8ae9e] font-karla text-[#1a1a1a] focus:border-[#1a3a6e] outline-none resize-y" />
                                            </div>
                                            <Show when={error()}><p class="text-[#c0261a] text-sm">{error()}</p></Show>
                                            <div class="flex gap-2">
                                                <button onClick={saveEdit} disabled={saving()}
                                                    class="font-bebas text-sm tracking-widest bg-[#1a3a6e] text-[#ddd5c4] px-4 py-2 border-2 border-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a] transition-all cursor-pointer disabled:opacity-40">
                                                    {saving() ? "SAVING..." : "SAVE"}
                                                </button>
                                                <button onClick={() => setEditing(false)}
                                                    class="font-bebas text-sm tracking-widest text-[#5a5040] px-4 py-2 border-2 border-[#b8ae9e] hover:bg-[#e5dfd5] transition-colors cursor-pointer">
                                                    CANCEL
                                                </button>
                                            </div>
                                        </div>
                                    </Show>
                                </div>

                                <div>
                                    <div class="flex items-center justify-between mb-4">
                                        <h3 class="font-bebas text-xl tracking-wide text-[#1a1a1a]">Questions ({q().questions.length})</h3>
                                        <a href={`/quiz/${quizId()}/question/new`}
                                            class="font-bebas text-sm tracking-widest bg-[#c0261a] text-[#ddd5c4] px-4 py-2 border-2 border-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a] transition-all">
                                            + Add Question
                                        </a>
                                    </div>
                                    <Show when={q().questions.length > 0} fallback={
                                        <div class="bg-white border-2 border-dashed border-[#b8ae9e] p-8 text-center">
                                            <p class="text-[#7a7060] font-bebas text-lg tracking-wide">No questions yet</p>
                                        </div>
                                    }>
                                        <div class="space-y-3">
                                            <For each={q().questions}>
                                                {(question: any, index) => (
                                                    <div class="bg-white border-2 border-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] p-4 flex items-start gap-4">
                                                        <div class="font-bebas text-[#9a9080] text-lg w-8 shrink-0 text-center pt-0.5">{index() + 1}</div>
                                                        <div class="flex-1 min-w-0">
                                                            <span class="text-xs font-bebas tracking-wider bg-[#e5dfd5] text-[#5a5040] px-2 py-0.5">{questionTypeLabel(question.type)}</span>
                                                            <p class="text-[#1a1a1a] mt-1">{question.text}</p>
                                                            <Show when={question.type === "multiple_choice" && question.options?.length}>
                                                                <ul class="mt-2 space-y-1"><For each={question.options}>{(opt: any) => (
                                                                    <li class="text-sm text-[#5a5040]">{opt.isCorrect ? "✓" : "○"} {opt.text}</li>
                                                                )}</For></ul>
                                                            </Show>
                                                            <Show when={question.type === "fill_in" && question.acceptedAnswers?.length}>
                                                                <div class="mt-2 text-sm text-[#5a5040]">Accepted: <For each={question.acceptedAnswers}>{(ans: any) => (
                                                                    <span class="inline-block bg-[#e5dfd5] px-1.5 py-0.5 mr-1">{ans.pattern} ({ans.matchType})</span>
                                                                )}</For></div>
                                                            </Show>
                                                        </div>
                                                        <div class="flex gap-2 shrink-0">
                                                            <a href={`/quiz/${quizId()}/question/${question.id}`} class="font-bebas text-xs tracking-widest text-[#1a3a6e] hover:text-[#c0261a] transition-colors">EDIT</a>
                                                            <button onClick={() => handleDeleteQuestion(question.id)} class="font-bebas text-xs tracking-widest text-[#c0261a] hover:text-[#8b1a10] transition-colors cursor-pointer">DEL</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </Show>
                                </div>
                            </div>
                        )}
                    </Show>
                </Show>
            </main>
        </div>
    );
}
