// @vitest-environment node

import fs from "node:fs";
import path from "node:path";

import fc from "fast-check";

export function createSeededRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

export function fuzzParameters<Ts>(): fc.Parameters<Ts> {
    const seed = process.env.FUZZ_SEED;
    const replayPath = process.env.FUZZ_PATH;
    return {
        numRuns: Number(process.env.FUZZ_RUNS ?? 50),
        endOnFailure: process.env.FUZZ_END_ON_FAILURE === "true",
        ...(seed === undefined ? {} : { seed: Number(seed) }),
        ...(replayPath === undefined ? {} : { path: replayPath }),
    };
}

export function runFuzz<Ts>(label: string, property: fc.IProperty<Ts>): void {
    const result = fc.check(property, fuzzParameters<Ts>());
    if (!result.failed) return;

    if (!process.env.CI) {
        const logDir = path.join(process.cwd(), ".fuzz-failures");
        fs.mkdirSync(logDir, { recursive: true });
        const logPath = path.join(logDir, `${label}.json`);
        fs.writeFileSync(
            logPath,
            JSON.stringify(
                {
                    label,
                    seed: result.seed,
                    counterexamplePath: result.counterexamplePath,
                    numShrinks: result.numShrinks,
                    counterexample: result.counterexample,
                    error:
                        result.errorInstance instanceof Error
                            ? {
                                  name: result.errorInstance.name,
                                  message: result.errorInstance.message,
                                  stack: result.errorInstance.stack,
                              }
                            : result.errorInstance,
                    timestamp: new Date().toISOString(),
                },
                null,
                2,
            ),
        );
        console.error(`Fuzz failure for ${label} logged to ${logPath}`);
    } else {
        console.error(
            `Fuzz failure for ${label}: seed=${result.seed}, path=${result.counterexamplePath}, shrinks=${result.numShrinks}`,
        );
        console.error(
            "Counterexample:",
            JSON.stringify(result.counterexample, null, 2),
        );
    }

    if (result.errorInstance instanceof Error) {
        throw result.errorInstance;
    }
    throw new Error(`Fuzz failed for ${label}`, {
        cause: result.errorInstance,
    });
}
