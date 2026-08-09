import { afterEach, describe, expect, it, vi } from "vitest";

import { createGameTimer } from "./game-timer";
import type { GameAdapterContext } from "./game-adapter-types";

afterEach(() => {
    vi.useRealTimers();
});

describe("game timer", () => {
    function makeContext(setGameTimer = vi.fn()): GameAdapterContext {
        return {
            endGameAndPersist: vi.fn(),
            persistGameSnapshot: vi.fn(),
            getHostPlayerId: () => null,
            setGameTimer,
        };
    }

    it("publishes and clears its room-level cancellation handle", () => {
        vi.useFakeTimers();
        const setGameTimer = vi.fn();
        const elapsed = vi.fn();
        const context = makeContext(setGameTimer);
        const timer = createGameTimer(context, 100, elapsed);

        timer.schedule?.(vi.fn(), vi.fn());
        expect(setGameTimer).toHaveBeenLastCalledWith(expect.any(Function));

        vi.advanceTimersByTime(100);
        expect(elapsed).toHaveBeenCalledOnce();
        expect(setGameTimer).toHaveBeenLastCalledWith(null);
    });

    it("cancels the previous timeout when rescheduled", () => {
        vi.useFakeTimers();
        const elapsed = vi.fn();
        const timer = createGameTimer(makeContext(), 100, elapsed);

        timer.schedule?.(vi.fn(), vi.fn());
        vi.advanceTimersByTime(75);
        timer.schedule?.(vi.fn(), vi.fn());
        vi.advanceTimersByTime(25);
        expect(elapsed).not.toHaveBeenCalled();

        vi.advanceTimersByTime(75);
        expect(elapsed).toHaveBeenCalledOnce();
    });

    it("exposes a cancellation handle that prevents elapsed work", () => {
        vi.useFakeTimers();
        const setGameTimer = vi.fn();
        const elapsed = vi.fn();
        const timer = createGameTimer(makeContext(setGameTimer), 100, elapsed);

        timer.schedule?.(vi.fn(), vi.fn());
        const cancel = setGameTimer.mock.calls.at(-1)?.[0];
        expect(cancel).toBeTypeOf("function");
        cancel();
        vi.runAllTimers();

        expect(elapsed).not.toHaveBeenCalled();
    });

    it("keeps a replacement timer registered when elapsed work reschedules", () => {
        vi.useFakeTimers();
        const setGameTimer = vi.fn();
        const context = makeContext(setGameTimer);
        let timer: ReturnType<typeof createGameTimer>;
        const elapsed = vi.fn(() => {
            if (elapsed.mock.calls.length === 1) {
                timer.schedule?.(vi.fn(), vi.fn());
            }
        });
        timer = createGameTimer(context, 100, elapsed);

        timer.schedule?.(vi.fn(), vi.fn());
        vi.advanceTimersByTime(100);
        expect(elapsed).toHaveBeenCalledOnce();
        expect(setGameTimer).not.toHaveBeenLastCalledWith(null);

        vi.advanceTimersByTime(100);
        expect(elapsed).toHaveBeenCalledTimes(2);
        expect(setGameTimer).toHaveBeenLastCalledWith(null);
    });

    it("is a safe no-op without an adapter context", () => {
        vi.useFakeTimers();
        const elapsed = vi.fn();
        const timer = createGameTimer(undefined, 100, elapsed);

        expect(timer.schedule).toBeUndefined();
        expect(() => timer.clear()).not.toThrow();
        vi.runAllTimers();
        expect(elapsed).not.toHaveBeenCalled();
    });
});
