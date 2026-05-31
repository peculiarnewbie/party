const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = "qm_session";

interface SessionPayload {
    iat: number;
    exp: number;
}

function toBase64Url(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function hmacSign(secret: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
    return toBase64Url(signature);
}

async function hmacVerify(
    secret: string,
    data: string,
    signature: string,
): Promise<boolean> {
    const expected = await hmacSign(secret, data);
    return expected === signature;
}

export async function createSessionCookie(secret: string): Promise<string> {
    const now = Date.now();
    const payload: SessionPayload = {
        iat: now,
        exp: now + SESSION_DURATION_MS,
    };
    const payloadJson = JSON.stringify(payload);
    const payloadB64 = btoa(payloadJson)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    const signature = await hmacSign(secret, payloadB64);
    return `${payloadB64}.${signature}`;
}

export async function validateSession(
    secret: string,
    cookieValue: string,
): Promise<boolean> {
    const parts = cookieValue.split(".");
    if (parts.length !== 2) return false;

    const [payloadB64, signature] = parts;

    const valid = await hmacVerify(secret, payloadB64, signature);
    if (!valid) return false;

    try {
        const padded =
            payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
        const payloadJson = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
        const payload: SessionPayload = JSON.parse(payloadJson);

        if (payload.exp < Date.now()) return false;

        return true;
    } catch {
        return false;
    }
}

export function getSessionCookieName(): string {
    return COOKIE_NAME;
}

export function buildSetCookieHeader(cookieValue: string): string {
    const maxAge = SESSION_DURATION_MS / 1000;
    return `${COOKIE_NAME}=${cookieValue}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function parseCookies(header: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    for (const pair of header.split(";")) {
        const eqIndex = pair.indexOf("=");
        if (eqIndex === -1) continue;
        const key = pair.slice(0, eqIndex).trim();
        const value = pair.slice(eqIndex + 1).trim();
        cookies[key] = value;
    }
    return cookies;
}

export async function validatePassword(
    password: string,
    envPassword: string,
): Promise<boolean> {
    return password === envPassword;
}
