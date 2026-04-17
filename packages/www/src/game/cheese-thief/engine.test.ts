import { describe, it, expect } from "vitest";
import { initGame, processAction, removePlayer } from "./engine";
import type { CheeseThiefState } from "./types";

function makePlayers(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Player ${i + 1}`,
    }));
}

function findThief(state: CheeseThiefState) {
    return state.players.find((p) => p.role === "thief")!;
}

describe("initGame", () => {
    it("creates a game with correct number of players", () => {
        const state = initGame(makePlayers(5), "host1");
        expect(state.players.length).toBe(5);
        expect(state.phase).toBe("night");
        expect(state.round).toBe(1);
    });

    it("assigns exactly one thief", () => {
        const state = initGame(makePlayers(6), "host1");
        const thieves = state.players.filter((p) => p.role === "thief");
        expect(thieves.length).toBe(1);
        expect(state.thiefId).toBe(thieves[0].id);
    });

    it("thief always has die value 3", () => {
        for (let i = 0; i < 20; i++) {
            const state = initGame(makePlayers(6), "host1");
            const thief = findThief(state);
            expect(thief.dieValue).toBe(3);
        }
    });

    it("all die values are 1-6", () => {
        const state = initGame(makePlayers(8), "host1");
        for (const p of state.players) {
            expect(p.dieValue).toBeGreaterThanOrEqual(1);
            expect(p.dieValue).toBeLessThanOrEqual(6);
        }
    });

    it("marks followers correctly", () => {
        let foundFollower = false;
        for (let i = 0; i < 100; i++) {
            const state = initGame(makePlayers(8), "host1");
            for (const p of state.players) {
                if (p.role === "sleepyhead" && p.dieValue === 3) {
                    expect(p.isFollower).toBe(true);
                    expect(state.followerIds).toContain(p.id);
                    foundFollower = true;
                }
                if (p.role === "sleepyhead" && p.dieValue !== 3) {
                    expect(p.isFollower).toBe(false);
                }
            }
        }
        expect(foundFollower).toBe(true);
    });

    it("builds observations based on shared wake-up times", () => {
        const state = initGame(makePlayers(6), "host1");
        for (const p of state.players) {
            const obs = state.observations[p.id];
            expect(Array.isArray(obs)).toBe(true);
            for (const observedId of obs) {
                const other = state.players.find((o) => o.id === observedId);
                expect(other).toBeDefined();
                expect(other!.dieValue).toBe(p.dieValue);
            }
        }
    });

    it("initializes scores to 0", () => {
        const state = initGame(makePlayers(4), "host1");
        for (const p of state.players) {
            expect(p.score).toBe(0);
        }
    });
});

describe("phase transitions", () => {
    it("transitions night -> day", () => {
        const state = initGame(makePlayers(4), "host1");
        const result = processAction(state, {
            type: "start_day",
            hostId: "host1",
        });
        expect(result.type).toBe("day_started");
        expect(state.phase).toBe("day");
    });

    it("transitions day -> voting", () => {
        const state = initGame(makePlayers(4), "host1");
        processAction(state, { type: "start_day", hostId: "host1" });
        const result = processAction(state, {
            type: "start_voting",
            hostId: "host1",
        });
        expect(result.type).toBe("voting_started");
        expect(state.phase).toBe("voting");
    });

    it("rejects non-host phase advances", () => {
        const state = initGame(makePlayers(4), "host1");
        const result = processAction(state, {
            type: "start_day",
            hostId: "not_host",
        });
        expect(result.type).toBe("error");
        expect(state.phase).toBe("night");
    });

    it("rejects invalid phase transitions", () => {
        const state = initGame(makePlayers(4), "host1");
        const result = processAction(state, {
            type: "start_voting",
            hostId: "host1",
        });
        expect(result.type).toBe("error");
    });
});

describe("voting", () => {
    function setupVoting(playerCount: number) {
        const state = initGame(makePlayers(playerCount), "host1");
        processAction(state, { type: "start_day", hostId: "host1" });
        processAction(state, { type: "start_voting", hostId: "host1" });
        return state;
    }

    it("allows players to cast votes", () => {
        const state = setupVoting(4);
        const voter = state.players[0];
        const target = state.players[1];
        const result = processAction(state, {
            type: "cast_vote",
            playerId: voter.id,
            targetId: target.id,
        });
        expect(result.type).toBe("vote_cast");
        if (result.type === "vote_cast") {
            expect(result.votedCount).toBe(1);
            expect(result.totalVoters).toBe(4);
        }
    });

    it("prevents self-voting", () => {
        const state = setupVoting(4);
        const voter = state.players[0];
        const result = processAction(state, {
            type: "cast_vote",
            playerId: voter.id,
            targetId: voter.id,
        });
        expect(result.type).toBe("error");
    });

    it("allows changing vote", () => {
        const state = setupVoting(4);
        const voter = state.players[0];
        processAction(state, {
            type: "cast_vote",
            playerId: voter.id,
            targetId: state.players[1].id,
        });
        processAction(state, {
            type: "cast_vote",
            playerId: voter.id,
            targetId: state.players[2].id,
        });
        expect(state.votes[voter.id]).toBe(state.players[2].id);
    });

    it("reveals votes and determines winner", () => {
        const state = setupVoting(4);
        const thief = findThief(state);
        const sleepyheads = state.players.filter((p) => p.role === "sleepyhead");

        for (const p of sleepyheads) {
            processAction(state, {
                type: "cast_vote",
                playerId: p.id,
                targetId: thief.id,
            });
        }
        processAction(state, {
            type: "cast_vote",
            playerId: thief.id,
            targetId: sleepyheads[0].id,
        });

        const result = processAction(state, {
            type: "reveal_votes",
            hostId: "host1",
        });
        expect(result.type).toBe("votes_revealed");
        if (result.type === "votes_revealed") {
            expect(result.result.thiefCaught).toBe(true);
            expect(result.result.winningTeam).toBe("sleepyheads");
        }
        expect(state.phase).toBe("reveal");
    });

    it("thief wins when not most voted", () => {
        const state = setupVoting(5);
        const thief = findThief(state);
        const others = state.players.filter((p) => p.id !== thief.id);

        for (const p of state.players) {
            processAction(state, {
                type: "cast_vote",
                playerId: p.id,
                targetId: p.id === thief.id ? others[0].id : others[0].id,
            });
        }

        const result = processAction(state, {
            type: "reveal_votes",
            hostId: "host1",
        });
        if (result.type === "votes_revealed") {
            expect(result.result.thiefCaught).toBe(false);
            expect(result.result.winningTeam).toBe("thief");
        }
    });
});

describe("scoring", () => {
    function playRoundWithThiefCaught(state: CheeseThiefState) {
        processAction(state, { type: "start_day", hostId: "host1" });
        processAction(state, { type: "start_voting", hostId: "host1" });

        const thief = findThief(state);
        for (const p of state.players) {
            processAction(state, {
                type: "cast_vote",
                playerId: p.id,
                targetId: p.id === thief.id ? state.players.find((x) => x.id !== thief.id)!.id : thief.id,
            });
        }

        processAction(state, { type: "reveal_votes", hostId: "host1" });
    }

    it("awards points to sleepyheads when thief caught", () => {
        const state = initGame(makePlayers(4), "host1");
        playRoundWithThiefCaught(state);

        const thief = findThief(state);
        expect(thief.score).toBe(0);
        for (const p of state.players) {
            if (p.role === "sleepyhead" && !p.isFollower) {
                expect(p.score).toBe(1);
            }
        }
    });

    it("awards points to thief and followers when thief escapes", () => {
        const state = initGame(makePlayers(5), "host1");
        processAction(state, { type: "start_day", hostId: "host1" });
        processAction(state, { type: "start_voting", hostId: "host1" });

        const thief = findThief(state);
        const others = state.players.filter((p) => p.id !== thief.id);

        for (const p of state.players) {
            processAction(state, {
                type: "cast_vote",
                playerId: p.id,
                targetId: others[0].id,
            });
        }

        processAction(state, { type: "reveal_votes", hostId: "host1" });

        expect(thief.score).toBe(2);
        for (const fId of state.followerIds) {
            const follower = state.players.find((p) => p.id === fId);
            expect(follower!.score).toBe(1);
        }
    });
});

describe("next round", () => {
    it("starts a new round preserving scores", () => {
        const state = initGame(makePlayers(4), "host1");
        processAction(state, { type: "start_day", hostId: "host1" });
        processAction(state, { type: "start_voting", hostId: "host1" });

        const thief = findThief(state);
        for (const p of state.players) {
            processAction(state, {
                type: "cast_vote",
                playerId: p.id,
                targetId:
                    p.id === thief.id
                        ? state.players.find((x) => x.id !== thief.id)!.id
                        : thief.id,
            });
        }

        processAction(state, { type: "reveal_votes", hostId: "host1" });

        const scoresBeforeRound: Record<string, number> = {};
        for (const p of state.players) {
            scoresBeforeRound[p.id] = p.score;
        }

        const result = processAction(state, {
            type: "next_round",
            hostId: "host1",
        });
        expect(result.type).toBe("round_started");
        expect(state.phase).toBe("night");
        expect(state.round).toBe(2);
        expect(state.votes).toEqual({});
        expect(state.voteResult).toBeNull();

        for (const p of state.players) {
            expect(p.score).toBe(scoresBeforeRound[p.id]);
        }
    });
});

describe("removePlayer", () => {
    it("removes a player from the game", () => {
        const state = initGame(makePlayers(5), "host1");
        const toRemove = state.players[0].id;
        removePlayer(state, toRemove);
        expect(state.players.length).toBe(4);
        expect(state.players.find((p) => p.id === toRemove)).toBeUndefined();
    });

    it("ends game if fewer than 2 players remain", () => {
        const state = initGame(makePlayers(2), "host1");
        removePlayer(state, state.players[0].id);
        expect(state.phase).toBe("reveal");
    });
});
