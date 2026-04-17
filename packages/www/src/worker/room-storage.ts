import { Effect, Schema } from "effect";

import type {
    GameParticipant,
    GameParticipantStatus,
    GameState,
} from "~/game";
import type { BlackjackState } from "~/game/blackjack";
import type { CheeseThiefState } from "~/game/cheese-thief";
import type { CockroachPokerState } from "~/game/cockroach-poker";
import type { Flip7State } from "~/game/flip-7";
import type { FunFactsState } from "~/game/fun-facts";
import type { GoFishState } from "~/game/go-fish";
import type { HerdState } from "~/game/herd";
import type { PerudoState } from "~/game/perudo";
import type { PokerState } from "~/game/poker";
import type { RpsState } from "~/game/rps";
import type { SkullState } from "~/game/skull";
import type { SpicyState } from "~/game/spicy";
import type { YahtzeeState } from "~/game/yahtzee";
import {
    decodeWithSchema,
    encodeWithSchema,
    extractMessageType,
    formatUnknownError,
    PersistedStateDecodeError,
    StorageReadError,
    StorageWriteError,
} from "~/effect/schema-helpers";

export const ROOM_STATE_KEY = "room_state";
export const GAME_SNAPSHOT_KEY = "game_snapshot";

type PersistedValueRow = {
    value: string;
};

type PersistedParticipantRow = {
    player_id: string;
    status: GameParticipantStatus;
};

export type PersistedGameSnapshot =
    | {
          gameType: "go_fish";
          state: GoFishState;
      }
    | {
          gameType: "poker" | "backwards_poker";
          state: PokerState;
      }
    | {
          gameType: "blackjack";
          state: BlackjackState;
      }
    | {
          gameType: "yahtzee" | "lying_yahtzee";
          state: YahtzeeState;
      }
    | {
          gameType: "perudo";
          state: PerudoState;
      }
    | {
          gameType: "rps";
          state: RpsState;
      }
    | {
          gameType: "herd";
          state: HerdState;
      }
    | {
          gameType: "fun_facts";
          state: FunFactsState;
      }
    | {
          gameType: "cheese_thief";
          state: CheeseThiefState;
      }
    | {
          gameType: "cockroach_poker";
          state: CockroachPokerState;
      }
    | {
          gameType: "flip_7";
          state: Flip7State;
      }
    | {
          gameType: "skull";
          state: SkullState;
      }
    | {
          gameType: "spicy";
          state: SpicyState;
      };

const gameTypes = [
    "quiz",
    "go_fish",
    "poker",
    "backwards_poker",
    "blackjack",
    "yahtzee",
    "lying_yahtzee",
    "perudo",
    "rps",
    "herd",
    "fun_facts",
    "cheese_thief",
    "cockroach_poker",
    "flip_7",
    "skull",
    "spicy",
] as const;

const scoringCategories = [
    "ones",
    "twos",
    "threes",
    "fours",
    "fives",
    "sixes",
    "three_of_a_kind",
    "four_of_a_kind",
    "full_house",
    "small_straight",
    "large_straight",
    "yahtzee",
    "chance",
] as const;

const gameTypeSchema = Schema.Literals(gameTypes);
const roomPhaseSchema = Schema.Literals([
    "lobby",
    "playing",
    "hibernated",
] as const);
const participantStatusSchema = Schema.Literals([
    "active",
    "disconnected",
    "left_game",
] as const);
const scoringCategorySchema = Schema.Literals(scoringCategories);
const numberDieSchema = Schema.Number.check(
    Schema.isGreaterThanOrEqualTo(1),
    Schema.isLessThanOrEqualTo(6),
);
const diceSchema = Schema.mutable(
    Schema.Tuple([
        numberDieSchema,
        numberDieSchema,
        numberDieSchema,
        numberDieSchema,
        numberDieSchema,
    ]),
);
const heldDiceSchema = Schema.mutable(
    Schema.Tuple([
        Schema.Boolean,
        Schema.Boolean,
        Schema.Boolean,
        Schema.Boolean,
        Schema.Boolean,
    ]),
);

const playerSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    score: Schema.optionalKey(Schema.mutableKey(Schema.Number)),
});

const gameParticipantSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    status: Schema.mutableKey(participantStatusSchema),
});

const persistedParticipantRowSchema = Schema.Struct({
    player_id: Schema.mutableKey(Schema.String),
    status: Schema.mutableKey(participantStatusSchema),
});

const roomStateSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(playerSchema))),
    hostId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    answers: Schema.mutableKey(Schema.Record(Schema.String, Schema.String)),
    phase: Schema.mutableKey(roomPhaseSchema),
    selectedGameType: Schema.mutableKey(gameTypeSchema),
    activeGameType: Schema.mutableKey(Schema.NullOr(gameTypeSchema)),
    gameSessionId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    gameParticipants: Schema.mutableKey(
        Schema.mutable(Schema.Array(gameParticipantSchema)),
    ),
});

