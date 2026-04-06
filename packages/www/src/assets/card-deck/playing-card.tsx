import { For, Show } from "solid-js";
import type { Suit, Rank } from "./types";
import { RANK_LABEL, SUIT_COLOR } from "./types";
import { PIPS, PIP_SIZE } from "./pip-layouts";
import { SpadeSymbol } from "./suit-spade";
import { HeartSymbol } from "./suit-heart";
import { DiamondSymbol } from "./suit-diamond";
import { ClubSymbol } from "./suit-club";

type SuitSymbolProps = {
    cx: number;
    cy: number;
    size: number;
    color: string;
    flipped?: boolean;
};

const SUIT_SYMBOL: Record<
    Suit,
    (props: SuitSymbolProps) => any
> = {
    spade: (p) => <SpadeSymbol cx={p.cx} cy={p.cy} size={p.size} color={p.color} flipped={p.flipped} />,
    heart: (p) => <HeartSymbol cx={p.cx} cy={p.cy} size={p.size} color={p.color} flipped={p.flipped} />,
    diamond: (p) => <DiamondSymbol cx={p.cx} cy={p.cy} size={p.size} color={p.color} flipped={p.flipped} />,
    club: (p) => <ClubSymbol cx={p.cx} cy={p.cy} size={p.size} color={p.color} flipped={p.flipped} />,
};

function isFaceCard(rank: Rank): rank is 11 | 12 | 13 {
    return rank >= 11;
}

export function PlayingCard({
    suit,
    rank,
    size = 250,
}: {
    suit: Suit;
    rank: Rank;
    size?: number;
}) {
    const label = RANK_LABEL[rank];
    const color = SUIT_COLOR[suit];
    const fontSize = label === "10" ? "26" : "30";
    const renderSymbol = SUIT_SYMBOL[suit];

    return (
        <svg
            width={size}
            height={size * 1.4}
            viewBox="0 0 250 350"
            fill="none"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.14))" }}
        >
            <rect
                x="2"
                y="2"
                width="246"
                height="346"
                rx="14"
                fill="white"
                stroke="#d8d4ce"
                stroke-width="1.5"
            />

            <text
                x="22"
                y="44"
                text-anchor="middle"
                font-family="Georgia, 'Times New Roman', serif"
                font-size={fontSize}
                font-weight="700"
                fill={color}
            >
                {label}
            </text>
            {renderSymbol({ cx: 22, cy: 64, size: 20, color })}

            <g transform="rotate(180, 125, 175)">
                <text
                    x="22"
                    y="44"
                    text-anchor="middle"
                    font-family="Georgia, 'Times New Roman', serif"
                    font-size={fontSize}
                    font-weight="700"
                    fill={color}
                >
                    {label}
                </text>
                {renderSymbol({ cx: 22, cy: 64, size: 20, color })}
            </g>

            <Show when={isFaceCard(rank)}>
                <text
                    x="125"
                    y="185"
                    text-anchor="middle"
                    dominant-baseline="central"
                    font-family="'Bebas Neue', sans-serif"
                    font-size="100"
                    font-weight="400"
                    fill={color}
                    stroke="#d8d4ce"
                    stroke-width="1"
                >
                    {label}
                </text>
                {renderSymbol({ cx: 125, cy: 245, size: 40, color })}
            </Show>

            <Show when={!isFaceCard(rank)}>
                <For each={PIPS[rank] ?? []}>
                    {(pip) =>
                        renderSymbol({
                            cx: pip.x,
                            cy: pip.y,
                            size: PIP_SIZE[rank] ?? 28,
                            color,
                            flipped: pip.f,
                        })
                    }
                </For>
            </Show>
        </svg>
    );
}
