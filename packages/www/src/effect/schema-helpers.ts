import { Data, Effect, Schema } from "effect";

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
): Effect.Effect<S["Type"], E> {
    return Schema.decodeUnknownEffect(schema)(raw).pipe(
        Effect.mapError((error) => mapError(formatUnknownError(error), raw)),
    ) as Effect.Effect<S["Type"], E>;
}

export function encodeWithSchema<S extends Schema.Top>(
    schema: S,
    value: S["Type"],
): S["Encoded"] {
    return Schema.encodeUnknownSync(
        schema as unknown as Schema.Encoder<unknown>,
    )(
        value,
    ) as S["Encoded"];
}