const partialRoomStateSchema = Schema.Struct({
    players: Schema.optionalKey(
        Schema.mutableKey(Schema.mutable(Schema.Array(playerSchema))),
    ),
    hostId: Schema.optionalKey(
        Schema.mutableKey(Schema.NullOr(Schema.String)),
    ),
    answers: Schema.optionalKey(
        Schema.mutableKey(Schema.Record(Schema.String, Schema.String)),
    ),
    phase: Schema.optionalKey(Schema.mutableKey(roomPhaseSchema)),
    selectedGameType: Schema.optionalKey(Schema.mutableKey(gameTypeSchema)),
    activeGameType: Schema.optionalKey(
        Schema.mutableKey(Schema.NullOr(gameTypeSchema)),
    ),
    gameSessionId: Schema.optionalKey(
        Schema.mutableKey(Schema.NullOr(Schema.String)),
    ),
    gameParticipants: Schema.optionalKey(
        Schema.mutableKey(Schema.mutable(Schema.Array(gameParticipantSchema))),
    ),
});

const partialScorecardSchema = Schema.Record(
    scoringCategorySchema,
    Schema.optionalKey(Schema.mutableKey(Schema.Number)),
);

const yahtzeePlayerSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    scorecard: Schema.mutableKey(partialScorecardSchema),
    yahtzeeBonus: Schema.mutableKey(Schema.Number),
    penaltyPoints: Schema.mutableKey(Schema.Number),
});

const lyingClaimSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    category: Schema.mutableKey(scoringCategorySchema),
    claimedDice: Schema.mutableKey(diceSchema),
    claimedPoints: Schema.mutableKey(Schema.Number),
});

const lyingTurnRevealSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    category: Schema.mutableKey(scoringCategorySchema),
    actualDice: Schema.mutableKey(diceSchema),
    claimedDice: Schema.mutableKey(diceSchema),
    claimedPoints: Schema.mutableKey(Schema.Number),
    outcome: Schema.mutableKey(
        Schema.Literals([
            "accepted",
            "truthful_challenge",
            "caught_lying",
        ] as const),
    ),
    penaltyPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    penaltyPoints: Schema.mutableKey(Schema.Number),
});

const yahtzeeStateSchema = Schema.Struct({
    mode: Schema.mutableKey(
        Schema.Literals(["standard", "lying"] as const),
    ),
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(yahtzeePlayerSchema)),
    ),
    currentPlayerIndex: Schema.mutableKey(Schema.Number),
    dice: Schema.mutableKey(diceSchema),
    held: Schema.mutableKey(heldDiceSchema),
    rollsLeft: Schema.mutableKey(Schema.Number),
    phase: Schema.mutableKey(
        Schema.Literals([
            "pre_roll",
            "mid_turn",
            "awaiting_response",
            "game_over",
        ] as const),
    ),
    round: Schema.mutableKey(Schema.Number),
    winners: Schema.mutableKey(Schema.NullOr(Schema.mutable(Schema.Array(Schema.String)))),
    pendingClaim: Schema.mutableKey(Schema.NullOr(lyingClaimSchema)),
    lastTurnReveal: Schema.mutableKey(Schema.NullOr(lyingTurnRevealSchema)),
});

function createLooseSnapshotSchema<GameType extends PersistedGameSnapshot["gameType"]>(
    gameType: GameType,
) {
    return Schema.Struct({
        gameType: Schema.mutableKey(Schema.Literal(gameType)),
        state: Schema.mutableKey(Schema.Unknown),
    });
}

const persistedGameSnapshotSchema = Schema.Union([
    createLooseSnapshotSchema("go_fish"),
    createLooseSnapshotSchema("poker"),
    createLooseSnapshotSchema("backwards_poker"),
    createLooseSnapshotSchema("blackjack"),
    Schema.Struct({
        gameType: Schema.mutableKey(Schema.Literal("yahtzee")),
        state: Schema.mutableKey(yahtzeeStateSchema),
    }),
    Schema.Struct({
        gameType: Schema.mutableKey(Schema.Literal("lying_yahtzee")),
        state: Schema.mutableKey(yahtzeeStateSchema),
    }),
    createLooseSnapshotSchema("perudo"),
    createLooseSnapshotSchema("rps"),
    createLooseSnapshotSchema("herd"),
    createLooseSnapshotSchema("fun_facts"),
    createLooseSnapshotSchema("cheese_thief"),
    createLooseSnapshotSchema("cockroach_poker"),
    createLooseSnapshotSchema("flip_7"),
    createLooseSnapshotSchema("skull"),
    createLooseSnapshotSchema("spicy"),
]);
const roomStateJsonSchema = Schema.fromJsonString(roomStateSchema);
const persistedGameSnapshotJsonSchema = Schema.fromJsonString(
    persistedGameSnapshotSchema,
);

