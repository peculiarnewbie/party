import { Schema } from "effect";

import {
    decodeUnknownSync,
    encodeJsonMessage,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { cardSchema, rankSchema } from "~/game/shared/card-schemas";

export const turnPhases = ["awaiting_ask", "go_fish", "turn_complete"] as const;
export const turnPhaseSchema = Schema.Literals(turnPhases);

export const goFishActionSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("ask")),
        askerId: Schema.mutableKey(Schema.String),
        targetId: Schema.mutableKey(Schema.String),
        rank: Schema.mutableKey(rankSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("draw")),
        playerId: Schema.mutableKey(Schema.String),
    }),
]);

export const goFishResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cards_given")),
        fromId: Schema.mutableKey(Schema.String),
        toId: Schema.mutableKey(Schema.String),
        rank: Schema.mutableKey(rankSchema),
        count: Schema.mutableKey(Schema.Number),
        bookMade: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish")),
        playerId: Schema.mutableKey(Schema.String),
        drewAskedRank: Schema.mutableKey(Schema.Boolean),
        bookMade: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        winners: Schema.mutableKey(Schema.mutable(Schema.Array(Schema.String))),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
]);

export const goFishPlayerViewSchema = Schema.Struct({
    myHand: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    drawPileCount: Schema.mutableKey(Schema.Number),
    currentPlayerId: Schema.mutableKey(Schema.String),
    turnPhase: Schema.mutableKey(turnPhaseSchema),
    players: Schema.mutableKey(
        Schema.mutable(
            Schema.Array(
                Schema.Struct({
                    id: Schema.mutableKey(Schema.String),
                    name: Schema.mutableKey(Schema.String),
                    cardCount: Schema.mutableKey(Schema.Number),
                    books: Schema.mutableKey(
                        Schema.mutable(Schema.Array(rankSchema)),
                    ),
                }),
            ),
        ),
    ),
    lastAction: Schema.mutableKey(Schema.NullOr(goFishActionSchema)),
    lastResult: Schema.mutableKey(Schema.NullOr(goFishResultSchema)),
    gameOver: Schema.mutableKey(Schema.Boolean),
    winner: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
});

export const goFishAskResultPayloadSchema = Schema.Union([
    Schema.Struct({
        error: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        askerId: Schema.mutableKey(Schema.String),
        askerName: Schema.mutableKey(Schema.String),
        targetId: Schema.mutableKey(Schema.String),
        rank: Schema.mutableKey(rankSchema),
        count: Schema.mutableKey(Schema.Number),
        success: Schema.mutableKey(Schema.Literal(true)),
        bookMade: Schema.mutableKey(Schema.Boolean),
    }),
    Schema.Struct({
        askerId: Schema.mutableKey(Schema.String),
        askerName: Schema.mutableKey(Schema.String),
        targetId: Schema.mutableKey(Schema.String),
        rank: Schema.mutableKey(rankSchema),
        success: Schema.mutableKey(Schema.Literal(false)),
    }),
]);

export const goFishDrawResultPayloadSchema = Schema.Union([
    Schema.Struct({
        error: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        drewAskedRank: Schema.mutableKey(Schema.Boolean),
        bookMade: Schema.mutableKey(Schema.Boolean),
    }),
]);

export const goFishBookMadePayloadSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    rank: Schema.mutableKey(rankSchema),
});

export const goFishGameOverPayloadSchema = Schema.Struct({
    winners: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
});

export const goFishServerMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:state")),
        data: Schema.mutableKey(goFishPlayerViewSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:ask_result")),
        data: Schema.mutableKey(goFishAskResultPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:draw_result")),
        data: Schema.mutableKey(goFishDrawResultPayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:book_made")),
        data: Schema.mutableKey(goFishBookMadePayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("go_fish:game_over")),
        data: Schema.mutableKey(goFishGameOverPayloadSchema),
    }),
]);

export type TurnPhase = SchemaType<typeof turnPhaseSchema>;
export type GoFishAction = SchemaType<typeof goFishActionSchema>;
export type GoFishResult = SchemaType<typeof goFishResultSchema>;
export type GoFishPlayerView = SchemaType<typeof goFishPlayerViewSchema>;
export type GoFishServerMessage = SchemaType<typeof goFishServerMessageSchema>;

export function decodeGoFishPlayerView(raw: unknown): GoFishPlayerView | null {
    try {
        return decodeUnknownSync(goFishPlayerViewSchema, raw);
    } catch {
        return null;
    }
}

export function encodeGoFishServerMessage(message: GoFishServerMessage): string {
    return encodeJsonMessage(goFishServerMessageSchema, message);
}
