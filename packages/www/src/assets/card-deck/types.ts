export const SUITS = ["spade", "heart", "diamond", "club"] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
    suit: Suit;
    rank: Rank;
}

export const RANK_LABEL: Record<Rank, string> = {
    1: "A",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    10: "10",
    11: "J",
    12: "Q",
    13: "K",
};

export const SUIT_COLOR: Record<Suit, string> = {
    spade: "#1a1a1a",
    club: "#1a1a1a",
    heart: "#c0261a",
    diamond: "#c0261a",
};
