// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createSignal } from "solid-js";
import { QuestionForm } from "~/components/question-form";
import type { QuestionFormData } from "~/components/question-form";
import { createQuestion } from "~/server/quiz-fns";

export const Route = createFileRoute("/quiz/$quizId/question/new")({
    component: CreateQuestion,
});

function CreateQuestion() {
    const { quizId } = Route.useParams();
    const navigate = useNavigate();
    const [saving, setSaving] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    async function handleSubmit(data: QuestionFormData) {
        setSaving(true);
        setError(null);
        try {
            await createQuestion({
                data: { quizId: quizId(), ...data },
            });
            navigate({ to: `/quiz/${quizId()}` });
        } catch (err: any) {
            setError(err?.message ?? "Failed to create question");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center gap-4">
                <a href={`/quiz/${quizId()}`} class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors">BACK</a>
                <h1 class="font-bebas text-3xl tracking-wide">Add Question</h1>
            </header>
            <main class="max-w-xl mx-auto px-6 py-10">
                <QuestionForm onSubmit={handleSubmit} saving={saving()} error={error()} submitLabel="Add Question" />
            </main>
        </div>
    );
}
