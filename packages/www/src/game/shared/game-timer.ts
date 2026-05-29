import type { GameAdapterContext } from "./game-adapter-types";

export interface GameTimer {
    schedule: ((broadcast: (msg: string) => void, sendTo: (playerId: string, msg: string) => void) => void) | undefined;
    clear(): void;
}

export function createGameTimer(
    ctx: GameAdapterContext | undefined,
    delayMs: number,
    onElapsed: (
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) => void,
): GameTimer {
    if (!ctx) return { schedule: undefined, clear: () => {} };

    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
        schedule: (broadcast, sendTo) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                onElapsed(broadcast, sendTo);
            }, delayMs);
            ctx.setGameTimer(() => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
            });
        },
        clear: () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            ctx.setGameTimer(null);
        },
    };
}
