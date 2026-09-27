export type PartyLayout = "table" | "controller";

export function PartyLayoutControls(props: {
    roomId: string;
    layout: PartyLayout;
    onChange: (layout: PartyLayout) => void;
}) {
    return (
        <div
            class="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#b8ae9e] text-[#1a1a1a]"
        >
            <button
                type="button"
                data-testid="party-layout-toggle"
                onClick={() =>
                    props.onChange(
                        props.layout === "controller" ? "table" : "controller",
                    )
                }
                class="min-h-10 border-2 border-[#1a1a1a] bg-[#f7f2de] px-4 pt-1 font-bebas tracking-wider shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
                {props.layout === "controller" ? "View table" : "Party mode"}
            </button>
            <a
                href={`/room/${encodeURIComponent(props.roomId)}?view=display`}
                target="_blank"
                rel="noopener noreferrer"
                class="font-bebas tracking-wider text-[#1a3a6e] underline underline-offset-4 decoration-2"
            >
                Open Party screen
            </a>
        </div>
    );
}
