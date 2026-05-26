import { Data, Effect, Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";

export class RoomMessageDecodeError extends Data.TaggedError(
    "RoomMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class YahtzeeMessageDecodeError extends Data.TaggedError(
    "YahtzeeMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class PokerMessageDecodeError extends Data.TaggedError(
    "PokerMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class GoFishMessageDecodeError extends Data.TaggedError(
    "GoFishMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class BlackjackMessageDecodeError extends Data.TaggedError(
    "BlackjackMessageDecodeError",
)<{
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class GameMessageDecodeError extends Data.TaggedError(
    "GameMessageDecodeError",
)<{
    readonly game: string;
    readonly issue: string;
    readonly messageType?: string;
}> {}

export class PersistedStateDecodeError extends Data.TaggedError(
    "PersistedStateDecodeError",
)<{
    readonly key: string;
    readonly issue: string;
    readonly fallback: string;
}> {}

export class StorageReadError extends Data.TaggedError("StorageReadError")<{
    readonly operation: string;
    readonly key?: string;
    readonly message: string;
}> {}

export class StorageWriteError extends Data.TaggedError("StorageWriteError")<{
    readonly operation: string;
    readonly key?: string;
    readonly message: string;
}> {}

export function formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export function extractMessageType(raw: unknown): string | undefined {
    if (
        typeof raw === "object" &&
        raw !== null &&
        "type" in raw &&
        typeof raw.type === "string"
    ) {
        return raw.type;
    }

    return undefined;
}

export function decodeWithSchema<S extends Schema.Top, E>(
    schema: S,
    raw: unknown,
    mapError: (issue: string, raw: unknown) => E,
): Effect.Effect<SchemaType<S>, E> {
    return Schema.decodeUnknownEffect(schema)(raw).pipe(
        Effect.mapError((error) => mapError(formatUnknownError(error), raw)),
    ) as Effect.Effect<SchemaType<S>, E>;
}

export function encodeWithSchema<S extends Schema.Top>(
    schema: S,
    value: SchemaType<S>,
): S["Encoded"] {
    return Schema.encodeUnknownSync(
        schema as unknown as Schema.Encoder<unknown>,
    )(value) as S["Encoded"];
}

export function encodeJsonMessage<S extends Schema.Top>(
    schema: S,
    value: SchemaType<S>,
): string {
    return JSON.stringify(encodeWithSchema(schema, value));
}

export function decodeJsonMessage<S extends Schema.Top>(
    schema: S,
    raw: string,
): SchemaType<S> {
    return Schema.decodeUnknownSync(
        Schema.fromJsonString(schema) as unknown as Schema.Decoder<unknown>,
    )(raw) as SchemaType<S>;
}

export function decodeUnknownSync<S extends Schema.Top>(
    schema: S,
    raw: unknown,
): SchemaType<S> {
    return Schema.decodeUnknownSync(
        schema as unknown as Schema.Decoder<unknown>,
    )(raw) as SchemaType<S>;
}

export function decodeGameClientMessage<S extends Schema.Top>(
    game: string,
    schema: S,
    raw: unknown,
): Effect.Effect<SchemaType<S>, GameMessageDecodeError, never> {
    return decodeWithSchema(schema, raw, (issue, value) => {
        return new GameMessageDecodeError({
            game,
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function decodeGameClientMessageOrNull<S extends Schema.Top>(
    game: string,
    schema: S,
    raw: unknown,
    context: {
        operation: string;
        component: string;
    },
): Effect.Effect<SchemaType<S> | null, never, never> {
    return decodeGameClientMessage(game, schema, raw).pipe(
        Effect.tap(() =>
            Effect.logInfo(context.operation).pipe(
                Effect.annotateLogs({
                    component: context.component,
                    operation: context.operation,
                    result: "success",
                }),
            ),
        ),
        Effect.catchTag("GameMessageDecodeError", (error) =>
            Effect.gen(function*() {
                yield* Effect.logWarning(context.operation).pipe(
                    Effect.annotateLogs({
                        component: context.component,
                        operation: context.operation,
                        result: "ignored",
                        errorTag: error._tag,
                        game: error.game,
                    }),
                );
                return null;
            }),
        ),
    );
}
