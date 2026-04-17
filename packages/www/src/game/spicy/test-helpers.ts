import type {
    SpiceType,
    SpicyCard,
    SpicyEndReason,
    SpicyFinalScore,
    SpicyResult,
} from "./types";
import type {
    SpicyPlayerInfo,
    SpicyPlayerView,
    SpicyStackTopView,
} from "./views";

export function standardCard(
    number: number,
    spice: SpiceType,
    id?: string,
): SpicyCard {
    return {
        id: id ?? `std-${number}-${spice}`,
        kind: "standard",
        number,
        spice,
    };
}

export function wildSpiceCard(id = "wild-spice-1"): SpicyCard {
    return { id, kind: "wild_spice" };
}

export function wildNumberCard(id = "wild-number-1"): SpicyCard {
    return { id, kind: "wild_number" };
}

export function makePlayerInfo(
    overrides: Partial<SpicyPlayerInfo> = {},
): SpicyPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        handCount: 6,
        wonCardCount: 0,
        trophies: 0,
        isCurrentPlayer: false,
        isPendingLastCard: false,
        ...overrides,
    };
}

export function makeStackTop(
    overrides: Partial<SpicyStackTopView> = {},
): SpicyStackTopView {
    return {
        ownerId: "p2",
        declaredNumber: 3,
        declaredSpice: "chili" as SpiceType,
        stackSize: 1,
        ...overrides,
    };
}

export function makeFinalScore(
    overrides: Partial<SpicyFinalScore> = {},
): SpicyFinalScore {
    return {
        playerId: "p1",
        points: 0,
        wonCardCount: 0,
        trophies: 0,
        handCount: 6,
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<SpicyPlayerView> = {},
): SpicyPlayerView {
    return {
        myId: "p1",
        phase: "playing",
        currentPlayerId: "p1",
        pendingLastCardPlayerId: null,
        safePassPlayerIds: [],
        trophiesRemaining: 3,
        players: [
            makePlayerInfo({ id: "p1", name: "Alice", isCurrentPlayer: true }),
            makePlayerInfo({ id: "p2", name: "Bob" }),
            makePlayerInfo({ id: "p3", name: "Carol" }),
        ],
        myHand: [
            standardCard(1, "chili"),
            standardCard(2, "wasabi"),
            standardCard(3, "pepper"),
        ],
        stackTop: null,
        isMyTurn: true,
        canPlayCard: true,
        canPass: true,
        canChallenge: false,
        canConfirmLastCard: false,
        allowedDeclarationNumbers: [1, 2, 3],
        allowedDeclarationSpices: ["chili", "wasabi", "pepper"] as SpiceType[],
        winners: null,
        endReason: null as SpicyEndReason | null,
        finalScores: null as SpicyFinalScore[] | null,
        lastPublicResult: null as SpicyResult | null,
        ...overrides,
    };
}
