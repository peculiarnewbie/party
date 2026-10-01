import type { AcceptedAnswer } from "./schemas";

export function checkFillIn(
    userInput: string,
    rules: readonly AcceptedAnswer[],
): boolean {
    return rules.some((rule) => {
        const normalized = rule.caseInsensitive
            ? userInput.toLowerCase().trim()
            : userInput.trim();
        const pattern = rule.caseInsensitive
            ? rule.pattern.toLowerCase().trim()
            : rule.pattern.trim();

        switch (rule.matchType) {
            case "exact":
                return normalized === pattern;
            case "contains":
                return normalized.includes(pattern);
            case "any":
                return normalized.length > 0;
        }
    });
}
