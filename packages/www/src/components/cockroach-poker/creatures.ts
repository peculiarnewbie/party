import { CREATURE_TYPES } from "~/game/cockroach-poker/schemas";
import type { CreatureType } from "~/game/cockroach-poker/schemas";

export const CREATURE_LABELS: Record<CreatureType, string> = {
    bat: "Bat",
    fly: "Fly",
    cockroach: "Cockroach",
    toad: "Toad",
    rat: "Rat",
    scorpion: "Scorpion",
    spider: "Spider",
    stink_bug: "Stink Bug",
};

export function groupCreatures(cards: readonly CreatureType[]) {
    return CREATURE_TYPES.flatMap((creature) => {
        const count = cards.filter((card) => card === creature).length;
        return count ? [{ creature, count }] : [];
    });
}
