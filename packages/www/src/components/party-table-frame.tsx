import type { JSX } from "@solidjs/web";

export function PartyTableFrame(props: {
    game: string;
    title: string;
    round: number;
    phase: string;
    status: string;
    children: JSX.Element;
}) {
    return (
        <section
            data-testid={`${props.game}-table-display`}
            class="mx-auto w-full max-w-[1600px] px-6 py-5"
        >
            <div class="flex items-center justify-between gap-4 mb-6 font-bebas tracking-wider">
                <h1 class="text-4xl">{props.title}</h1>
                <span class="text-2xl">
                    Round {props.round} · {props.phase.replaceAll("_", " ")}
                </span>
            </div>
            <p
                role="status"
                class="text-center font-bebas text-4xl tracking-wider mb-6 text-[#1a3a6e]"
            >
                {props.status}
            </p>
            {props.children}
        </section>
    );
}
