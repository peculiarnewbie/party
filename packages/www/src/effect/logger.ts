import { Logger } from "effect";

export interface EffectLogContext {
    readonly component?: string;
    readonly operation?: string;
    readonly roomId?: string;
    readonly gameType?: string | null;
    readonly messageType?: string;
    readonly playerId?: string | null;
    readonly phase?: string;
    readonly sessionCount?: number;
    readonly result?: string;
    readonly errorTag?: string;
    readonly key?: string;
    readonly branch?: string;
}

export const effectLoggerLayer = Logger.layer([Logger.consoleJson]);

export function compactLogContext(
    context: EffectLogContext,
): Record<string, string | number | boolean> {
    const entries = Object.entries(context).filter(([, value]) => {
        return value !== undefined && value !== null;
    });

    return Object.fromEntries(
        entries.map(([key, value]) => [key, String(value)]),
    );
}
