import { afterEach, describe, expect, it, vi } from "vitest";
import {
    buildSetCookieHeader,
    createSessionCookie,
    getSessionCookieName,
    parseCookies,
    validatePassword,
    validateSession,
} from "./session";

describe("admin session", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("accepts a valid signed session and rejects another secret", async () => {
        const cookie = await createSessionCookie("correct-secret");

        await expect(validateSession("correct-secret", cookie)).resolves.toBe(
            true,
        );
        await expect(validateSession("wrong-secret", cookie)).resolves.toBe(
            false,
        );
    });

    it("fails closed when the session secret is missing", async () => {
        await expect(createSessionCookie("")).rejects.toThrow(
            "SESSION_SECRET must be configured",
        );
        await expect(validateSession("", "payload.signature")).resolves.toBe(
            false,
        );
    });

    it("rejects tampered and expired sessions", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
        const cookie = await createSessionCookie("secret");
        const [payload, signature] = cookie.split(".");

        await expect(
            validateSession("secret", `${payload}x.${signature}`),
        ).resolves.toBe(false);

        vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1_000);
        await expect(validateSession("secret", cookie)).resolves.toBe(false);
    });

    it("expires exactly at the declared expiration boundary", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
        const cookie = await createSessionCookie("secret");

        vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1_000 - 1);
        await expect(validateSession("secret", cookie)).resolves.toBe(true);

        vi.advanceTimersByTime(1);
        await expect(validateSession("secret", cookie)).resolves.toBe(false);
    });

    it("rejects a signed session before its issued-at time", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-09T00:00:00Z"));
        const cookie = await createSessionCookie("secret");

        vi.setSystemTime(new Date("2026-08-08T23:59:59.999Z"));
        await expect(validateSession("secret", cookie)).resolves.toBe(false);
    });

    it.each([
        "",
        "one-part",
        "too.many.parts",
        ".signature",
        "payload.",
        "not-base64.not-base64",
    ])("rejects malformed session value %j", async (value) => {
        await expect(validateSession("secret", value)).resolves.toBe(false);
    });

    it("validates the admin password without a direct string comparison", async () => {
        await expect(validatePassword("correct", "correct")).resolves.toBe(
            true,
        );
        await expect(validatePassword("incorrect", "correct")).resolves.toBe(
            false,
        );
        await expect(validatePassword("", "correct")).resolves.toBe(false);
    });

    it("builds a hardened cookie that can be parsed", async () => {
        const value = await createSessionCookie("secret");
        const header = buildSetCookieHeader(value);
        const parsed = parseCookies(header);

        expect(parsed[getSessionCookieName()]).toBe(value);
        expect(header).toContain("HttpOnly");
        expect(header).toContain("Secure");
        expect(header).toContain("SameSite=Strict");
    });

    it("parses cookie values containing equals signs and ignores fragments", () => {
        expect(parseCookies("a=one==; invalid; b=two")).toEqual({
            a: "one==",
            b: "two",
        });
    });
});
