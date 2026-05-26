import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { emptyDataSchema } from "~/game/shared/wire-schemas";

export const cheeseThiefClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cheese_thief:start_day")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cheese_thief:start_voting")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cheese_thief:cast_vote")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                targetId: Schema.mutableKey(Schema.String),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cheese_thief:reveal_votes")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cheese_thief:next_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export type CheeseThiefClientMessage = SchemaType<
    typeof cheeseThiefClientMessageSchema
>;

export {
    cheeseThiefServerMessageSchema,
    encodeCheeseThiefServerMessage,
    type CheeseThiefServerMessage,
} from "./schemas";

export function decodeCheeseThiefClientMessage(raw: unknown) {
    return decodeGameClientMessage(
        "cheese_thief",
        cheeseThiefClientMessageSchema,
        raw,
    );
}
