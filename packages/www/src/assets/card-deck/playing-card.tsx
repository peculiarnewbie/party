import { For, Show } from "solid-js";
import type { JSX } from "@solidjs/web";
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

const SUIT_SYMBOL: Record<Suit, (props: SuitSymbolProps) => JSX.Element> = {
    spade: (p) => (
        <SpadeSymbol
            cx={p.cx}
            cy={p.cy}
            size={p.size}
            color={p.color}
            flipped={p.flipped}
        />
    ),
    heart: (p) => (
        <HeartSymbol
            cx={p.cx}
            cy={p.cy}
            size={p.size}
            color={p.color}
            flipped={p.flipped}
        />
    ),
    diamond: (p) => (
        <DiamondSymbol
            cx={p.cx}
            cy={p.cy}
            size={p.size}
            color={p.color}
            flipped={p.flipped}
        />
    ),
    club: (p) => (
        <ClubSymbol
            cx={p.cx}
            cy={p.cy}
            size={p.size}
            color={p.color}
            flipped={p.flipped}
        />
    ),
};

function isFaceCard(rank: Rank): rank is 11 | 12 | 13 {
    return rank >= 11;
}

export function PlayingCard({
    suit,
    rank,
    size = 250,
    class: className,
    variant = "classic",
}: {
    suit: Suit;
    rank: Rank;
    size?: number;
    class?: string;
    variant?: "classic" | "jumbo";
}) {
    const label = RANK_LABEL[rank];
    const color = SUIT_COLOR[suit];
    const fontSize = label === "10" ? "42" : "48";
    const renderSymbol = SUIT_SYMBOL[suit];

    const isResponsive = !!className;

    if (variant === "jumbo") {
        return (
            <svg
                width={isResponsive ? undefined : size}
                height={isResponsive ? undefined : size * 1.4}
                viewBox="0 0 250 350"
                fill="none"
                class={className}
                role="img"
                aria-label={`${label} of ${suit}s`}
                style={isResponsive ? { width: "100%", height: "auto" } : {}}
            >
                <rect
                    x="2"
                    y="2"
                    width="246"
                    height="346"
                    rx="18"
                    fill="#fffdf6"
                />
                <text
                    x={label === "10" ? "22" : "30"}
                    y="120"
                    font-family="'Bebas Neue', Arial, sans-serif"
                    font-size={label === "10" ? "132" : "142"}
                    letter-spacing={label === "10" ? "-6" : "0"}
                    fill={color}
                >
                    {label}
                </text>
                {renderSymbol({ cx: 70, cy: 178, size: 72, color })}
                {renderSymbol({ cx: 172, cy: 270, size: 118, color })}
            </svg>
        );
    }

    return (
        <svg
            width={isResponsive ? undefined : size}
            height={isResponsive ? undefined : size * 1.4}
            viewBox="0 0 250 350"
            fill="none"
            class={className}
            style={{
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.14))",
                ...(isResponsive ? { width: "100%", height: "auto" } : {}),
            }}
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
                x="34"
                y="56"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size={fontSize}
                font-weight="700"
                fill={color}
            >
                {label}
            </text>
            {renderSymbol({ cx: 34, cy: 82, size: 34, color })}

            <g transform="rotate(180, 125, 175)">
                <text
                    x="34"
                    y="56"
                    text-anchor="middle"
                    font-family="Arial, Helvetica, sans-serif"
                    font-size={fontSize}
                    font-weight="700"
                    fill={color}
                >
                    {label}
                </text>
                {renderSymbol({ cx: 34, cy: 82, size: 34, color })}
            </g>

            <Show when={isFaceCard(rank)}>
                <text
                    x="125"
                    y="185"
                    text-anchor="middle"
                    dominant-baseline="central"
                    font-family="'Bebas Neue', sans-serif"
                    font-size="114"
                    font-weight="400"
                    fill={color}
                    stroke="#d8d4ce"
                    stroke-width="1"
                >
                    {label}
                </text>
                {renderSymbol({ cx: 125, cy: 250, size: 54, color })}
            </Show>

            <Show when={!isFaceCard(rank)}>
                <For each={PIPS[rank] ?? []}>
                    {(pip) =>
                        renderSymbol({
                            cx: pip.x,
                            cy: pip.y,
                            size: PIP_SIZE[rank] ?? 40,
                            color,
                            flipped: pip.f,
                        })
                    }
                </For>
            </Show>
        </svg>
    );
}
