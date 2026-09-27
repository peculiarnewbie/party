import type { Card } from "~/assets/card-deck/types";
import type { PokerEvent, PokerPlayerPublicView } from "~/game/poker";

export interface PotResult {
    id: number;
    amount: number;
    message: string;
    winnerIds: string[];
    handLabel: string | null;
    winningCards: Card[];
    uncontested: boolean;
}

export interface SeatAction {
    id: number;
    label: string;
    tone: "fold" | "check" | "call" | "raise" | "all_in";
}

export function currentHandEvents(events: PokerEvent[]): PokerEvent[] {
    const current: PokerEvent[] = [];
    for (const event of events) {
        current.push(event);
        if (event.type === "hand_started") break;
    }
    return current;
}

function parseAction(message: string): Omit<SeatAction, "id"> | null {
    const allIn = message.match(/ went all-in for (\d+)$/);
    if (allIn) return { label: `All-in ${allIn[1]}`, tone: "all_in" };
    if (/ folded$/.test(message)) return { label: "Fold", tone: "fold" };
    if (/ checked$/.test(message)) return { label: "Check", tone: "check" };
    const raised = message.match(/ raised to (\d+)$/);
    if (raised) return { label: `Raise ${raised[1]}`, tone: "raise" };
    const called = message.match(/ called (\d+)$/);
    if (called) return { label: `Call ${called[1]}`, tone: "call" };
    const bet = message.match(/ bet (\d+)$/);
    if (bet) return { label: `Bet ${bet[1]}`, tone: "raise" };
    return null;
}

export function lastSeatActions(
    events: PokerEvent[],
): Record<string, SeatAction> {
    const actions: Record<string, SeatAction> = {};
    for (const event of currentHandEvents(events)) {
        if (event.type === "board_dealt") break;
        if (event.type !== "player_action") continue;
        if (actions[event.playerId]) continue;
        const parsed = parseAction(event.message);
        if (parsed) actions[event.playerId] = { id: event.id, ...parsed };
    }
    return actions;
}

export function potResults(
    events: PokerEvent[],
    players: PokerPlayerPublicView[],
): PotResult[] {
    return currentHandEvents(events)
        .filter(
            (event): event is PokerEvent & { type: "pot_awarded" } =>
                event.type === "pot_awarded",
        )
        .reverse()
        .map((event) => {
            const winnerIds =
                event.winnerIds ??
                (() => {
                    const names =
                        event.message.match(/^(.+?) won /)?.[1].split(" & ") ??
                        [];
                    return players
                        .filter((player) => names.includes(player.name))
                        .map((player) => player.id);
                })();
            return {
                id: event.id,
                amount: event.amount ?? 0,
                message: event.message,
                winnerIds,
                handLabel:
                    event.handLabel ??
                    event.message.match(/ with (.+)$/)?.[1] ??
                    null,
                winningCards: event.winningCards ?? [],
                uncontested: event.message.includes("uncontested"),
            };
        });
}

export function winningsByPlayer(results: PotResult[]): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const result of results) {
        const share = Math.floor(result.amount / Math.max(1, result.winnerIds.length));
        for (const id of result.winnerIds) totals[id] = (totals[id] ?? 0) + share;
    }
    return totals;
}

export function cardKey(card: Card): string {
    return `${card.rank}-${card.suit}`;
}