function getSnapshotSchemaFor(
    activeGameType: GameState["activeGameType"],
): Schema.Top | null {
    if (!activeGameType) {
        return null;
    }

    if (activeGameType === "yahtzee" || activeGameType === "lying_yahtzee") {
        return Schema.Union([
            Schema.Struct({
                gameType: Schema.mutableKey(Schema.Literal(activeGameType)),
                state: Schema.mutableKey(yahtzeeStateSchema),
            }),
        ]);
    }

    return Schema.Union([
        Schema.Struct({
            gameType: Schema.mutableKey(Schema.Literal(activeGameType)),
            state: Schema.mutableKey(Schema.Unknown),
        }),
    ]);
}

function readMetaRow(ctx: DurableObjectState, key: string) {
    return Effect.try({
        try: () =>
            ctx.storage.sql
                .exec<PersistedValueRow>(
                    "SELECT value FROM kv WHERE key = ?",
                    key,
                )
                .toArray()[0] ?? null,
        catch: (error) =>
            new StorageReadError({
                operation: "readMetaRow",
                key,
                message: formatUnknownError(error),
            }),
    });
}

function writeMetaRow(ctx: DurableObjectState, key: string, value: string) {
    return Effect.try({
        try: () => {
            ctx.storage.sql.exec(
                "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)",
                key,
                value,
            );
        },
        catch: (error) =>
            new StorageWriteError({
                operation: "writeMetaRow",
                key,
                message: formatUnknownError(error),
            }),
    });
}

function deleteMetaRow(ctx: DurableObjectState, key: string) {
    return Effect.try({
        try: () => {
            ctx.storage.sql.exec("DELETE FROM kv WHERE key = ?", key);
        },
        catch: (error) =>
            new StorageWriteError({
                operation: "deleteMetaRow",
                key,
                message: formatUnknownError(error),
            }),
    });
}

function decodePersistedValue<A>(
    key: string,
    rawValue: string | null,
    schema: Schema.Top,
    fallback: A,
): Effect.Effect<A, never> {
    if (rawValue === null) {
        return Effect.succeed(fallback);
    }

    return decodeWithSchema(
        Schema.fromJsonString(schema),
        rawValue,
        (issue, raw) => {
            return new PersistedStateDecodeError({
                key,
                issue,
                fallback:
                    typeof raw === "string"
                        ? "fallback"
                        : extractMessageType(raw) ?? "fallback",
            });
        },
    ).pipe(
        Effect.catchTag("PersistedStateDecodeError", (error) =>
            Effect.gen(function*() {
                yield* Effect.logWarning("persisted-state.decode-fallback").pipe(
                    Effect.annotateLogs({
                        component: "room-storage",
                        operation: "game-room.snapshot.load",
                        key: error.key,
                        result: "fallback",
                        errorTag: error._tag,
                    }),
                );

                return fallback;
            }),
        ),
    ) as Effect.Effect<A, never>;
}

function readParticipants(
    ctx: DurableObjectState,
    sessionId: string,
): Effect.Effect<GameParticipant[], StorageReadError, never> {
    return Effect.try({
        try: () =>
            ctx.storage.sql
                .exec<PersistedParticipantRow>(
                    `
                        SELECT player_id, status
                        FROM game_participants
                        WHERE session_id = ?
                        ORDER BY joined_at ASC
                    `,
                    sessionId,
                )
                .toArray(),
        catch: (error) =>
            new StorageReadError({
                operation: "readParticipants",
                key: sessionId,
                message: formatUnknownError(error),
            }),
    }).pipe(
        Effect.flatMap((rows) =>
            decodeWithSchema(
                Schema.mutable(Schema.Array(persistedParticipantRowSchema)),
                rows,
                (issue) =>
                    new PersistedStateDecodeError({
                        key: "game_participants",
                        issue,
                        fallback: "empty_list",
                    }),
            ),
        ),
        Effect.map((rows) =>
            rows.map((row) => ({
                playerId: row.player_id,
                status: row.status,
            })),
        ),
        Effect.catchTag("PersistedStateDecodeError", (error) =>
            Effect.gen(function*() {
                yield* Effect.logWarning("persisted-participants.decode-fallback").pipe(
                    Effect.annotateLogs({
                        component: "room-storage",
                        operation: "game-room.snapshot.load",
                        key: error.key,
                        result: "fallback",
                        errorTag: error._tag,
                    }),
                );

                return [];
            }),
        ),
    );
}

