import type {
    Flip7CardView,
    Flip7PlayerInfo,
    Flip7PlayerView,
    Flip7TargetChoiceView,
} from "./views";
import type { Flip7Phase } from "./types";

export function makePlayerInfo(
    overrides: Partial<Flip7PlayerInfo> = {},
): Flip7PlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        totalScore: 0,
        status: "active",
        roundScore: 0,
        uniqueNumberCount: 0,
        hasSecondChance: false,
        cards: [],
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<Flip7PlayerView> = {},
): Flip7PlayerView {
    return {
        myId: "p1",
        hostId: "p1",
        phase: "turn" as Flip7Phase,
        roundNumber: 1,
        targetScore: 200,
        dealerId: "p1",
        currentPlayerId: "p1",
        deckCount: 70,
        discardCount: 0,
        players: [
            makePlayerInfo({ id: "p1", name: "Alice" }),
            makePlayerInfo({ id: "p2", name: "Bob" }),
        ],
        targetChoice: null as Flip7TargetChoiceView | null,
        canHit: true,
        canStay: false,
        requiresMyTargetChoice: false,
        validTargetIds: [],
        lastRoundResult: null,
        winners: null,
        endedByHost: false,
        ...overrides,
    };
}

export function numberCard(value: number): Flip7CardView {
    return { kind: "number", label: `${value}`, value };
}

export function bonusCard(value: number): Flip7CardView {
    return { kind: "bonus", label: `+${value}`, value };
}
