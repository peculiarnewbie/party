import { createServerFn } from "@tanstack/solid-start";
import { Effect } from "effect";
import { env } from "cloudflare:workers";
import { QuizDb } from "~/services/quiz-db";
import type { QuestionInput } from "~/schemas";

const dbLayer = QuizDb.layer(env.DB);

export const listQuizzes = createServerFn({ method: "GET" }).handler(async () => {
    const program = Effect.gen(function* () {
        const db = yield* QuizDb;
        return yield* db.listQuizzes();
    }).pipe(
        Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
        Effect.provide(dbLayer),
    );
    return Effect.runPromise(program);
});

export const getQuiz = createServerFn({ method: "GET" })
    .inputValidator((id: string) => id)
    .handler(async ({ data: id }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.getQuiz(id);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        const quiz = await Effect.runPromise(program);
        if (!quiz) throw new Error("Quiz not found");
        return quiz;
    });

export const createQuiz = createServerFn({ method: "POST" })
    .inputValidator((input: { title: string; description?: string }) => input)
    .handler(async ({ data }) => {
        if (!data.title?.trim()) throw new Error("Title is required");
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.createQuiz({
                title: data.title.trim(),
                description: data.description,
            });
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const updateQuiz = createServerFn({ method: "POST" })
    .inputValidator(
        (input: { id: string; title?: string; description?: string }) => input,
    )
    .handler(async ({ data }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.updateQuiz(data.id, {
                title: data.title,
                description: data.description,
            });
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.catchTag("QuizNotFoundError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const deleteQuiz = createServerFn({ method: "POST" })
    .inputValidator((id: string) => id)
    .handler(async ({ data: id }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.deleteQuiz(id);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.catchTag("QuizNotFoundError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const createQuestion = createServerFn({ method: "POST" })
    .inputValidator((input: { quizId: string } & QuestionInput) => input)
    .handler(async ({ data }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.createQuestion(data.quizId, {
                type: data.type,
                text: data.text,
                options: data.options,
                acceptedAnswers: data.acceptedAnswers,
            });
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const updateQuestion = createServerFn({ method: "POST" })
    .inputValidator((input: { questionId: string } & QuestionInput) => input)
    .handler(async ({ data }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.updateQuestion(data.questionId, {
                type: data.type,
                text: data.text,
                options: data.options,
                acceptedAnswers: data.acceptedAnswers,
            });
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.catchTag("QuestionNotFoundError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const deleteQuestion = createServerFn({ method: "POST" })
    .inputValidator((id: string) => id)
    .handler(async ({ data: id }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.deleteQuestion(id);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.catchTag("QuestionNotFoundError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const reorderQuestions = createServerFn({ method: "POST" })
    .inputValidator((input: { quizId: string; orderedIds: string[] }) => input)
    .handler(async ({ data }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.reorderQuestions(data.quizId, data.orderedIds);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const listTags = createServerFn({ method: "GET" }).handler(async () => {
    const program = Effect.gen(function* () {
        const db = yield* QuizDb;
        return yield* db.listTags();
    }).pipe(
        Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
        Effect.provide(dbLayer),
    );
    return Effect.runPromise(program);
});

export const createTag = createServerFn({ method: "POST" })
    .inputValidator((name: string) => name)
    .handler(async ({ data: name }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            return yield* db.createTag(name);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.catchTag("DuplicateTagError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const deleteTag = createServerFn({ method: "POST" })
    .inputValidator((id: string) => id)
    .handler(async ({ data: id }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.deleteTag(id);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.catchTag("TagNotFoundError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });

export const setQuizTags = createServerFn({ method: "POST" })
    .inputValidator((input: { quizId: string; tagIds: string[] }) => input)
    .handler(async ({ data }) => {
        const program = Effect.gen(function* () {
            const db = yield* QuizDb;
            yield* db.setQuizTags(data.quizId, data.tagIds);
        }).pipe(
            Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
            Effect.provide(dbLayer),
        );
        return Effect.runPromise(program);
    });
