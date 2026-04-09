const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function getCookie(name: string) {
    if (typeof document === "undefined") return null;

    const prefix = `${encodeURIComponent(name)}=`;
    const match = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith(prefix));

    if (!match) return null;

    return decodeURIComponent(match.slice(prefix.length));
}

export function setCookie(name: string, value: string, maxAge = ONE_YEAR_IN_SECONDS) {
    if (typeof document === "undefined") return;

    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict`;
}
