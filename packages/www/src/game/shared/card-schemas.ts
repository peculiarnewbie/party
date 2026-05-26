import { Schema } from "effect";

import { RANKS, SUITS } from "~/assets/card-deck/types";

export const suitSchema = Schema.Literals(SUITS);
export const rankSchema = Schema.Literals(RANKS);

export const cardSchema = Schema.Struct({
    suit: Schema.mutableKey(suitSchema),
    rank: Schema.mutableKey(rankSchema),
});

export const rankIntSchema = Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(13),
);
