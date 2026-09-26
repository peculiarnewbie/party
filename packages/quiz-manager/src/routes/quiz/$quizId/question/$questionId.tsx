import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { Loading, Show } from "solid-js";
import { QuestionForm } from "~/components/question-form";
import type { QuestionFormData } from "~/components/question-form";
import { callQuiz, createQuizQuery, createQuizActions } from "~/rpc/client";

export const Route = createFileRoute("/quiz/$quizId/question/$questionId")({
    component: EditQuestion,
});

function EditQuestion() {
    const params = Route.useParams();
    const navigate = useNavigate();
    const quiz = createQuizQuery(() => {
        const id = params().quizId;
        return callQuiz((client) => client.getQuiz(id));
    });
    const { pending: saving, error, run } = createQuizActions();

    const question = () => {
        const q = quiz();
        if (!q) return undefined;
        return q.questions.find((qu) => qu.id === params().questionId);
    };

    function handleSubmit(data: QuestionFormData) {
        const quizId = params().quizId;
        const input = { questionId: params().questionId, ...data };
        run(
            callQuiz((client) => client.updateQuestion(input)),
            () => {
                void navigate({ to: "/quiz/$quizId", params: { quizId } });
            },
        );
    }

    return (
        <div class="min-h-screen bg-[#f5f0e8] font-karla">
            <header class="bg-[#1a3a6e] text-[#ddd5c4] px-8 py-5 flex items-center gap-4">
                <a
                    href={`/quiz/${params().quizId}`}
                    class="font-bebas text-sm tracking-widest text-[#b8ae9e] hover:text-[#ddd5c4] transition-colors"
                >
                    BACK
                </a>
                <h1 class="font-bebas text-3xl tracking-wide">Edit Question</h1>
            </header>
            <main class="max-w-xl mx-auto px-6 py-10">
                <Loading fallback={<p>Loading...</p>}>
                    <Show
                        when={question()}
                        fallback={<p>Question not found.</p>}
                    >
                        {(q) => (
                            <QuestionForm
                                initial={{
                                    type: q().type,
                                    text: q().text,
                                    options:
                                        q().options?.map((o) => ({
                                            text: o.text,
                                            isCorrect: o.isCorrect,
                                        })) ?? [],
                                    acceptedAnswers:
                                        q().acceptedAnswers?.map((a) => ({
                                            pattern: a.pattern,
                                            matchType: a.matchType,
                                            caseInsensitive: a.caseInsensitive,
                                        })) ?? [],
                                }}
                                onSubmit={handleSubmit}
                                saving={saving()}
                                error={error()}
                                submitLabel="Save Changes"
                            />
                        )}
                    </Show>
                </Loading>
            </main>
        </div>
    );
}
