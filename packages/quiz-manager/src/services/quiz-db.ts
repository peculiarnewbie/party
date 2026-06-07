import { Effect, Context, Layer } from "effect";
import { drizzle } from "drizzle-orm/d1";
import { eq, asc, sql, inArray } from "drizzle-orm";
import * as schema from "~/db/schema";
import type {
    QuizSummary,
    QuizWithQuestions,
    TagWithCount,
    QuestionInput,
} from "~/schemas";
import {
    DatabaseError,
    QuizNotFoundError,
    QuestionNotFoundError,
    TagNotFoundError,
    DuplicateTagError,
} from "~/errors";
import { nanoid } from "nanoid";

interface QuizDbShape {
    readonly getQuiz: (
        id: string,
    ) => Effect.Effect<QuizWithQuestions | null, DatabaseError>;
    readonly listQuizzes: (opts?: {
        tags?: string[];
        search?: string;
    }) => Effect.Effect<QuizSummary[], DatabaseError>;
    readonly createQuiz: (data: {
        title: string;
        description?: string;
    }) => Effect.Effect<string, DatabaseError>;
    readonly updateQuiz: (
        id: string,
        data: { title?: string; description?: string },
    ) => Effect.Effect<void, DatabaseError | QuizNotFoundError>;
    readonly deleteQuiz: (
        id: string,
    ) => Effect.Effect<void, DatabaseError | QuizNotFoundError>;
    readonly createQuestion: (
        quizId: string,
        data: QuestionInput,
    ) => Effect.Effect<string, DatabaseError>;
    readonly updateQuestion: (
        id: string,
        data: QuestionInput,
    ) => Effect.Effect<void, DatabaseError | QuestionNotFoundError>;
    readonly deleteQuestion: (
        id: string,
    ) => Effect.Effect<void, DatabaseError | QuestionNotFoundError>;
    readonly reorderQuestions: (
        quizId: string,
        orderedIds: string[],
    ) => Effect.Effect<void, DatabaseError>;
    readonly listTags: () => Effect.Effect<TagWithCount[], DatabaseError>;
    readonly createTag: (
        name: string,
    ) => Effect.Effect<string, DatabaseError | DuplicateTagError>;
    readonly deleteTag: (
        id: string,
    ) => Effect.Effect<void, DatabaseError | TagNotFoundError>;
    readonly setQuizTags: (
        quizId: string,
        tagIds: string[],
    ) => Effect.Effect<void, DatabaseError>;
}

