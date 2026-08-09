const CAPABILITY_BYTES = 32;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export function createPlayerCapability(): string {
    return toBase64Url(
        crypto.getRandomValues(new Uint8Array(CAPABILITY_BYTES)),
    );
}

export function isPlayerCapability(value: unknown): value is string {
    return typeof value === "string" && CAPABILITY_PATTERN.test(value);
}

export async function hashPlayerCapability(
    capability: string,
): Promise<string> {
    const bytes = new TextEncoder().encode(capability);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return toBase64Url(new Uint8Array(digest));
}

export async function verifyPlayerCapability(
    capability: string,
    expectedHash: string,
): Promise<boolean> {
    if (!isPlayerCapability(capability)) return false;
    const actualHash = await hashPlayerCapability(capability);
    if (actualHash.length !== expectedHash.length) return false;

    let difference = 0;
    for (let index = 0; index < actualHash.length; index++) {
        difference |=
            actualHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
    }
    return difference === 0;
}
