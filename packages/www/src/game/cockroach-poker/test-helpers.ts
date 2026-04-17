import type {
    CockroachPokerPhase,
    CockroachPokerResult,
    CreatureType,
} from "./types";
import type {
    CockroachPokerPlayerInfo,
    CockroachPokerPlayerView,
    OfferChainView,
} from "./views";

export function makePlayerInfo(
    overrides: Partial<CockroachPokerPlayerInfo> = {},
): CockroachPokerPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        handCount: 8,
        faceUpCards: [],
        ...overrides,
    };
}

export function makeOfferChain(
    overrides: Partial<OfferChainView> = {},
): OfferChainView {
    return {
        originalOffererId: "p1",
        currentOffererId: "p1",
        currentReceiverId: "p2",
        currentClaim: "cockroach" as CreatureType,
        seenByPlayerIds: ["p1"],
        peekedCard: null,
        mustAccept: false,
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<CockroachPokerPlayerView> = {},
): CockroachPokerPlayerView {
    const players = overrides.players ?? [
        makePlayerInfo({ id: "p1", name: "Alice" }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
        makePlayerInfo({ id: "p3", name: "Carol" }),
    ];
    return {
        myId: "p1",
        phase: "offering" as CockroachPokerPhase,
        activePlayerId: "p1",
        isMyTurn: true,
        players,
        myHand: ["bat", "fly", "cockroach"] as CreatureType[],
        offerChain: null,
        loserId: null,
        loseReason: null,
        lastResult: null as CockroachPokerResult | null,
        validPassTargets: [],
        validOfferTargets:
            overrides.validOfferTargets ??
            players.filter((p) => p.id !== "p1").map((p) => p.id),
        ...overrides,
    };
}
