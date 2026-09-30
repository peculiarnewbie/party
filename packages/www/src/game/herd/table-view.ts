import { Schema } from "effect";
import { herdPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { HerdState } from "./types";

export const herdTableViewSchema = Schema.Struct({
    phase: herdPlayerViewSchema.fields.phase,
    roundNumber: Schema.Number,
    currentQuestion: Schema.NullOr(Schema.String),
    players: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            score: Schema.Number,
            hasPinkCow: Schema.Boolean,
            hasAnswered: Schema.Boolean,
        }),
    ),
    answeredCount: Schema.Number,
    answerGroups: herdPlayerViewSchema.fields.answerGroups,
    leaderboard: herdPlayerViewSchema.fields.leaderboard,
    pinkCowEnabled: Schema.Boolean,
    pinkCowHolderId: Schema.NullOr(Schema.String),
    winnerId: Schema.NullOr(Schema.String),
    winScore: Schema.Number,
    roundResult: Schema.NullOr(
        Schema.Struct({
            majorityGroupId: Schema.NullOr(Schema.String),
            scoringPlayerIds: Schema.Array(Schema.String),
        }),
    ),
});

export type HerdTableView = typeof herdTableViewSchema.Type;

export function getHerdTableView(state: HerdState): HerdTableView {
    const view = getPlayerView(state, state.hostId);
    const result =
        state.phase === "scored" || state.phase === "game_over"
            ? state.lastRoundResult
            : null;
    return {
        phase: view.phase,
        roundNumber: view.roundNumber,
        currentQuestion:
            state.phase === "waiting" ? null : view.currentQuestion,
        players: view.players.map((player) => ({
            ...player,
            hasAnswered:
                state.phase === "answering" &&
                state.answers[player.id] !== undefined,
        })),
        answeredCount: state.phase === "answering" ? view.answeredCount : 0,
        answerGroups: state.phase === "waiting" ? [] : view.answerGroups,
        leaderboard: view.leaderboard,
        pinkCowEnabled: view.pinkCowEnabled,
        pinkCowHolderId: view.pinkCowHolderId,
        winnerId: view.winnerId,
        winScore: view.winScore,
        roundResult: result
            ? {
                  majorityGroupId: result.majorityGroupId,
                  scoringPlayerIds: [...result.scoringPlayerIds],
              }
            : null,
    };
}