function writeParticipants(
    ctx: DurableObjectState,
    sessionId: string,
    participants: GameParticipant[],
) {
    return Effect.try({
        try: () => {
            const now = Date.now();
            ctx.storage.sql.exec(
                "DELETE FROM game_participants WHERE session_id = ?",
                sessionId,
            );

            for (const [index, participant] of participants.entries()) {
                ctx.storage.sql.exec(
                    `
                        INSERT INTO game_participants (
                            session_id,
                            player_id,
                            status,
                            joined_at,
                            updated_at
                        ) VALUES (?, ?, ?, ?, ?)
                    `,
                    sessionId,
                    participant.playerId,
                    participant.status,
                    now + index,
                    now,
                );
            }
        },
        catch: (error) =>
            new StorageWriteError({
                operation: "writeParticipants",
                key: sessionId,
                message: formatUnknownError(error),
            }),
    });
}

function deleteAllParticipants(ctx: DurableObjectState) {
    return Effect.try({
        try: () => {
            ctx.storage.sql.exec("DELETE FROM game_participants");
        },
        catch: (error) =>
            new StorageWriteError({
                operation: "deleteAllParticipants",
                message: formatUnknownError(error),
            }),
    });
}

export function createDefaultState(): GameState {
    return {
        players: [],
        hostId: null,
        answers: {},
        phase: "lobby",
        selectedGameType: "quiz",
        activeGameType: null,
        gameSessionId: null,
        gameParticipants: [],
    };
}

export function ensureSchema(ctx: DurableObjectState) {
    return Effect.try({
        try: () => {
            ctx.storage.sql.exec(`
                CREATE TABLE IF NOT EXISTS kv (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `);
            ctx.storage.sql.exec(`
                CREATE TABLE IF NOT EXISTS game_participants (
                    session_id TEXT NOT NULL,
                    player_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    joined_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    PRIMARY KEY (session_id, player_id)
                )
            `);
        },
        catch: (error) =>
            new StorageWriteError({
                operation: "ensureSchema",
                message: formatUnknownError(error),
            }),
    });
}

export function loadRoomState(
    ctx: DurableObjectState,
): Effect.Effect<
    GameState,
    PersistedStateDecodeError | StorageReadError,
    never
> {
    return Effect.gen(function*() {
        const row = yield* readMetaRow(ctx, ROOM_STATE_KEY);
        const persisted = yield* decodePersistedValue<Partial<GameState>>(
            ROOM_STATE_KEY,
            row?.value ?? null,
            partialRoomStateSchema,
            {},
        );

        const state = {
            ...createDefaultState(),
            ...persisted,
            gameParticipants: [],
        } as GameState;

        if (state.gameSessionId) {
            state.gameParticipants = yield* readParticipants(
                ctx,
                state.gameSessionId,
            );
        }

        return state;
    });
}

export function persistRoomState(
    ctx: DurableObjectState,
    state: GameState,
): Effect.Effect<void, StorageWriteError, never> {
    return Effect.gen(function*() {
        const encodedState = encodeWithSchema(
            roomStateJsonSchema,
            state as typeof roomStateSchema.Type,
        );

        yield* writeMetaRow(ctx, ROOM_STATE_KEY, encodedState);

        if (state.gameSessionId) {
            yield* writeParticipants(
                ctx,
                state.gameSessionId,
                state.gameParticipants,
            );
            return;
        }

        yield* deleteAllParticipants(ctx);
    });
}

export function loadGameSnapshot(
    ctx: DurableObjectState,
    activeGameType: GameState["activeGameType"],
): Effect.Effect<
    PersistedGameSnapshot | null,
    PersistedStateDecodeError | StorageReadError,
    never
> {
    return Effect.gen(function*() {
        const schema = getSnapshotSchemaFor(activeGameType);
        if (!schema) {
            return null;
        }

        const row = yield* readMetaRow(ctx, GAME_SNAPSHOT_KEY);
        const snapshot = yield* decodePersistedValue<PersistedGameSnapshot | null>(
            GAME_SNAPSHOT_KEY,
            row?.value ?? null,
            schema,
            null,
        );

        return snapshot;
    });
}

export function persistGameSnapshot(
    ctx: DurableObjectState,
    snapshot: PersistedGameSnapshot | null,
): Effect.Effect<void, StorageWriteError, never> {
    if (!snapshot) {
        return deleteMetaRow(ctx, GAME_SNAPSHOT_KEY);
    }

    return Effect.gen(function*() {
        const encodedSnapshot = encodeWithSchema(
            persistedGameSnapshotJsonSchema,
            snapshot as typeof persistedGameSnapshotSchema.Type,
        );

        yield* writeMetaRow(ctx, GAME_SNAPSHOT_KEY, encodedSnapshot);
    });
}
