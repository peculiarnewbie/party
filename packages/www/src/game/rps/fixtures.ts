import { RpsFixtureHarness } from "~/components/rps/rps-fixture-harness";
import type { GameFixtureModule } from "~/game/fixture-module";
import { makeMatch, makePlayerInfo, makeRound, makeThrow, makeView } from "./test-helpers";
import type { RpsPlayerView } from "./views";

export const RPS_FIXTURE_IDS = [
    "standard-my-turn",
    "round-results",
    "tournament-over",
    "bye-round",
] as const;

export type RpsFixtureId = (typeof RPS_FIXTURE_IDS)[number];

export interface RpsFixture {
    id: RpsFixtureId;
    roomId: string;
    title: string;
    hostPlayerId: string;
    primaryPlayerId: string;
    description: string;
    view: RpsPlayerView;
}

const RPS_FIXTURES: Record<RpsFixtureId, RpsFixture> = {
    "standard-my-turn": {
        id: "standard-my-turn",
        roomId: "fixture-rps-standard",
        title: "RPS Tournament",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Player needs to throw in a BO3 match.",
        view: makeView({
            myId: "p1",
            phase: "throwing",
            bestOf: 3,
            currentRound: 1,
            totalRounds: 1,
            needsToThrow: true,
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", eliminated: false }),
                makePlayerInfo({ id: "p2", name: "Bob", eliminated: false }),
            ],
            myMatch: makeMatch({
                player1: makePlayerInfo({ id: "p1", name: "Alice" }),
                player2: makePlayerInfo({ id: "p2", name: "Bob" }),
                player1Wins: 0,
                player2Wins: 0,
                myChoice: null,
                opponentHasThrown: false,
                isMyMatch: true,
                status: "active",
            }),
            rounds: [
                makeRound({
                    roundNumber: 1,
                    label: "FINAL",
                    matches: [
                        makeMatch({
                            player1: makePlayerInfo({ id: "p1", name: "Alice" }),
                            player2: makePlayerInfo({ id: "p2", name: "Bob" }),
                            player1Wins: 0,
                            player2Wins: 0,
                            myChoice: null,
                            opponentHasThrown: false,
                            isMyMatch: true,
                            status: "active",
                        }),
                    ],
                }),
            ],
        }),
    },
    "round-results": {
        id: "round-results",
        roomId: "fixture-rps-results",
        title: "RPS Tournament",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Round is complete showing match results. Host can advance.",
        view: makeView({
            myId: "p1",
            phase: "round_results",
            bestOf: 1,
            currentRound: 1,
            totalRounds: 2,
            needsToThrow: false,
            winnerId: null,
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", eliminated: false }),
                makePlayerInfo({ id: "p2", name: "Bob", eliminated: false }),
                makePlayerInfo({ id: "p3", name: "Cara", eliminated: false }),
                makePlayerInfo({ id: "p4", name: "Dana", eliminated: false }),
            ],
            rounds: [
                makeRound({
                    roundNumber: 1,
                    label: "SEMIFINAL",
                    matches: [
                        makeMatch({
                            player1: makePlayerInfo({ id: "p1", name: "Alice" }),
                            player2: makePlayerInfo({ id: "p2", name: "Bob" }),
                            player1Wins: 1,
                            player2Wins: 0,
                            throws: [
                                makeThrow({
                                    player1Choice: "rock",
                                    player2Choice: "scissors",
                                    winnerId: "p1",
                                }),
                            ],
                            winnerId: "p1",
                            status: "complete",
                            isMyMatch: true,
                        }),
                        makeMatch({
                            player1: makePlayerInfo({ id: "p3", name: "Cara" }),
                            player2: makePlayerInfo({ id: "p4", name: "Dana" }),
                            player1Wins: 0,
                            player2Wins: 1,
                            throws: [
                                makeThrow({
                                    player1Choice: "paper",
                                    player2Choice: "scissors",
                                    winnerId: "p4",
                                }),
                            ],
                            winnerId: "p4",
                            status: "complete",
                            isMyMatch: false,
                        }),
                    ],
                }),
                makeRound({
                    roundNumber: 2,
                    label: "FINAL",
                    matches: [],
                }),
            ],
        }),
    },
    "tournament-over": {
        id: "tournament-over",
        roomId: "fixture-rps-over",
        title: "RPS Tournament",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Tournament is over. Host sees champion and return button.",
        view: makeView({
            myId: "p1",
            phase: "tournament_over",
            bestOf: 1,
            currentRound: 2,
            totalRounds: 2,
            needsToThrow: false,
            winnerId: "p1",
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", eliminated: false }),
                makePlayerInfo({ id: "p2", name: "Bob", eliminated: true }),
                makePlayerInfo({ id: "p3", name: "Cara", eliminated: true }),
                makePlayerInfo({ id: "p4", name: "Dana", eliminated: true }),
            ],
            rounds: [
                makeRound({
                    roundNumber: 1,
                    label: "SEMIFINAL",
                    matches: [
                        makeMatch({
                            player1: makePlayerInfo({ id: "p1", name: "Alice" }),
                            player2: makePlayerInfo({ id: "p2", name: "Bob" }),
                            player1Wins: 1,
                            player2Wins: 0,
                            winnerId: "p1",
                            status: "complete",
                            isMyMatch: true,
                        }),
                        makeMatch({
                            player1: makePlayerInfo({ id: "p3", name: "Cara" }),
                            player2: makePlayerInfo({ id: "p4", name: "Dana" }),
                            player1Wins: 0,
                            player2Wins: 1,
                            winnerId: "p4",
                            status: "complete",
                            isMyMatch: false,
                        }),
                    ],
                }),
                makeRound({
                    roundNumber: 2,
                    label: "FINAL",
                    matches: [
                        makeMatch({
                            player1: makePlayerInfo({ id: "p1", name: "Alice" }),
                            player2: makePlayerInfo({ id: "p4", name: "Dana" }),
                            player1Wins: 1,
                            player2Wins: 0,
                            throws: [
                                makeThrow({
                                    player1Choice: "rock",
                                    player2Choice: "scissors",
                                    winnerId: "p1",
                                }),
                            ],
                            winnerId: "p1",
                            status: "complete",
                            isMyMatch: true,
                        }),
                    ],
                }),
            ],
        }),
    },
    "bye-round": {
        id: "bye-round",
        roomId: "fixture-rps-bye",
        title: "RPS Tournament",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Player has a bye this round in a 3-player tournament.",
        view: makeView({
            myId: "p1",
            phase: "throwing",
            bestOf: 1,
            currentRound: 1,
            totalRounds: 2,
            needsToThrow: false,
            winnerId: null,
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", eliminated: false }),
                makePlayerInfo({ id: "p2", name: "Bob", eliminated: false }),
                makePlayerInfo({ id: "p3", name: "Cara", eliminated: false }),
            ],
            myMatch: null,
            rounds: [
                makeRound({
                    roundNumber: 1,
                    label: "SEMIFINAL",
                    matches: [
                        makeMatch({
                            player1: makePlayerInfo({ id: "p2", name: "Bob" }),
                            player2: makePlayerInfo({ id: "p3", name: "Cara" }),
                            player1Wins: 0,
                            player2Wins: 0,
                            myChoice: null,
                            opponentHasThrown: false,
                            isMyMatch: false,
                            status: "active",
                        }),
                    ],
                    byePlayer: makePlayerInfo({ id: "p1", name: "Alice", eliminated: false }),
                }),
                makeRound({
                    roundNumber: 2,
                    label: "FINAL",
                    matches: [],
                }),
            ],
        }),
    },
};

const FIXTURE_PLAYER_IDS = ["p1", "p2", "p3", "p4"] as const;

export function getRpsFixture(fixtureId: RpsFixtureId) {
    return RPS_FIXTURES[fixtureId];
}

export function getDefaultFixturePlayerId(fixtureId: RpsFixtureId) {
    return RPS_FIXTURES[fixtureId].primaryPlayerId;
}

export function getFixturePlayerIds(): string[] {
    return [...FIXTURE_PLAYER_IDS];
}

export const gameFixtureModule: GameFixtureModule<RpsFixtureId> = {
    game: "rps",
    title: "RPS",
    fixtures: RPS_FIXTURES,
    defaultFixtureId: "standard-my-turn",
    playerIds: FIXTURE_PLAYER_IDS,
    Harness: RpsFixtureHarness,
};
