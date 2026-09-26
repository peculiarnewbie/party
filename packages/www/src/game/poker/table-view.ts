import { Schema } from "effect";
import { pokerPlayerViewSchema } from "./schemas";
import { getPlayerView } from "./views";
import type { PokerState } from "./types";

export const pokerTableViewSchema = Schema.Struct({
    players: pokerPlayerViewSchema.fields.players,
    board: pokerPlayerViewSchema.fields.board,
    pots: pokerPlayerViewSchema.fields.pots,
    actingPlayerId: pokerPlayerViewSchema.fields.actingPlayerId,
    street: pokerPlayerViewSchema.fields.street,
    handNumber: pokerPlayerViewSchema.fields.handNumber,
    eventLog: pokerPlayerViewSchema.fields.eventLog,
    endedByHost: pokerPlayerViewSchema.fields.endedByHost,
    winnerIds: pokerPlayerViewSchema.fields.winnerIds,
});

export type PokerTableView = typeof pokerTableViewSchema.Type;

export function getPokerTableView(state: PokerState): PokerTableView {
    const view = getPlayerView(state, null);
    const currentEvents = [];
    for (const event of state.eventLog) {
        if (event.type === "hand_started") break;
        currentEvents.push(event);
    }
    const showdown = currentEvents.find((event) => event.type === "showdown");
    return {
        players: view.players.map((player) => ({
            ...player,
            visibleHoleCards:
                showdown?.revealedHands
                    ?.find((hand) => hand.playerId === player.id)
                    ?.cards.map((card) => ({ ...card })) ?? [],
        })),
        board: view.board,
        pots: view.pots,
        actingPlayerId: view.actingPlayerId,
        street: view.street,
        handNumber: view.handNumber,
        eventLog: currentEvents.map((event) => ({ ...event })),
        endedByHost: view.endedByHost,
        winnerIds: view.winnerIds,
    };
}
