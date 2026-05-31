import type { AcceptedAnswer } from "./schemas";

export function checkFillIn(
    userInput: string,
    rules: readonly AcceptedAnswer[],
): boolean {
    return rules.some((rule) => {
        const normalized = rule.caseInsensitive
            ? userInput.toLowerCase().trim()
            : userInput.trim();

        switch (rule.matchType) {
            case "exact":
                return normalized === rule.pattern;
            case "contains":
                return normalized.includes(rule.pattern);
            case "any":
                return normalized.length > 0;
        }
    });
}
