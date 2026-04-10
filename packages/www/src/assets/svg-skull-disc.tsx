import type { JSX } from "solid-js";

export interface SkullDiscPalette {
    base: string;
    accent: string;
    line: string;
    center: string;
}

interface SvgSkullDiscProps {
    disc: "flower" | "skull" | "hidden";
    palette: SkullDiscPalette;
    class?: string;
    style?: JSX.CSSProperties;
}

export function SvgSkullDisc(props: SvgSkullDiscProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            class={props.class}
            style={props.style}
            fill="none"
        >
            <circle cx="50" cy="50" r="47" fill={props.palette.base} />
            <circle
                cx="50"
                cy="50"
                r="45"
                stroke={props.palette.line}
                stroke-width="2.5"
                opacity="0.8"
            />
            <circle
                cx="50"
                cy="50"
                r="35"
                fill={props.palette.accent}
                stroke={props.palette.line}
                stroke-width="2"
            />
            <circle
                cx="50"
                cy="50"
                r="18"
                fill={props.palette.center}
                stroke={props.palette.line}
                stroke-width="2"
            />
            <circle
                cx="50"
                cy="50"
                r="28"
                stroke={props.palette.line}
                stroke-width="3"
                stroke-dasharray="3 5"
                opacity="0.55"
            />
            {props.disc === "flower" ? (
                <>
                    <circle cx="50" cy="35" r="7.5" fill="#f7e8a1" />
                    <circle cx="37" cy="43" r="7.5" fill="#f7e8a1" />
                    <circle cx="63" cy="43" r="7.5" fill="#f7e8a1" />
                    <circle cx="42" cy="58" r="7.5" fill="#f7e8a1" />
                    <circle cx="58" cy="58" r="7.5" fill="#f7e8a1" />
                    <circle cx="50" cy="49" r="6.5" fill="#fff4cf" />
                </>
            ) : props.disc === "skull" ? (
                <>
                    <path
                        d="M50 32c-11 0-18 8-18 18 0 7 4 12 8 15v7h20v-7c4-3 8-8 8-15 0-10-7-18-18-18Z"
                        fill="#f3f0ea"
                        stroke={props.palette.line}
                        stroke-width="2.5"
                    />
                    <circle cx="43" cy="48" r="4.2" fill={props.palette.line} />
                    <circle cx="57" cy="48" r="4.2" fill={props.palette.line} />
                    <path
                        d="M50 52l-4 7h8l-4-7Z"
                        fill={props.palette.line}
                    />
                    <path
                        d="M42 66h16"
                        stroke={props.palette.line}
                        stroke-width="2.5"
                        stroke-linecap="round"
                    />
                </>
            ) : (
                <>
                    <circle
                        cx="50"
                        cy="50"
                        r="16"
                        stroke={props.palette.line}
                        stroke-width="2.5"
                    />
                    <path
                        d="M34 50h32M50 34v32M39 39l22 22M61 39 39 61"
                        stroke={props.palette.line}
                        stroke-width="2.2"
                        opacity="0.65"
                    />
                </>
            )}
        </svg>
    );
}