export class QuizDb extends Context.Service<QuizDb, QuizDbShape>()("QuizDb") {
    static readonly layer = (d1: D1Database) =>
        Layer.sync(QuizDb)(() => {
            const db = drizzle(d1, { schema });

            const wrapDb = <A>(op: string, fn: () => Promise<A>) =>
                Effect.tryPromise({
                    try: fn,
                    catch: (cause) => new DatabaseError({ operation: op, cause }),
                });

            return {
                getQuiz: (id: string) =>
                    wrapDb("getQuiz", async () => {
                        const quiz = await db
                            .select()
                            .from(schema.quizzes)
                            .where(eq(schema.quizzes.id, id))
                            .get();

                        if (!quiz) return null;

                        const questions = await db
                            .select()
                            .from(schema.questions)
                            .where(eq(schema.questions.quizId, id))
                            .orderBy(asc(schema.questions.sortOrder));

                        const questionIds = questions.map((q) => q.id);

                        const options =
                            questionIds.length > 0
                                ? await db
                                      .select()
                                      .from(schema.answerOptions)
                                      .where(
                                          inArray(
                                              schema.answerOptions.questionId,
                                              questionIds,
                                          ),
                                      )
                                      .orderBy(asc(schema.answerOptions.sortOrder))
                                : [];

                        const answers =
                            questionIds.length > 0
                                ? await db
                                      .select()
                                      .from(schema.acceptedAnswers)
                                      .where(
                                          inArray(
                                              schema.acceptedAnswers.questionId,
                                              questionIds,
                                          ),
                                      )
                                      .orderBy(asc(schema.acceptedAnswers.sortOrder))
                                : [];

                        return {
                            id: quiz.id,
                            title: quiz.title,
                            description: quiz.description,
                            questions: questions.map((q) => ({
                                id: q.id,
                                quizId: q.quizId,
                                type: q.type,
                                text: q.text,
                                sortOrder: q.sortOrder,
                                options: options
                                    .filter((o) => o.questionId === q.id)
                                    .map((o) => ({
                                        id: o.id,
                                        questionId: o.questionId,
                                        text: o.text,
                                        isCorrect: o.isCorrect,
                                        sortOrder: o.sortOrder,
                                    })),
                                acceptedAnswers: answers
                                    .filter((a) => a.questionId === q.id)
                                    .map((a) => ({
                                        id: a.id,
                                        questionId: a.questionId,
                                        pattern: a.pattern,
                                        matchType: a.matchType,
                                        caseInsensitive: a.caseInsensitive,
                                        sortOrder: a.sortOrder,
                                    })),
                            })),
                        } satisfies QuizWithQuestions;
                    }),

                listQuizzes: (opts) =>
                    wrapDb("listQuizzes", async () => {
                        const allQuizzes = await db
                            .select()
                            .from(schema.quizzes)
                            .orderBy(asc(schema.quizzes.createdAt));

                        const allTags = await db.select().from(schema.tags);
                        const allQuizTags = await db.select().from(schema.quizTags);

                        const allQuestions = await db
                            .select({
                                quizId: schema.questions.quizId,
                                type: schema.questions.type,
                            })
                            .from(schema.questions);

                        let filteredQuizIds: Set<string> | null = null;

                        if (opts?.tags && opts.tags.length > 0) {
                            const matchingTagIds = allTags
                                .filter((t) => opts.tags!.includes(t.slug))
                                .map((t) => t.id);

                            if (matchingTagIds.length > 0) {
                                const matchingQuizIds = allQuizTags
                                    .filter((qt) => matchingTagIds.includes(qt.tagId))
                                    .map((qt) => qt.quizId);
                                filteredQuizIds = new Set(matchingQuizIds);
                            } else {
                                filteredQuizIds = new Set();
                            }
                        }

                        if (opts?.search) {
                            const searchLower = opts.search.toLowerCase();
                            const searchMatches = allQuizzes
                                .filter(
                                    (q) =>
                                        q.title.toLowerCase().includes(searchLower) ||
                                        q.description?.toLowerCase().includes(searchLower),
                                )
                                .map((q) => q.id);

                            if (filteredQuizIds) {
                                filteredQuizIds = new Set(
                                    searchMatches.filter((id) => filteredQuizIds!.has(id)),
                                );
                            } else {
                                filteredQuizIds = new Set(searchMatches);
                            }
                        }

                        const quizzes = filteredQuizIds
                            ? allQuizzes.filter((q) => filteredQuizIds!.has(q.id))
                            : allQuizzes;

                        return quizzes.map((quiz) => {
                            const quizQuestionTypes = allQuestions
                                .filter((q) => q.quizId === quiz.id)
                                .map((q) => q.type);

                            const quizTagIds = allQuizTags
                                .filter((qt) => qt.quizId === quiz.id)
                                .map((qt) => qt.tagId);

                            const quizTagNames = allTags.filter((t) =>
                                quizTagIds.includes(t.id),
                            );

                            return {
                                id: quiz.id,
                                title: quiz.title,
                                description: quiz.description,
                                questionCount: quizQuestionTypes.length,
                                tags: quizTagNames.map((t) => ({
                                    name: t.name,
                                    slug: t.slug,
                                })),
                                typeBreakdown: {
                                    multipleChoice: quizQuestionTypes.filter(
                                        (t) => t === "multiple_choice",
                                    ).length,
                                    fillIn: quizQuestionTypes.filter(
                                        (t) => t === "fill_in",
                                    ).length,
                                    open: quizQuestionTypes.filter(
                                        (t) => t === "open",
                                    ).length,
                                    placeholder: quizQuestionTypes.filter(
                                        (t) => t === "placeholder",
                                    ).length,
                                },
                            } satisfies QuizSummary;
                        });
                    }),

                createQuiz: (data) =>
                    wrapDb("createQuiz", async () => {
                        const id = nanoid(10);
                        await db.insert(schema.quizzes).values({
                            id,
                            title: data.title,
                            description: data.description ?? null,
                        });
                        return id;
                    }),

                updateQuiz: (id, data) =>
                    Effect.gen(function* () {
                        const existing = yield* wrapDb("updateQuiz.check", () =>
                            db
                                .select({ id: schema.quizzes.id })
                                .from(schema.quizzes)
                                .where(eq(schema.quizzes.id, id))
                                .get(),
                        );

                        if (!existing) {
                            return yield* new QuizNotFoundError({ id });
                        }

                        yield* wrapDb("updateQuiz.exec", async () => {
                            const updates: Record<string, unknown> = {
                                updatedAt: new Date().toISOString(),
                            };
                            if (data.title !== undefined) updates.title = data.title;
                            if (data.description !== undefined)
                                updates.description = data.description;

                            await db
                                .update(schema.quizzes)
                                .set(updates)
                                .where(eq(schema.quizzes.id, id));
                        });
                    }),

                deleteQuiz: (id) =>
                    Effect.gen(function* () {
                        const existing = yield* wrapDb("deleteQuiz.check", () =>
                            db
                                .select({ id: schema.quizzes.id })
                                .from(schema.quizzes)
                                .where(eq(schema.quizzes.id, id))
                                .get(),
                        );

                        if (!existing) {
                            return yield* new QuizNotFoundError({ id });
                        }

                        yield* wrapDb("deleteQuiz.exec", async () => {
                            await db
                                .delete(schema.quizzes)
                                .where(eq(schema.quizzes.id, id));
                        });
                    }),

                createQuestion: (quizId, data) =>
                    wrapDb("createQuestion", async () => {
                        const id = nanoid(10);
                        const maxSort = await db
                            .select({
                                max: sql<number>`coalesce(max(${schema.questions.sortOrder}), -1)`,
                            })
                            .from(schema.questions)
                            .where(eq(schema.questions.quizId, quizId))
                            .get();

                        await db.insert(schema.questions).values({
                            id,
                            quizId,
                            type: data.type,
                            text: data.text,
                            sortOrder: (maxSort?.max ?? -1) + 1,
                        });

                        if (data.type === "multiple_choice" && data.options) {
                            for (const [i, opt] of data.options.entries()) {
                                await db.insert(schema.answerOptions).values({
                                    id: nanoid(10),
                                    questionId: id,
                                    text: opt.text,
                                    isCorrect: opt.isCorrect,
                                    sortOrder: i,
                                });
                            }
                        }

                        if (data.type === "fill_in" && data.acceptedAnswers) {
                            for (const [i, ans] of data.acceptedAnswers.entries()) {
                                await db.insert(schema.acceptedAnswers).values({
                                    id: nanoid(10),
                                    questionId: id,
                                    pattern: ans.pattern,
                                    matchType: ans.matchType,
                                    caseInsensitive: ans.caseInsensitive,
                                    sortOrder: i,
                                });
                            }
                        }

                        return id;
                    }),

                updateQuestion: (id, data) =>
                    Effect.gen(function* () {
                        const existing = yield* wrapDb("updateQuestion.check", () =>
                            db
                                .select({ id: schema.questions.id })
                                .from(schema.questions)
                                .where(eq(schema.questions.id, id))
                                .get(),
                        );

                        if (!existing) {
                            return yield* new QuestionNotFoundError({ id });
                        }

                        yield* wrapDb("updateQuestion.exec", async () => {
                            await db
                                .update(schema.questions)
                                .set({ type: data.type, text: data.text })
                                .where(eq(schema.questions.id, id));

                            await db
                                .delete(schema.answerOptions)
                                .where(eq(schema.answerOptions.questionId, id));

                            await db
                                .delete(schema.acceptedAnswers)
                                .where(eq(schema.acceptedAnswers.questionId, id));

                            if (data.type === "multiple_choice" && data.options) {
                                for (const [i, opt] of data.options.entries()) {
                                    await db.insert(schema.answerOptions).values({
                                        id: nanoid(10),
                                        questionId: id,
                                        text: opt.text,
                                        isCorrect: opt.isCorrect,
                                        sortOrder: i,
                                    });
                                }
                            }

                            if (data.type === "fill_in" && data.acceptedAnswers) {
                                for (const [i, ans] of data.acceptedAnswers.entries()) {
                                    await db.insert(schema.acceptedAnswers).values({
                                        id: nanoid(10),
                                        questionId: id,
                                        pattern: ans.pattern,
                                        matchType: ans.matchType,
                                        caseInsensitive: ans.caseInsensitive,
                                        sortOrder: i,
                                    });
                                }
                            }
                        });
                    }),

                deleteQuestion: (id) =>
                    Effect.gen(function* () {
                        const existing = yield* wrapDb("deleteQuestion.check", () =>
                            db
                                .select({ id: schema.questions.id })
                                .from(schema.questions)
                                .where(eq(schema.questions.id, id))
                                .get(),
                        );

                        if (!existing) {
                            return yield* new QuestionNotFoundError({ id });
                        }

                        yield* wrapDb("deleteQuestion.exec", async () => {
                            await db
                                .delete(schema.questions)
                                .where(eq(schema.questions.id, id));
                        });
                    }),

                reorderQuestions: (quizId, orderedIds) =>
                    wrapDb("reorderQuestions", async () => {
                        for (const [index, id] of orderedIds.entries()) {
                            await db
                                .update(schema.questions)
                                .set({ sortOrder: index })
                                .where(eq(schema.questions.id, id));
                        }
                    }),

                listTags: () =>
                    wrapDb("listTags", async () => {
                        const allTags = await db
                            .select()
                            .from(schema.tags)
                            .orderBy(asc(schema.tags.name));

                        const allQuizTags = await db.select().from(schema.quizTags);

                        return allTags.map((tag) => ({
                            id: tag.id,
                            name: tag.name,
                            slug: tag.slug,
                            quizCount: allQuizTags.filter(
                                (qt) => qt.tagId === tag.id,
                            ).length,
                        })) satisfies TagWithCount[];
                    }),

                createTag: (name) =>
                    Effect.gen(function* () {
                        const slug = name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "");

                        const existing = yield* wrapDb("createTag.check", () =>
                            db
                                .select({ id: schema.tags.id })
                                .from(schema.tags)
                                .where(eq(schema.tags.slug, slug))
                                .get(),
                        );

                        if (existing) {
                            return yield* new DuplicateTagError({ name });
                        }

                        const id = nanoid(10);
                        yield* wrapDb("createTag.exec", async () => {
                            await db.insert(schema.tags).values({
                                id,
                                name,
                                slug,
                            });
                        });

                        return id;
                    }),

                deleteTag: (id) =>
                    Effect.gen(function* () {
                        const existing = yield* wrapDb("deleteTag.check", () =>
                            db
                                .select({ id: schema.tags.id })
                                .from(schema.tags)
                                .where(eq(schema.tags.id, id))
                                .get(),
                        );

                        if (!existing) {
                            return yield* new TagNotFoundError({ id });
                        }

                        yield* wrapDb("deleteTag.exec", async () => {
                            await db
                                .delete(schema.tags)
                                .where(eq(schema.tags.id, id));
                        });
                    }),

                setQuizTags: (quizId, tagIds) =>
                    wrapDb("setQuizTags", async () => {
                        await db
                            .delete(schema.quizTags)
                            .where(eq(schema.quizTags.quizId, quizId));

                        for (const tagId of tagIds) {
                            await db.insert(schema.quizTags).values({
                                quizId,
                                tagId,
                            });
                        }
                    }),
            } satisfies QuizDbShape;
        });
}
