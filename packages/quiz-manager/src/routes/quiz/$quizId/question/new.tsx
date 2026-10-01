import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { QuestionForm } from "~/components/question-form";
import type { QuestionFormData } from "~/components/question-form";
import { callQuiz, createQuizActions } from "~/rpc/client";

export const Route = createFileRoute("/quiz/$quizId/question/new")({
    component: CreateQuestion,
});

function CreateQuestion() {
    const params = Route.useParams();
    const navigate = useNavigate();
    const { pending: saving, error, run } = createQuizActions();

    function handleSubmit(data: QuestionFormData) {
        const quizId = params().quizId;
        const input = { quizId: params().quizId, ...data };
        run(
            callQuiz((client) => client.createQuestion(input)),
            () => {
                void navigate({ to: "/quiz/$quizId", params: { quizId } });
            },
        );
    }

    return (
        <div class="min-h-screen bg-paper font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-4 sm:px-8 py-5 flex items-center gap-4 border-b-2 border-ink">
                <a
                    href={`/quiz/${params().quizId}`}
                    class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors"
                >
                    BACK
                </a>
                <h1 class="font-bebas text-3xl tracking-wide">Add Question</h1>
            </header>
            <main class="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <QuestionForm
                    onSubmit={handleSubmit}
                    saving={saving()}
                    error={error()}
                    submitLabel="Add Question"
                />
            </main>
        </div>
    );
}
