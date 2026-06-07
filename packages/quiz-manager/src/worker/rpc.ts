import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";
import { QuizDb } from "~/services/quiz-db";
import type { QuizSummary, QuizWithQuestions, TagWithCount, QuestionInput } from "~/schemas";

export class QuizManager extends WorkerEntrypoint<Env> {
    private run<A>(effect: Effect.Effect<A, never>): Promise<A> {
        return Effect.runPromise(effect);
    }

    async getQuiz(id: string): Promise<QuizWithQuestions | null> {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.getQuiz(id);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(QuizDb.layer(this.env.DB)),
        );

        return this.run(program);
    }

    async listQuizzes(
        opts?: { tags?: string[]; search?: string },
    ): Promise<QuizSummary[]> {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.listQuizzes(opts);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(QuizDb.layer(this.env.DB)),
        );

        return this.run(program);
    }

    async getQuizForGame(id: string): Promise<QuizWithQuestions | null> {
        return this.getQuiz(id);
    }

    async listTags(): Promise<TagWithCount[]> {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.listTags();
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(QuizDb.layer(this.env.DB)),
        );

        return this.run(program);
    }
}
