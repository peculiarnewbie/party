import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchemaWithoutGameOver,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";

export const cheeseThiefPhases = ["night", "day", "voting", "reveal"] as const;
export const playerRoles = ["thief", "sleepyhead"] as const;
export const winningTeams = ["thief", "sleepyheads"] as const;

const cheeseThiefPhaseSchema = Schema.Literals(cheeseThiefPhases);
const playerRoleSchema = Schema.Literals(playerRoles);
const winningTeamSchema = Schema.Literals(winningTeams);

const stringArrayRecordSchema = Schema.Record(
    Schema.String,
    Schema.mutable(Schema.Array(Schema.String)),
);
const stringRecordSchema = Schema.Record(Schema.String, Schema.String);
const numberRecordSchema = Schema.Record(Schema.String, Schema.Number);

const cheeseThiefPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    role: Schema.mutableKey(playerRoleSchema),
    dieValue: Schema.mutableKey(Schema.Number),
    isFollower: Schema.mutableKey(Schema.Boolean),
    score: Schema.mutableKey(Schema.Number),
});

export const voteResultSchema = Schema.Struct({
    votes: Schema.mutableKey(stringRecordSchema),
    voteCounts: Schema.mutableKey(numberRecordSchema),
    mostVotedIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    thiefCaught: Schema.mutableKey(Schema.Boolean),
    winningTeam: Schema.mutableKey(winningTeamSchema),
    thiefId: Schema.mutableKey(Schema.String),
    followerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
});

export const cheeseThiefStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(cheeseThiefPlayerStateSchema)),
    ),
    hostId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(cheeseThiefPhaseSchema),
    thiefId: Schema.mutableKey(Schema.String),
    followerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    observations: Schema.mutableKey(stringArrayRecordSchema),
    votes: Schema.mutableKey(stringRecordSchema),
    voteResult: Schema.mutableKey(Schema.NullOr(voteResultSchema)),
    round: Schema.mutableKey(Schema.Number),
});

const cheeseThiefPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    score: Schema.mutableKey(Schema.Number),
});

export const cheeseThiefPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    isHost: Schema.mutableKey(Schema.Boolean),
    phase: Schema.mutableKey(cheeseThiefPhaseSchema),
    round: Schema.mutableKey(Schema.Number),
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(cheeseThiefPlayerInfoSchema)),
    ),
    myRole: Schema.mutableKey(playerRoleSchema),
    myDieValue: Schema.mutableKey(Schema.Number),
    isFollower: Schema.mutableKey(Schema.Boolean),
    observedPlayerNames: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    observedPlayerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    myVote: Schema.mutableKey(Schema.NullOr(Schema.String)),
    votedCount: Schema.mutableKey(Schema.Number),
    totalVoters: Schema.mutableKey(Schema.Number),
    hasVoted: Schema.mutableKey(Schema.Boolean),
    voteResult: Schema.mutableKey(Schema.NullOr(voteResultSchema)),
    thiefName: Schema.mutableKey(Schema.NullOr(Schema.String)),
    followerNames: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    leaderboard: Schema.mutableKey(
        Schema.mutable(Schema.Array(cheeseThiefPlayerInfoSchema)),
    ),
});

export const cheeseThiefResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("day_started")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("voting_started")),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("vote_cast")),
        playerId: Schema.mutableKey(Schema.String),
        votedCount: Schema.mutableKey(Schema.Number),
        totalVoters: Schema.mutableKey(Schema.Number),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("votes_revealed")),
        result: Schema.mutableKey(voteResultSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("round_started")),
        round: Schema.mutableKey(Schema.Number),
    }),
]);

export const cheeseThiefServerMessageSchema =
    buildGameServerMessageSchemaWithoutGameOver({
        prefix: "cheese_thief",
        playerViewSchema: cheeseThiefPlayerViewSchema,
        actionSchema: cheeseThiefResultSchema,
    });

export type CheeseThiefPhase = SchemaType<typeof cheeseThiefPhaseSchema>;
export type PlayerRole = SchemaType<typeof playerRoleSchema>;
export type CheeseThiefPlayer = SchemaType<typeof cheeseThiefPlayerStateSchema>;
export type VoteResult = SchemaType<typeof voteResultSchema>;
export type CheeseThiefState = SchemaType<typeof cheeseThiefStateSchema>;
export type CheeseThiefPlayerInfo = SchemaType<typeof cheeseThiefPlayerInfoSchema>;
export type CheeseThiefPlayerView = SchemaType<typeof cheeseThiefPlayerViewSchema>;
export type CheeseThiefResult = SchemaType<typeof cheeseThiefResultSchema>;
export type CheeseThiefServerMessage = SchemaType<
    typeof cheeseThiefServerMessageSchema
>;

export type CheeseThiefSideMessage = Exclude<
    CheeseThiefServerMessage,
    { type: "cheese_thief:state" }
>;

export const decodeCheeseThiefPlayerView = createPlayerViewDecoder(
    cheeseThiefPlayerViewSchema,
);
export const decodeCheeseThiefSideMessage = createServerMessageDecoder(
    "cheese_thief:state",
    cheeseThiefServerMessageSchema,
);
export const encodeCheeseThiefServerMessage = (
    message: CheeseThiefServerMessage,
) => encodeGameServerMessage(cheeseThiefServerMessageSchema, message);
