import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import {
    emptyDataSchema,
    serverMessageWithData,
    unknownRecordSchema,
} from "~/game/shared/wire-schemas";

export const rpsChoices = ["rock", "paper", "scissors"] as const;
export const rpsBestOfValues = [1, 3, 5] as const;

export const rpsClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rps:throw")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                choice: Schema.mutableKey(Schema.Literals(rpsChoices)),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rps:next_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rps:set_best_of")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                bestOf: Schema.mutableKey(Schema.Literals(rpsBestOfValues)),
            }),
        ),
    }),
]);

export const rpsServerMessageSchema = Schema.Union([
    serverMessageWithData("rps:state", unknownRecordSchema),
    serverMessageWithData("rps:action", unknownRecordSchema),
    serverMessageWithData("rps:game_over", unknownRecordSchema),
    serverMessageWithData("rps:error", unknownRecordSchema),
]);

export type RpsClientMessage = SchemaType<typeof rpsClientMessageSchema>;
export type RpsServerMessage = SchemaType<typeof rpsServerMessageSchema>;

export function decodeRpsClientMessage(raw: unknown) {
    return decodeGameClientMessage("rps", rpsClientMessageSchema, raw);
}
