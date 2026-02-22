import { For } from "solid-js";
import { SpadeSymbol } from "./suit-spade";

export type SpadeRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const RANK_LABEL: Record<SpadeRank, string> = {
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
};

// Card viewBox: 250×350. Pip columns: x=80 (L), x=125 (C), x=170 (R).
// Pip rows: y=90 (top), y=128, y=145, y=175 (mid), y=205, y=222, y=260 (bot).
// f=true means the pip is flipped 180° (pointing down) — traditional for bottom-half pips.
type Pip = { x: number; y: number; f: boolean };

const PIPS: Record<SpadeRank, Pip[]> = {
    1: [{ x: 125, y: 175, f: false }],

    2: [
        { x: 125, y: 90, f: false },
        { x: 125, y: 260, f: true },
    ],

    3: [
        { x: 125, y: 90, f: false },
        { x: 125, y: 175, f: false },
        { x: 125, y: 260, f: true },
    ],

    4: [
        { x: 80, y: 90, f: false }, { x: 170, y: 90, f: false },
        { x: 80, y: 260, f: true }, { x: 170, y: 260, f: true },
    ],

    5: [
        { x: 80, y: 90, f: false }, { x: 170, y: 90, f: false },
        { x: 125, y: 175, f: false },
        { x: 80, y: 260, f: true }, { x: 170, y: 260, f: true },
    ],

    6: [
        { x: 80, y: 90, f: false },  { x: 170, y: 90, f: false },
        { x: 80, y: 175, f: false }, { x: 170, y: 175, f: false },
        { x: 80, y: 260, f: true },  { x: 170, y: 260, f: true },
    ],

    7: [
        { x: 80, y: 90, f: false },  { x: 170, y: 90, f: false },
        { x: 125, y: 128, f: false },
        { x: 80, y: 175, f: false }, { x: 170, y: 175, f: false },
        { x: 80, y: 260, f: true },  { x: 170, y: 260, f: true },
    ],

    8: [
        { x: 80, y: 90, f: false },  { x: 170, y: 90, f: false },
        { x: 125, y: 128, f: false },
        { x: 80, y: 175, f: false }, { x: 170, y: 175, f: false },
        { x: 125, y: 222, f: true },
        { x: 80, y: 260, f: true },  { x: 170, y: 260, f: true },
    ],

    9: [
        { x: 80, y: 90, f: false },  { x: 170, y: 90, f: false },
        { x: 80, y: 145, f: false }, { x: 170, y: 145, f: false },
        { x: 125, y: 175, f: false },
        { x: 80, y: 205, f: true },  { x: 170, y: 205, f: true },
        { x: 80, y: 260, f: true },  { x: 170, y: 260, f: true },
    ],

    10: [
        { x: 80, y: 90, f: false },  { x: 170, y: 90, f: false },
        { x: 125, y: 113, f: false },
        { x: 80, y: 145, f: false }, { x: 170, y: 145, f: false },
        { x: 80, y: 205, f: true },  { x: 170, y: 205, f: true },
        { x: 125, y: 237, f: true },
        { x: 80, y: 260, f: true },  { x: 170, y: 260, f: true },
    ],
};

// Ace gets a large central pip; all others use a standard pip size.
const PIP_SIZE: Record<SpadeRank, number> = {
    1: 75, 2: 28, 3: 28, 4: 28, 5: 28,
    6: 28, 7: 26, 8: 26, 9: 24, 10: 24,
};

export function SpadeCard({
    rank,
    size = 250,
}: {
    rank: SpadeRank;
    size?: number;
}) {
    const label = RANK_LABEL[rank];
    const pips = PIPS[rank];
    const pipSize = PIP_SIZE[rank];
    const fontSize = label === "10" ? "26" : "30";

    return (
        <svg
            width={size}
            height={size * 1.4}
            viewBox="0 0 250 350"
            fill="none"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.14))" }}
        >
            {/* Card body */}
            <rect
                x="2" y="2" width="246" height="346"
                rx="14"
                fill="white"
                stroke="#d8d4ce"
                stroke-width="1.5"
            />

            {/* Top-left corner: rank + spade */}
            <text
                x="22" y="44"
                text-anchor="middle"
                font-family="Georgia, 'Times New Roman', serif"
                font-size={fontSize}
                font-weight="700"
                fill="#1a1a1a"
            >
                {label}
            </text>
            <SpadeSymbol cx={22} cy={64} size={20} color="#1a1a1a" />

            {/* Bottom-right corner: same, rotated 180° around card center */}
            <g transform="rotate(180, 125, 175)">
                <text
                    x="22" y="44"
                    text-anchor="middle"
                    font-family="Georgia, 'Times New Roman', serif"
                    font-size={fontSize}
                    font-weight="700"
                    fill="#1a1a1a"
                >
                    {label}
                </text>
                <SpadeSymbol cx={22} cy={64} size={20} color="#1a1a1a" />
            </g>

            {/* Pips */}
            <For each={pips}>
                {(pip) => (
                    <SpadeSymbol
                        cx={pip.x}
                        cy={pip.y}
                        size={pipSize}
                        color="#1a1a1a"
                        flipped={pip.f}
                    />
                )}
            </For>
        </svg>
    );
}
