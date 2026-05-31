import { createSignal, createMemo } from "solid-js";

import type { RpsState, RpsChoice } from "./types";
import type { RpsEvent, RpsHiddenData } from "./events";
import type { RpsPlayerView } from "./schemas";
import type { SyncResponse } from "~/game/shared/game-engine-types";
import { reduce } from "./reduce";
import { getPlayerView } from "./views";

export interface RpsClientFold {
    state: () => RpsState | null;
    view: () => RpsPlayerView | null;
    myChoice: () => RpsChoice | null;
    processEvent(index: number, event: RpsEvent): void;
    processHidden(index: number, hidden: RpsHiddenData): void;
    applySnapshot(index: number, snapshotState: RpsState): void;
    applySync(sync: SyncResponse): void;
    syncInfo: () => { lastSnapshotIndex: number; lastEventIndex: number };
    reset(): void;
}

export function createRpsFold(playerId: string): RpsClientFold {
    const [state, setState] = createSignal<RpsState | null>(null);
    const [myChoice, setMyChoice] = createSignal<RpsChoice | null>(null);
    const [lastSnapshotIndex, setLastSnapshotIndex] = createSignal(0);
    const [lastEventIndex, setLastEventIndex] = createSignal(0);
    const hiddenByIndex = new Map<number, RpsHiddenData>();

    const view = createMemo(() => {
        const s = state();
        if (!s) return null;
        const v = getPlayerView(s, playerId);
        const choice = myChoice();
        if (choice && v.myMatch && v.myMatch.status === "active") {
            v.myMatch.myChoice = choice;
            v.needsToThrow = false;
        }
        return v;
    });

    function processEvent(index: number, event: RpsEvent) {
        const current = state();
        if (!current) return;

        const hidden = hiddenByIndex.get(index);
        const next = reduce(current, event);
        setState(next);
        setLastEventIndex(Math.max(lastEventIndex(), index));

        if (event.type === "throw_registered" && hidden?.type === "throw_choice") {
            setMyChoice(hidden.choice);
        }
        if (event.type === "throw_revealed") {
            setMyChoice(null);
        }
    }

    function processHidden(index: number, hidden: RpsHiddenData) {
        hiddenByIndex.set(index, hidden);
        if (hidden.type === "throw_choice") {
            setMyChoice(hidden.choice);
        }
    }

    function applySnapshot(index: number, snapshotState: RpsState) {
        setState(snapshotState);
        setMyChoice(null);
        setLastSnapshotIndex(index);
        setLastEventIndex(index);
        hiddenByIndex.clear();
    }

    function applySync(sync: SyncResponse) {
        if (sync.snapshot.data) {
            setState(sync.snapshot.data as RpsState);
            setLastSnapshotIndex(sync.snapshot.index);
            setLastEventIndex(sync.snapshot.index);
            setMyChoice(null);
            hiddenByIndex.clear();
        }

        const hiddenEntries = [...sync.hidden].sort((a, b) => a.index - b.index);
        for (const entry of hiddenEntries) {
            hiddenByIndex.set(entry.index, entry.data as RpsHiddenData);
        }

        const eventEntries = [...sync.events].sort((a, b) => a.index - b.index);
        for (const entry of eventEntries) {
            processEvent(entry.index, entry.data as RpsEvent);
        }
    }

    function syncInfo() {
        return {
            lastSnapshotIndex: lastSnapshotIndex(),
            lastEventIndex: lastEventIndex(),
        };
    }

    function reset() {
        setState(null);
        setMyChoice(null);
        setLastSnapshotIndex(0);
        setLastEventIndex(0);
        hiddenByIndex.clear();
    }

    return {
        state,
        view,
        myChoice,
        processEvent,
        processHidden,
        applySnapshot,
        applySync,
        syncInfo,
        reset,
    };
}
