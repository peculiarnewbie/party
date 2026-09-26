import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@solidjs/testing-library";

const textContent =
    typeof Element === "undefined"
        ? undefined
        : Object.getOwnPropertyDescriptor(Element.prototype, "textContent");
if (textContent?.set) {
    const setTextContent = textContent.set;
    Object.defineProperty(Element.prototype, "textContent", {
        ...textContent,
        set(value: string | null) {
            setTextContent.call(this, value == null ? "" : String(value));
        },
    });
}

const localValues = new Map<string, string>();
const testLocalStorage: Storage = {
    get length() {
        return localValues.size;
    },
    clear: () => localValues.clear(),
    getItem: (key) => localValues.get(key) ?? null,
    key: (index) => [...localValues.keys()][index] ?? null,
    removeItem: (key) => {
        localValues.delete(key);
    },
    setItem: (key, value) => {
        localValues.set(key, String(value));
    },
};
Object.defineProperty(globalThis, "localStorage", {
    value: testLocalStorage,
    configurable: true,
});

afterEach(() => {
    cleanup();
});
