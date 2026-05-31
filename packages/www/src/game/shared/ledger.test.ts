import { describe, it, expect } from "vitest";
import { Effect } from "effect";
import { createLedger } from "./ledger";

type TestEvent =
    | { type: "increment"; amount: number }
    | { type: "set"; value: number };

function reduce(state: number, event: TestEvent): number {
    switch (event.type) {
        case "increment":
            return state + event.amount;
        case "set":
            return event.value;
    }
}

function runSync<A, E>(effect: Effect.Effect<A, E>): A {
    return Effect.runSync(effect as Effect.Effect<A, never>);
}

describe("createLedger", () => {
    it("starts at index 0 with initial state", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        expect(ledger.getCurrentIndex()).toBe(0);
        expect(ledger.getState()).toBe(0);
    });

    it("appends events with monotonic indices", () => {
        const ledger = createLedger({ initialState: 0, reduce });

        const r1 = runSync(ledger.append({ type: "increment", amount: 5 }));
        expect(r1.index).toBe(1);
        expect(ledger.getState()).toBe(5);

        const r2 = runSync(ledger.append({ type: "increment", amount: 3 }));
        expect(r2.index).toBe(2);
        expect(ledger.getState()).toBe(8);
    });

    it("creates snapshots at the current index", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 5 }));

        const snapshot = runSync(ledger.createSnapshot());
        expect(snapshot.index).toBe(1);
        expect(snapshot.state).toBe(5);
    });

    it("returns latest snapshot", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 5 }));
        runSync(ledger.createSnapshot());
        runSync(ledger.append({ type: "increment", amount: 3 }));
        runSync(ledger.createSnapshot());

        const latest = ledger.getLatestSnapshot();
        expect(latest.index).toBe(2);
        expect(latest.state).toBe(8);
    });

    it("returns events since a given index", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 1 }));
        runSync(ledger.append({ type: "increment", amount: 2 }));
        runSync(ledger.append({ type: "increment", amount: 3 }));

        const events = ledger.getEventsSince(1);
        expect(events).toHaveLength(2);
        expect(events[0].index).toBe(2);
        expect(events[1].index).toBe(3);
    });

    it("returns empty array when no events since index", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 1 }));

        const events = ledger.getEventsSince(1);
        expect(events).toHaveLength(0);
    });

    it("returns latest snapshot for sync data", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 1 }));
        runSync(ledger.createSnapshot());
        runSync(ledger.append({ type: "increment", amount: 2 }));
        runSync(ledger.append({ type: "increment", amount: 3 }));

        const sync = ledger.getSyncData(0, 0);
        expect(sync.snapshot.index).toBe(1);
        expect(sync.snapshot.state).toBe(1);
        expect(sync.events).toHaveLength(2);
    });

    it("sync data uses requested snapshot when available", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 1 }));
        runSync(ledger.createSnapshot());
        runSync(ledger.append({ type: "increment", amount: 2 }));
        runSync(ledger.append({ type: "increment", amount: 3 }));

        const sync = ledger.getSyncData(1, 1);
        expect(sync.snapshot.index).toBe(1);
        expect(sync.snapshot.state).toBe(1);
        expect(sync.events).toHaveLength(2);
        expect(sync.events[0].index).toBe(2);
        expect(sync.events[1].index).toBe(3);
    });

    it("snapshot state is a deep clone (immutable)", () => {
        const objLedger = createLedger({
            initialState: { count: 0 },
            reduce: (state, event: TestEvent) => {
                if (event.type === "set") return { count: event.value };
                return { count: state.count + event.amount };
            },
        });

        runSync(objLedger.append({ type: "increment", amount: 5 }));
        const snapshot = runSync(objLedger.createSnapshot());
        runSync(objLedger.append({ type: "set", value: 99 }));

        expect(snapshot.state.count).toBe(5);
        expect(objLedger.getState().count).toBe(99);
    });

    it("getSnapshotAtIndex returns closest snapshot at or before index", () => {
        const ledger = createLedger({ initialState: 0, reduce });
        runSync(ledger.append({ type: "increment", amount: 1 }));
        runSync(ledger.createSnapshot());
        runSync(ledger.append({ type: "increment", amount: 2 }));
        runSync(ledger.append({ type: "increment", amount: 3 }));
        runSync(ledger.createSnapshot());

        expect(ledger.getSnapshotAtIndex(2)?.index).toBe(1);
        expect(ledger.getSnapshotAtIndex(3)?.index).toBe(3);
        expect(ledger.getSnapshotAtIndex(0)?.index).toBe(0);
    });

    it("append returns LedgerReduceError when reduce throws", () => {
        const ledger = createLedger({
            initialState: 0,
            reduce: () => {
                throw new Error("boom");
            },
        });

        const exit = Effect.runSync(
            Effect.exit(ledger.append({ type: "increment", amount: 1 })),
        );

        expect(exit._tag).toBe("Failure");
    });
});
