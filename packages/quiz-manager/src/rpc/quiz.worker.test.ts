import { applyD1Migrations, env, SELF } from "cloudflare:test";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { beforeAll, describe, expect, it } from "vitest";
import { QuizApi } from "./contract";
import { createSessionCookie, getSessionCookieName } from "~/worker/session";

declare global {
    namespace Cloudflare {
        interface Env {
            TEST_MIGRATIONS: D1Migration[];
        }
    }
}

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

const protocol = (cookie?: string) =>
    RpcClient.layerProtocolHttp({ url: "https://quiz.test/api/rpc" }).pipe(
        Layer.provide(
            FetchHttpClient.layer.pipe(
                Layer.provide(
                    Layer.succeed(FetchHttpClient.Fetch)((input, init) => {
                        const request = new Request(input, init);
                        request.headers.set("Origin", "https://quiz.test");
                        if (cookie) request.headers.set("Cookie", cookie);
                        return SELF.fetch(request);
                    }),
                ),
            ),
        ),
        Layer.provide(RpcSerialization.layerJson),
    );

async function adminCookie() {
    return `${getSessionCookieName()}=${await createSessionCookie(env.SESSION_SECRET)}`;
}

describe("quiz RPC over real Worker HTTP and D1", () => {
    it("rejects unauthenticated calls with a typed authentication error", async () => {
        const result = await Effect.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcClient.make(QuizApi);
                expect(yield* client.getAdminSession()).toBe(false);
                return yield* client.listQuizzes().pipe(Effect.flip);
            }).pipe(Effect.provide(protocol()), Effect.scoped),
        );
        expect(result._tag).toBe("AuthenticationError");
    });

    it("round-trips quizzes, questions, tags, and expected failures", async () => {
        const cookie = await adminCookie();
        await Effect.runPromise(
            Effect.gen(function* () {
                const client = yield* RpcClient.make(QuizApi);
                expect(yield* client.getAdminSession()).toBe(true);
                const quizId = yield* client.createQuiz({ title: "RPC quiz" });
                const questionId = yield* client.createQuestion({
                    quizId,
                    type: "open",
                    text: "Who?",
                });
                const tagName = `Test ${crypto.randomUUID()}`;
                const tagId = yield* client.createTag(tagName);
                yield* client.setQuizTags({ quizId, tagIds: [tagId] });
                const quiz = yield* client.getQuiz(quizId);
                expect(quiz.questions[0]).toMatchObject({
                    id: questionId,
                    text: "Who?",
                });
                expect(quiz.tags[0]).toMatchObject({
                    id: tagId,
                    name: tagName,
                });
                const duplicate = yield* client
                    .createTag(tagName)
                    .pipe(Effect.flip);
                expect(duplicate._tag).toBe("DuplicateTagError");
                yield* client.updateQuestion({
                    questionId,
                    type: "open",
                    text: "When?",
                });
                yield* client.reorderQuestions({
                    quizId,
                    orderedIds: [questionId],
                });
                yield* client.updateQuiz({ id: quizId, title: "Updated" });
                expect(
                    (yield* client.listQuizzes()).find(
                        (entry) => entry.id === quizId,
                    )?.title,
                ).toBe("Updated");
                expect(
                    (yield* client.listTags()).some((tag) => tag.id === tagId),
                ).toBe(true);
                yield* client.deleteQuestion(questionId);
                yield* client.deleteQuiz(quizId);
                yield* client.deleteTag(tagId);
                const missing = yield* client.getQuiz(quizId).pipe(Effect.flip);
                expect(missing._tag).toBe("QuizNotFoundError");
            }).pipe(Effect.provide(protocol(cookie)), Effect.scoped),
        );
    });

    it("rejects forged origins before executing RPC or login", async () => {
        for (const pathname of ["/api/rpc", "/login"]) {
            const response = await SELF.fetch(`https://quiz.test${pathname}`, {
                method: "POST",
                headers: { Origin: "https://attacker.test" },
                body: "{}",
            });
            expect(response.status).toBe(403);
        }
    });

    it("validates unknown RPC input on the server", async () => {
        const response = await SELF.fetch("https://quiz.test/api/rpc", {
            method: "POST",
            headers: {
                Origin: "https://quiz.test",
                Cookie: await adminCookie(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify([
                {
                    _tag: "Request",
                    id: "bad",
                    tag: "createQuiz",
                    payload: { title: 123 },
                    headers: [],
                },
            ]),
        });
        const body = await response.text();
        expect(body).toContain('"Failure"');
        expect(body).not.toContain('"Success"');
    });
});
