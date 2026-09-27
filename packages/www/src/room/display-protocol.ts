import { Schema } from "effect";
import { roomPhaseSchema, gameTypeSchema } from "~/game";
import { pokerTableViewSchema } from "~/game/poker/table-view";

import { flip7TableViewSchema } from "~/game/flip-7/table-view";
import { blackjackTableViewSchema } from "~/game/blackjack/table-view";
import { perudoTableViewSchema } from "~/game/perudo/table-view";

export const partyGameSchema = Schema.Union([
    Schema.Struct({
        type: Schema.Literal("flip_7"),
        view: flip7TableViewSchema,
    }),
    Schema.Struct({
        type: Schema.Literal("blackjack"),
        view: blackjackTableViewSchema,
    }),
    Schema.Struct({
        type: Schema.Literal("perudo"),
        view: perudoTableViewSchema,
    }),
]);

export const displayStateSchema = Schema.Struct({
    phase: roomPhaseSchema,
    selectedGameType: gameTypeSchema,
    activeGameType: Schema.NullOr(gameTypeSchema),
    players: Schema.Array(
        Schema.Struct({ id: Schema.String, name: Schema.String }),
    ),
    poker: Schema.NullOr(pokerTableViewSchema),
    game: Schema.optionalKey(Schema.NullOr(partyGameSchema)),
});

export const displayMessageSchema = Schema.Struct({
    type: Schema.Literal("display:state"),
    data: displayStateSchema,
});

export type DisplayState = typeof displayStateSchema.Type;

export type PartyGame = typeof partyGameSchema.Type;
