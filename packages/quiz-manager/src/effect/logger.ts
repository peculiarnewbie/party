import { Logger } from "effect";

export interface EffectLogContext {
    readonly component?: string;
    readonly operation?: string;
    readonly quizId?: string;
    readonly questionId?: string;
    readonly tagId?: string;
    readonly result?: string;
    readonly errorTag?: string;
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
