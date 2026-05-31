import { Effect } from "effect";

import { Data } from "effect";

export class LedgerReduceError extends Data.TaggedError("LedgerReduceError")<{
    readonly index: number;
    readonly event: unknown;
    readonly cause: unknown;
}> {}

export interface LedgerEntry<E> {
    readonly index: number;
    readonly event: E;
}

export interface LedgerSnapshot<S> {
    readonly index: number;
    readonly state: S;
}

interface LedgerConfig<S, E> {
    readonly initialState: S;
    readonly reduce: (state: S, event: E) => S;
    readonly component?: string;
}

export interface LedgerAppendResult<E> {
    readonly index: number;
    readonly event: E;
}

export interface LedgerSyncData<S, E> {
    snapshot: LedgerSnapshot<S>;
    events: readonly LedgerEntry<E>[];
}

export interface Ledger<S, E> {
    append(event: E): Effect.Effect<LedgerAppendResult<E>, LedgerReduceError>;
    getState(): S;
    getCurrentIndex(): number;
    createSnapshot(): Effect.Effect<LedgerSnapshot<S>>;
    getLatestSnapshot(): LedgerSnapshot<S>;
    getSnapshotAtIndex(index: number): LedgerSnapshot<S> | null;
    getEventsSince(index: number): readonly LedgerEntry<E>[];
    getSyncData(
        lastSnapshotIndex: number,
        lastEventIndex: number,
    ): LedgerSyncData<S, E>;
}

export function createLedger<S, E>(config: LedgerConfig<S, E>): Ledger<S, E> {
    let currentState = structuredClone(config.initialState);
    let currentIndex = 0;
    const entries: LedgerEntry<E>[] = [];
    const snapshots: LedgerSnapshot<S>[] = [
        { index: 0, state: structuredClone(config.initialState) },
    ];
    const component = config.component ?? "ledger";

    return {
        append(event) {
            const index = currentIndex + 1;

            return Effect.gen(function* () {
                const newState = yield* Effect.try({
                    try: () => config.reduce(currentState, event),
                    catch: (cause) =>
                        new LedgerReduceError({ index, event, cause }),
                }).pipe(
                    Effect.tapError((error) =>
                        Effect.logError("ledger.reduce.failed").pipe(
                            Effect.annotateLogs({
                                component,
                                index: error.index,
                            }),
                        ),
                    ),
                );

                currentIndex = index;
                const entry: LedgerEntry<E> = { index, event };
                entries.push(entry);
                currentState = newState;

                yield* Effect.logDebug("ledger.event.appended").pipe(
                    Effect.annotateLogs({ component, index }),
                );

                return { index, event };
            });
        },

        getState() {
            return currentState;
        },

        getCurrentIndex() {
            return currentIndex;
        },

        createSnapshot() {
            return Effect.gen(function* () {
                const snapshot: LedgerSnapshot<S> = {
                    index: currentIndex,
                    state: structuredClone(currentState),
                };
                snapshots.push(snapshot);

                yield* Effect.logDebug("ledger.snapshot.created").pipe(
                    Effect.annotateLogs({ component, index: snapshot.index }),
                );

                return snapshot;
            });
        },

        getLatestSnapshot() {
            return snapshots[snapshots.length - 1];
        },

        getSnapshotAtIndex(index) {
            for (let i = snapshots.length - 1; i >= 0; i--) {
                if (snapshots[i].index <= index) {
                    return snapshots[i];
                }
            }
            return null;
        },

        getEventsSince(index) {
            return entries.filter((entry) => entry.index > index);
        },

        getSyncData(lastSnapshotIndex, lastEventIndex) {
            const snapshot = this.getLatestSnapshot();
            const eventsSinceIndex =
                snapshot.index === lastSnapshotIndex
                    ? Math.max(lastEventIndex, snapshot.index)
                    : snapshot.index;
            const events = this.getEventsSince(eventsSinceIndex);
            return { snapshot, events };
        },
    };
}
