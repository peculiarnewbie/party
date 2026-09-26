import { Effect, Layer } from "effect";
import { HttpEffect } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";
import {
    AuthenticationError,
    QuizNotFoundError,
    ServiceUnavailableError,
} from "~/errors";
import type { DatabaseError } from "~/errors";
import { QuizDb } from "~/services/quiz-db";
import { AdminOnly, QuizApi } from "./contract";

function publicResult<A, E>(program: Effect.Effect<A, E | DatabaseError>) {
    return program.pipe(
        Effect.catchTag("DatabaseError", (error) =>
            Effect.logError("quiz.database.failed", error).pipe(
                Effect.andThen(Effect.fail(new ServiceUnavailableError())),
            ),
        ),
    );
}

export function makeQuizRpcHandler(
    database: Layer.Layer<QuizDb>,
    authenticated: boolean,
) {
    const handlers = QuizApi.toLayer(
        Effect.gen(function* () {
            const db = yield* QuizDb;
            return {
                listQuizzes: () => publicResult(db.listQuizzes()),
                getQuiz: (id) =>
                    publicResult(
                        Effect.gen(function* () {
                            const quiz = yield* db.getQuiz(id);
                            return (
                                quiz ?? (yield* new QuizNotFoundError({ id }))
                            );
                        }),
                    ),
                createQuiz: (data) => publicResult(db.createQuiz(data)),
                updateQuiz: (data) =>
                    publicResult(db.updateQuiz(data.id, data)),
                deleteQuiz: (id) => publicResult(db.deleteQuiz(id)),
                createQuestion: (data) =>
                    publicResult(db.createQuestion(data.quizId, data)),
                updateQuestion: (data) =>
                    publicResult(db.updateQuestion(data.questionId, data)),
                deleteQuestion: (id) => publicResult(db.deleteQuestion(id)),
                reorderQuestions: (data) =>
                    publicResult(
                        db.reorderQuestions(data.quizId, data.orderedIds),
                    ),
                listTags: () => publicResult(db.listTags()),
                createTag: (name) => publicResult(db.createTag(name)),
                deleteTag: (id) => publicResult(db.deleteTag(id)),
                setQuizTags: (data) =>
                    publicResult(db.setQuizTags(data.quizId, data.tagIds)),
                getAdminSession: () => Effect.succeed(authenticated),
            };
        }),
    ).pipe(Layer.provide(database));
    const authentication = Layer.succeed(AdminOnly)((effect) =>
        authenticated
            ? effect
            : Effect.fail(
                  new AuthenticationError({ message: "Please sign in again." }),
              ),
    );
    return HttpEffect.toWebHandler(
        RpcServer.toHttpEffect(QuizApi).pipe(
            Effect.flatMap((handle) => handle),
            Effect.provide([
                handlers,
                authentication,
                RpcSerialization.layerJson,
            ]),
        ),
    );
}
