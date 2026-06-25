import { BlackjackFixtureHarness } from "~/components/blackjack/blackjack-fixture-harness";
import type { GameFixtureModule } from "~/game/fixture-module";
import {
    makeCard,
    makeDealer,
    makeHand,
    makePlayerInfo,
    makeView,
} from "./test-helpers";
import type { BlackjackPlayerView } from "./views";

export const BLACKJACK_FIXTURE_IDS = [
    "betting-phase",
    "my-turn-playing",
    "round-over",
    "insurance-prompt",
    "split-available",
] as const;

export type BlackjackFixtureId = (typeof BLACKJACK_FIXTURE_IDS)[number];

export interface BlackjackFixture {
    id: BlackjackFixtureId;
    roomId: string;
    title: string;
    hostPlayerId: string;
    primaryPlayerId: string;
    description: string;
    view: BlackjackPlayerView;
}

const BLACKJACK_FIXTURES: Record<BlackjackFixtureId, BlackjackFixture> = {
    "betting-phase": {
        id: "betting-phase",
        roomId: "fixture-bj-betting",
        title: "Blackjack",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Player needs to place a bet to start the round.",
        view: makeView({
            phase: "betting",
            myId: "p1",
            roundNumber: 1,
            needsBet: true,
            isMyTurn: false,
            canHit: false,
            canStand: false,
            canDouble: false,
            canSplit: false,
            needsInsurance: false,
            currentPlayerIndex: 0,
            dealer: makeDealer(),
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    chips: 1000,
                    bet: 0,
                    done: false,
                    hands: [],
                }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    chips: 800,
                    bet: 0,
                    done: false,
                    hands: [],
                }),
            ],
            results: null,
            shoeCount: 200,
        }),
    },
    "my-turn-playing": {
        id: "my-turn-playing",
        roomId: "fixture-bj-playing",
        title: "Blackjack",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "It is the player's turn. Can hit or stand.",
        view: makeView({
            phase: "playing",
            myId: "p1",
            roundNumber: 2,
            needsBet: false,
            isMyTurn: true,
            canHit: true,
            canStand: true,
            canDouble: true,
            canSplit: false,
            needsInsurance: false,
            currentPlayerIndex: 0,
            dealer: makeDealer({
                cards: [
                    makeCard(10, "spade"),
                    makeCard(6, "heart"),
                ],
                upCardValue: 10,
                value: null,
                busted: false,
            }),
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    chips: 950,
                    bet: 50,
                    done: false,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(8, "diamond"),
                                makeCard(7, "club"),
                            ],
                            bet: 50,
                            value: 15,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    chips: 750,
                    bet: 50,
                    done: false,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(10, "heart"),
                                makeCard(9, "spade"),
                            ],
                            bet: 50,
                            value: 19,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
            ],
            results: null,
            shoeCount: 196,
        }),
    },
    "round-over": {
        id: "round-over",
        roomId: "fixture-bj-over",
        title: "Blackjack",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Round is settled. Results are displayed.",
        view: makeView({
            phase: "settled",
            myId: "p1",
            roundNumber: 3,
            needsBet: false,
            isMyTurn: false,
            canHit: false,
            canStand: false,
            canDouble: false,
            canSplit: false,
            needsInsurance: false,
            currentPlayerIndex: 0,
            dealer: makeDealer({
                cards: [
                    makeCard(10, "spade"),
                    makeCard(7, "heart"),
                ],
                upCardValue: 10,
                value: 17,
                busted: false,
            }),
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    chips: 1050,
                    bet: 50,
                    done: true,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(10, "diamond"),
                                makeCard(10, "club"),
                            ],
                            bet: 50,
                            value: 20,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: true,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    chips: 700,
                    bet: 50,
                    done: true,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(10, "heart"),
                                makeCard(5, "spade"),
                                makeCard(9, "diamond"),
                            ],
                            bet: 50,
                            value: 24,
                            soft: false,
                            busted: true,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
            ],
            results: [
                {
                    playerId: "p1",
                    playerName: "Alice",
                    hands: [
                        {
                            handIndex: 0,
                            bet: 50,
                            payout: 100,
                            outcome: "win",
                        },
                    ],
                    insurancePayout: 0,
                    netChips: 50,
                },
                {
                    playerId: "p2",
                    playerName: "Bob",
                    hands: [
                        {
                            handIndex: 0,
                            bet: 50,
                            payout: 0,
                            outcome: "bust",
                        },
                    ],
                    insurancePayout: 0,
                    netChips: -50,
                },
            ],
            shoeCount: 190,
        }),
    },
    "insurance-prompt": {
        id: "insurance-prompt",
        roomId: "fixture-bj-insurance",
        title: "Blackjack",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Dealer shows an ace. Player must decide on insurance.",
        view: makeView({
            phase: "insurance",
            myId: "p1",
            roundNumber: 4,
            needsBet: false,
            isMyTurn: false,
            canHit: false,
            canStand: false,
            canDouble: false,
            canSplit: false,
            needsInsurance: true,
            currentPlayerIndex: 0,
            dealer: makeDealer({
                cards: [
                    makeCard(1, "spade"),
                    makeCard(6, "heart"),
                ],
                upCardValue: 11,
                value: null,
                busted: false,
            }),
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    chips: 950,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(10, "diamond"),
                                makeCard(9, "club"),
                            ],
                            bet: 50,
                            value: 19,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    chips: 750,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(7, "heart"),
                                makeCard(8, "spade"),
                            ],
                            bet: 50,
                            value: 15,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
            ],
            results: null,
            shoeCount: 194,
        }),
    },
    "split-available": {
        id: "split-available",
        roomId: "fixture-bj-split",
        title: "Blackjack",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Player has a pair and can split into two hands.",
        view: makeView({
            phase: "playing",
            myId: "p1",
            roundNumber: 5,
            needsBet: false,
            isMyTurn: true,
            canHit: true,
            canStand: true,
            canDouble: true,
            canSplit: true,
            needsInsurance: false,
            currentPlayerIndex: 0,
            dealer: makeDealer({
                cards: [
                    makeCard(6, "spade"),
                    makeCard(10, "heart"),
                ],
                upCardValue: 6,
                value: null,
                busted: false,
            }),
            players: [
                makePlayerInfo({
                    id: "p1",
                    name: "Alice",
                    chips: 900,
                    bet: 50,
                    done: false,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(8, "diamond"),
                                makeCard(8, "club"),
                            ],
                            bet: 50,
                            value: 16,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
                makePlayerInfo({
                    id: "p2",
                    name: "Bob",
                    chips: 750,
                    bet: 50,
                    done: false,
                    hands: [
                        makeHand({
                            cards: [
                                makeCard(10, "heart"),
                                makeCard(9, "spade"),
                            ],
                            bet: 50,
                            value: 19,
                            soft: false,
                            busted: false,
                            isBlackjack: false,
                            doubled: false,
                            stood: false,
                        }),
                    ],
                    currentHandIndex: 0,
                }),
            ],
            results: null,
            shoeCount: 192,
        }),
    },
};

const FIXTURE_PLAYER_IDS = ["p1", "p2"] as const;

export function getBlackjackFixture(fixtureId: BlackjackFixtureId) {
    return BLACKJACK_FIXTURES[fixtureId];
}

export function getDefaultFixturePlayerId(fixtureId: BlackjackFixtureId) {
    return BLACKJACK_FIXTURES[fixtureId].primaryPlayerId;
}

export function getFixturePlayerIds(): string[] {
    return [...FIXTURE_PLAYER_IDS];
}

export const gameFixtureModule: GameFixtureModule<BlackjackFixtureId> = {
    game: "blackjack",
    title: "Blackjack",
    fixtures: BLACKJACK_FIXTURES,
    defaultFixtureId: "betting-phase",
    playerIds: FIXTURE_PLAYER_IDS,
    Harness: BlackjackFixtureHarness,
};
