import { describe, expect, it } from "vitest";
import {
    createPlayerCapability,
    hashPlayerCapability,
    isPlayerCapability,
    verifyPlayerCapability,
} from "./player-capability";

describe("player reconnect capabilities", () => {
    it("creates URL-safe 256-bit capabilities", () => {
        const first = createPlayerCapability();
        const second = createPlayerCapability();

        expect(isPlayerCapability(first)).toBe(true);
        expect(isPlayerCapability(second)).toBe(true);
        expect(first).not.toBe(second);
    });

    it("does not repeat capabilities across a practical sample", () => {
        const capabilities = Array.from(
            { length: 256 },
            createPlayerCapability,
        );

        expect(new Set(capabilities).size).toBe(capabilities.length);
        expect(capabilities.every(isPlayerCapability)).toBe(true);
    });

    it("verifies only the capability matching the stored digest", async () => {
        const capability = createPlayerCapability();
        const digest = await hashPlayerCapability(capability);

        await expect(verifyPlayerCapability(capability, digest)).resolves.toBe(
            true,
        );
        await expect(
            verifyPlayerCapability(createPlayerCapability(), digest),
        ).resolves.toBe(false);
        await expect(verifyPlayerCapability("invalid", digest)).resolves.toBe(
            false,
        );
        await expect(verifyPlayerCapability(capability, "")).resolves.toBe(
            false,
        );
        await expect(
            verifyPlayerCapability(capability, `${digest.slice(0, -1)}A`),
        ).resolves.toBe(false);
    });

    it.each([
        null,
        undefined,
        123,
        "x".repeat(42),
        "x".repeat(44),
        `${"x".repeat(42)}+`,
    ])("rejects malformed capability %j", (value) => {
        expect(isPlayerCapability(value)).toBe(false);
    });
});
