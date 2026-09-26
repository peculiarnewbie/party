import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import {
    RpcClient,
    RpcSerialization,
    type RpcClientError,
} from "effect/unstable/rpc";
import { createMemo, createSignal, onCleanup } from "solid-js";
import { QuizApi } from "./contract";

export const quizProtocol = (url: string) =>
    RpcClient.layerProtocolHttp({ url }).pipe(
        Layer.provide(FetchHttpClient.layer),
        Layer.provide(RpcSerialization.layerJson),
    );

export function callQuiz<A, E>(
    operation: (
        client: RpcClient.FromGroup<
            typeof QuizApi,
            RpcClientError.RpcClientError
        >,
    ) => Effect.Effect<A, E>,
) {
    return Effect.gen(function* () {
        const client = yield* RpcClient.make(QuizApi);
        return yield* operation(client);
    }).pipe(Effect.provide(quizProtocol("/api/rpc")), Effect.scoped);
}

export function runQuiz<A, E>(
    operation: (
        client: RpcClient.FromGroup<
            typeof QuizApi,
            RpcClientError.RpcClientError
        >,
    ) => Effect.Effect<A, E>,
    signal?: AbortSignal,
) {
    return Effect.runPromise(callQuiz(operation), { signal });
}

export function createQuizQuery<A, E>(program: () => Effect.Effect<A, E>) {
    return createMemo(() => {
        const controller = new AbortController();
        onCleanup(() => controller.abort());
        return Effect.runPromise(program(), { signal: controller.signal });
    });
}

export function createQuizActions() {
    const [pending, setPending] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const lifetime = new AbortController();
    let running = false;
    onCleanup(() => lifetime.abort());

    function run<A, E>(
        program: Effect.Effect<A, E>,
        onSuccess: (value: A) => void = () => {},
    ) {
        if (running || lifetime.signal.aborted) return;
        running = true;
        setPending(true);
        setError(null);
        Effect.runFork(
            program.pipe(
                Effect.match({
                    onSuccess,
                    onFailure: (failure) => setError(quizErrorMessage(failure)),
                }),
                Effect.ensuring(
                    Effect.sync(() => {
                        running = false;
                        if (!lifetime.signal.aborted) setPending(false);
                    }),
                ),
            ),
            { signal: lifetime.signal },
        );
    }

    return { pending, error, run };
}

export function quizErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "_tag" in error) {
        switch (error._tag) {
            case "AuthenticationError":
                return "Please sign in again.";
            case "QuizNotFoundError":
                return "Quiz not found.";
            case "QuestionNotFoundError":
                return "Question not found.";
            case "TagNotFoundError":
                return "Tag not found.";
            case "DuplicateTagError":
                return "A tag with that name already exists.";
            case "SchemaError":
                return "Please check the values you entered.";
        }
    }
    return "The request could not be completed. Please try again.";
}
