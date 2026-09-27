import { createMemo } from "solid-js";

export function useArrivalBase(count: () => number, initial = 0) {
    let previous = initial;
    return createMemo(() => {
        const next = count();
        const base = Math.min(previous, next);
        previous = next;
        return base;
    });
}
