import { Schema } from "effect";

export const emptyDataSchema = Schema.Struct({});

export const unknownRecordSchema = Schema.Record(
    Schema.String,
    Schema.Unknown,
);

export const positiveIntSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
);

export const nonNegativeIntSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
);

export const shortTextSchema = Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(200),
);

export function serverMessageWithData<S extends Schema.Top>(
    type: string,
    dataSchema: S,
) {
    return Schema.Struct({
        type: Schema.mutableKey(Schema.Literal(type)),
        data: Schema.mutableKey(dataSchema),
    });
}
