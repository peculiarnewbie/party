import { Cause, Effect } from "effect";

import type { EffectLogContext } from "./logger";
import { compactLogContext, effectLoggerLayer } from "./logger";

function withObservedContext<A, E, R>(
    program: Effect.Effect<A, E, R>,
    operation: string,
    context: EffectLogContext,
) {
    const annotations = compactLogContext({
        ...context,
        operation,
    });

    return Effect.gen(function*() {
        yield* Effect.annotateCurrentSpan(annotations);

        return yield* program.pipe(
            Effect.annotateLogs(annotations),
            Effect.withLogSpan(operation),
        );
    });
}

export function runObservedPromiseExit<A, E>(
    program: Effect.Effect<A, E, never>,
    operation: string,
    context: EffectLogContext,
) {
    const observed = withObservedContext(program, operation, context).pipe(
        Effect.catchCause((cause) =>
            Effect.gen(function*() {
                yield* Effect.logError(Cause.pretty(cause)).pipe(
                    Effect.annotateLogs(
                        compactLogContext({
                            ...context,
                            operation,
                            result: "failure",
                            errorTag: "Cause",
                        }),
                    ),
                );

                return yield* Effect.failCause(cause);
            }),
        ),
        Effect.provide(effectLoggerLayer),
    );

    return Effect.runPromiseExit(observed);
}

export function runObservedSync<A, E>(
    program: Effect.Effect<A, E, never>,
    operation: string,
    context: EffectLogContext,
) {
    return Effect.runSync(
        withObservedContext(program, operation, context).pipe(
            Effect.provide(effectLoggerLayer),
        ),
    );
}
