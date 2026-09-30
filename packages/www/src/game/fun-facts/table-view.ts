import { Schema } from "effect";
import { funFactsPlayerViewSchema } from "./schemas";
import type { FunFactsState } from "./types";

export const funFactsTableViewSchema = Schema.Struct({
    phase: funFactsPlayerViewSchema.fields.phase,
    roundNumber: Schema.Number,
    totalRounds: Schema.Number,
    currentQuestion: Schema.NullOr(Schema.String),
    players: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            hasAnswered: Schema.Boolean,
        }),
    ),
    answeredCount: Schema.Number,
    placingOrder: funFactsPlayerViewSchema.fields.placingOrder,
    currentPlacerId: Schema.NullOr(Schema.String),
    placedArrows: funFactsPlayerViewSchema.fields.placedArrows,
    teamScore: Schema.Number,
    roundScores: Schema.Array(Schema.Number),
    maxScore: Schema.Number,
    roundResult: Schema.NullOr(
        Schema.Struct({
            pointsEarned: Schema.Number,
            correctArrows: Schema.Array(Schema.String),
            removedArrows: Schema.Array(Schema.String),
        }),
    ),
});

export type FunFactsTableView = typeof funFactsTableViewSchema.Type;

export function getFunFactsTableView(state: FunFactsState): FunFactsTableView {
    const result =
        state.phase === "reveal" || state.phase === "game_over"
            ? state.lastRoundResult
            : null;
    const showBoard = state.phase === "placing" || result !== null;
    const name = (id: string) =>
        state.players.find((player) => player.id === id)?.name ?? "Player";
    return {
        phase: state.phase,
        roundNumber: state.roundNumber,
        totalRounds: state.totalRounds,
        currentQuestion:
            state.phase === "waiting" ? null : state.currentQuestion,
        players: state.players.map(({ id, name }) => ({
            id,
            name,
            hasAnswered:
                state.phase === "answering" && state.answers[id] !== undefined,
        })),
        answeredCount:
            state.phase === "answering" ? Object.keys(state.answers).length : 0,
        placingOrder: showBoard
            ? state.placingOrder.map((id) => ({ id, name: name(id) }))
            : [],
        currentPlacerId:
            state.phase === "placing"
                ? (state.placingOrder[state.currentPlacerIndex] ?? null)
                : null,
        placedArrows: showBoard
            ? (result?.placedOrder ?? state.placedArrows).map((id) => ({
                  playerId: id,
                  playerName: name(id),
                  answer: result?.answers[id] ?? null,
              }))
            : [],
        teamScore: state.teamScore,
        roundScores: [...state.roundScores],
        maxScore: state.totalRounds * state.players.length,
        roundResult: result
            ? {
                  pointsEarned: result.pointsEarned,
                  correctArrows: [...result.correctArrows],
                  removedArrows: [...result.removedArrows],
              }
            : null,
    };
}
