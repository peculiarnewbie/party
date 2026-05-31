import type { RpsState } from "./types";
import type { RpsEvent, RpsHiddenData } from "./events";
import { reduce } from "./reduce";

export interface RpsFoldState {
    readonly publicState: RpsState;
    readonly choices: ReadonlyMap<number, { p1: string | null; p2: string | null }>;
    readonly thrownPlayers: ReadonlyMap<number, Set<string>>;
}

export function createInitialFoldState(state: RpsState): RpsFoldState {
    return {
        publicState: state,
        choices: new Map(),
        thrownPlayers: new Map(),
    };
}

export function fold(
    foldState: RpsFoldState,
    event: RpsEvent,
    hidden?: RpsHiddenData,
): RpsFoldState {
    const newPublicState = reduce(foldState.publicState, event);

    if (event.type === "throw_registered" && hidden) {
        const existing = foldState.choices.get(event.matchIndex) ?? {
            p1: null,
            p2: null,
        };

        const round = foldState.publicState.rounds.find(
            (r) => r.roundNumber === foldState.publicState.currentRound,
        );
        const match = round?.matches[event.matchIndex];

        if (match) {
            const isP1 = match.player1Id === event.playerId;
            const updated = isP1
                ? { ...existing, p1: hidden.choice }
                : { ...existing, p2: hidden.choice };

            const newChoices = new Map(foldState.choices);
            newChoices.set(event.matchIndex, updated);

            const newThrown = new Map(foldState.thrownPlayers);
            const thrownSet = new Set(
                newThrown.get(event.matchIndex) ?? [],
            );
            thrownSet.add(event.playerId);
            newThrown.set(event.matchIndex, thrownSet);

            return {
                publicState: newPublicState,
                choices: newChoices,
                thrownPlayers: newThrown,
            };
        }
    }

    if (event.type === "throw_revealed") {
        const newThrown = new Map(foldState.thrownPlayers);
        newThrown.delete(event.matchIndex);
        const newChoices = new Map(foldState.choices);
        newChoices.delete(event.matchIndex);

        return {
            publicState: newPublicState,
            choices: newChoices,
            thrownPlayers: newThrown,
        };
    }

    return {
        ...foldState,
        publicState: newPublicState,
    };
}

export function getPlayerChoice(
    foldState: RpsFoldState,
    matchIndex: number,
    playerId: string,
): string | null {
    const round = foldState.publicState.rounds.find(
        (r) => r.roundNumber === foldState.publicState.currentRound,
    );
    const match = round?.matches[matchIndex];
    if (!match) return null;

    const entry = foldState.choices.get(matchIndex);
    if (!entry) return null;

    return match.player1Id === playerId ? entry.p1 : entry.p2;
}

export function hasPlayerThrown(
    foldState: RpsFoldState,
    matchIndex: number,
    playerId: string,
): boolean {
    const thrown = foldState.thrownPlayers.get(matchIndex);
    return thrown?.has(playerId) ?? false;
}
