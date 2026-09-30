import { Schema } from "effect";
import { cheeseThiefPlayerViewSchema, voteResultSchema } from "./schemas";
import type { CheeseThiefState } from "./types";

export const cheeseThiefTableViewSchema = Schema.Struct({
    phase: cheeseThiefPlayerViewSchema.fields.phase,
    round: Schema.Number,
    players: cheeseThiefPlayerViewSchema.fields.players,
    votedCount: Schema.Number,
    totalVoters: Schema.Number,
    result: Schema.NullOr(voteResultSchema),
});

export type CheeseThiefTableView = typeof cheeseThiefTableViewSchema.Type;

export function getCheeseThiefTableView(
    state: CheeseThiefState,
): CheeseThiefTableView {
    const result = state.phase === "reveal" ? state.voteResult : null;
    return {
        phase: state.phase,
        round: state.round,
        players: state.players.map(({ id, name, score }) => ({
            id,
            name,
            score,
        })),
        votedCount:
            state.phase === "voting" ? Object.keys(state.votes).length : 0,
        totalVoters: state.players.length,
        result: result
            ? {
                  votes: { ...result.votes },
                  voteCounts: { ...result.voteCounts },
                  mostVotedIds: [...result.mostVotedIds],
                  thiefCaught: result.thiefCaught,
                  winningTeam: result.winningTeam,
                  thiefId: result.thiefId,
                  followerIds: [...result.followerIds],
              }
            : null,
    };
}
