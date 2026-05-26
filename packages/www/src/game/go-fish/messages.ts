import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    GoFishMessageDecodeError,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { rankSchema } from "~/game/shared/card-schemas";

export const goFishClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:ask")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                targetId: Schema.mutableKey(Schema.String),
                rank: Schema.mutableKey(rankSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:draw")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(Schema.Struct({})),
    }),
]);

export type GoFishClientMessage = SchemaType<typeof goFishClientMessageSchema>;

export {
    encodeGoFishServerMessage,
    goFishServerMessageSchema,
    type GoFishServerMessage,
} from "./schemas";

export function decodeGoFishClientMessage(
    raw: unknown,
): Effect.Effect<GoFishClientMessage, GoFishMessageDecodeError, never> {
    return decodeWithSchema(goFishClientMessageSchema, raw, (issue, value) => {
        return new GoFishMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}
