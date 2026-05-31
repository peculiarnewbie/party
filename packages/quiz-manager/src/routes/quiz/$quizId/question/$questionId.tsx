// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal, createResource, Show } from "solid-js";
import { QuestionForm } from "~/components/question-form";
import type { QuestionFormData } from "~/components/question-form";
import { getQuiz, updateQuestion } from "~/server/quiz-fns";

export const Route = createFileRoute("/quiz/$quizId/question/$questionId")({
    component: EditQuestion,
});

function EditQuestion() {
    const { quizId, questionId } = Route.useParams();
    const navigate = useNavigate();
    const [quiz] = createResource(() => quizId(), (id) => getQuiz({ data: id }));
    const [saving, setSaving] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    const question = () => {
        const q = quiz();
        if (!q) return undefined;
        return q.questions.find((qu: any) => qu.id === questionId());
    };

    async function handleSubmit(data: QuestionFormData) {
        setSaving(true);
        setError(null);
        try {
            await updateQuestion({
                data: { questionId: questionId(), ...data },
            });
            navigate({ to: `/quiz/${quizId()}` });
        } catch (err: any) {
            setError(err?.message ?? "Failed to update question");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center gap-4">
                <a href={`/quiz/${quizId()}`} class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors">BACK</a>
                <h1 class="font-bebas text-3xl tracking-wide">Edit Question</h1>
            </header>
            <main class="max-w-xl mx-auto px-6 py-10">
                <Show when={question()} fallback={<div class="text-center text-[#7a7060] font-bebas text-xl tracking-wide py-20">Loading...</div>}>
                    {(q) => (
                        <QuestionForm
                            initial={{
                                type: q().type,
                                text: q().text,
                                options: q().options?.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) ?? [],
                                acceptedAnswers: q().acceptedAnswers?.map((a: any) => ({ pattern: a.pattern, matchType: a.matchType, caseInsensitive: a.caseInsensitive })) ?? [],
                            }}
                            onSubmit={handleSubmit}
                            saving={saving()}
                            error={error()}
                            submitLabel="Save Changes"
                        />
                    )}
                </Show>
            </main>
        </div>
    );
}
