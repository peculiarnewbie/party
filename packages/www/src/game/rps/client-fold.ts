import { createSignal } from "solid-js";

import type { RpsState, RpsChoice } from "./types";
import type { RpsEvent, RpsHiddenData } from "./events";
import type { RpsPlayerView, RpsSyncResponse } from "./schemas";
import { reduce } from "./reduce";
import { getPlayerView } from "./views";

export interface RpsClientFold {
    state: () => RpsState | null;
    view: () => RpsPlayerView | null;
    myChoice: () => RpsChoice | null;
    processEvent(index: number, event: RpsEvent): void;
    processHidden(index: number, hidden: RpsHiddenData): void;
    applySnapshot(index: number, snapshotState: RpsState): void;
    applySync(sync: RpsSyncResponse): void;
    syncInfo: () => { lastSnapshotIndex: number; lastEventIndex: number };
    reset(): void;
}

export function createRpsFold(playerId: string): RpsClientFold {
    const [state, setReactiveState] = createSignal<RpsState | null>(null);
    const [myChoice, setMyChoice] = createSignal<RpsChoice | null>(null);
    let currentState: RpsState | null = null;
    let snapshotIndex = 0;
    let eventIndex = 0;
    const setState = (next: RpsState | null) => {
        currentState = next;
        setReactiveState(next);
    };
    const setLastSnapshotIndex = (index: number) => {
        snapshotIndex = index;
    };
    const setLastEventIndex = (index: number) => {
        eventIndex = index;
    };
    const hiddenByIndex = new Map<number, RpsHiddenData>();

    const view = () => {
        const s = state();
        if (!s) return null;
        const v = getPlayerView(s, playerId);
        const choice = myChoice();
        if (choice && v.myMatch && v.myMatch.status === "active") {
            v.myMatch.myChoice = choice;
            v.needsToThrow = false;
        }
        return v;
    };

    function processEvent(index: number, event: RpsEvent) {
        const current = currentState;
        if (!current || index <= eventIndex) return;

        const hidden = hiddenByIndex.get(index);
        const next = reduce(current, event);
        setState(next);
        setLastEventIndex(Math.max(eventIndex, index));

        if (
            event.type === "throw_registered" &&
            hidden?.type === "throw_choice"
        ) {
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
        if (currentState && index <= eventIndex) return;
        setState(snapshotState);
        setMyChoice(null);
        setLastSnapshotIndex(index);
        setLastEventIndex(index);
        hiddenByIndex.clear();
    }

    function applySync(sync: RpsSyncResponse) {
        const newestIncomingIndex = sync.events.reduce(
            (latest, entry) => Math.max(latest, entry.index),
            sync.snapshot.index,
        );
        if (newestIncomingIndex < eventIndex) return;

        if (sync.snapshot.data) {
            setState(sync.snapshot.data);
            setLastSnapshotIndex(sync.snapshot.index);
            setLastEventIndex(sync.snapshot.index);
            setMyChoice(null);
            hiddenByIndex.clear();
        }

        const hiddenEntries = [...sync.hidden].sort(
            (a, b) => a.index - b.index,
        );
        for (const entry of hiddenEntries) {
            processHidden(entry.index, entry.data);
        }

        const eventEntries = [...sync.events].sort((a, b) => a.index - b.index);
        for (const entry of eventEntries) {
            processEvent(entry.index, entry.data);
        }
    }

    function syncInfo() {
        return {
            lastSnapshotIndex: snapshotIndex,
            lastEventIndex: eventIndex,
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
