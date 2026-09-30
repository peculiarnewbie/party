import { sixNimmtTableViewSchema } from "~/game/six-nimmt/schemas";
import { Schema } from "effect";
import { roomPhaseSchema, gameTypeSchema, roomRecoverySchema } from "~/game";
import { pokerTableViewSchema } from "~/game/poker/table-view";

import { flip7TableViewSchema } from "~/game/flip-7/table-view";
import { blackjackTableViewSchema } from "~/game/blackjack/table-view";
import { perudoTableViewSchema } from "~/game/perudo/table-view";
import { herdTableViewSchema } from "~/game/herd/table-view";
import { funFactsTableViewSchema } from "~/game/fun-facts/table-view";
import { cheeseThiefTableViewSchema } from "~/game/cheese-thief/table-view";
import { cockroachPokerTableViewSchema } from "~/game/cockroach-poker/table-view";

export const partyGameSchema = Schema.Union([
    Schema.Struct({ type: Schema.Literal("cockroach_poker"), view: cockroachPokerTableViewSchema }),
    Schema.Struct({
        type: Schema.Literal("cheese_thief"),
        view: cheeseThiefTableViewSchema,
    }),
    Schema.Struct({ type: Schema.Literal("herd"), view: herdTableViewSchema }),
    Schema.Struct({
        type: Schema.Literal("fun_facts"),
        view: funFactsTableViewSchema,
    }),
    Schema.Struct({
        type: Schema.Literal("six_nimmt"),
        view: sixNimmtTableViewSchema,
    }),
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
    recovery: Schema.optionalKey(roomRecoverySchema),
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
