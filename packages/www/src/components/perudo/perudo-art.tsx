import { SvgDice } from "~/assets/svg-dice";
import { avatarColors } from "~/components/casino/player-avatar";
import type { FaceValue } from "~/game/perudo/types";

export function PerudoDie(props: {
    face: FaceValue;
    size?: number;
    matched?: boolean;
}) {
    return (
        <span
            role="img"
            aria-label={`Die showing ${props.face}`}
            class={`inline-flex shrink-0 rounded-lg border-2 border-ink shadow-ink-sm ${props.matched ? "bg-sun" : "bg-cream"}`}
        >
            <SvgDice
                side={props.face}
                size={props.size ?? 44}
                color={props.matched ? "#f5c542" : "#f7f2de"}
                dotColor="#1a1a1a"
            />
        </span>
    );
}

export function PerudoCup(props: { id: string; class?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            class={props.class ?? "h-20 w-20"}
            fill="none"
            stroke="#1a1a1a"
            stroke-width="3"
            stroke-linejoin="round"
        >
            <ellipse
                cx="50"
                cy="88"
                rx="39"
                ry="6"
                fill="#1a1a1a"
                opacity=".15"
                stroke="none"
            />
            <path
                d="M24 19H76L85 80C85 92 15 92 15 80Z"
                fill={avatarColors(props.id)[0]}
            />
            <ellipse cx="50" cy="19" rx="26" ry="8" fill="#f7f2de" />
            <path
                d="M24 20L19 72M76 20L81 72M17 77C29 85 71 85 83 77"
                stroke="#f7f2de"
                opacity=".6"
            />
            <rect
                x="35"
                y="39"
                width="30"
                height="30"
                rx="5"
                fill="#f7f2de"
                transform="rotate(-8 50 54)"
            />
            <circle cx="42" cy="46" r="3" fill="#1a1a1a" stroke="none" />
            <circle cx="50" cy="54" r="3" fill="#1a1a1a" stroke="none" />
            <circle cx="58" cy="62" r="3" fill="#1a1a1a" stroke="none" />
        </svg>
    );
}
