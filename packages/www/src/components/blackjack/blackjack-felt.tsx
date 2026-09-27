import { createEffect, createMemo, createSignal, For, onSettled, Show } from "solid-js";
import {
    AnimatedNumber,
    ChipStack,
    PlayerAvatar,
    playSfx,
    TableCard,
    useArrivalBase,
} from "~/components/casino";
import type { Card } from "~/assets/card-deck/types";
import type {
    DealerView,
    PlayerHandView,
    PlayerInfoView,
    RoundResult,
} from "~/game/blackjack";
import type { BlackjackPhase } from "~/game/blackjack/schemas";

const SHOE = { x: 86, y: 9 };

const INK_EDGE =
    "border-[length:calc(var(--u)*0.25)] border-[#1a1a1a] shadow-[calc(var(--u)*0.3)_calc(var(--u)*0.3)_0_#1a1a1a]";
const DEALER_STEP_MS = 520;

export function handValueLabel(hand: PlayerHandView): string {
    if (hand.isBlackjack) return "BJ";
    if (hand.busted) return "BUST";
    const prefix = hand.soft ? "Soft " : "";
    return `${prefix}${hand.value}`;
}

export const OUTCOMES: Record<
    string,
    { label: string; badge: string; text: string }
> = {
    blackjack: {
        label: "BLACKJACK!",
        badge: "bg-[#f5c542] text-[#1a1a1a]",
        text: "text-[#a07800]",
    },
    win: {
        label: "WIN",
        badge: "bg-[#f7f2de] text-[#0f766e]",
        text: "text-[#0f766e]",
    },
    push: {
        label: "PUSH",
        badge: "bg-[#c9c0b0] text-[#1a1a1a]",
        text: "text-[#5a5040]",
    },
    lose: {
        label: "LOSE",
        badge: "bg-[#1a1a1a] text-[#f7f2de]",
        text: "text-[#1a1a1a]",
    },
    bust: {
        label: "BUST",
        badge: "bg-[#c0261a] text-[#f7f2de]",
        text: "text-[#c0261a]",
    },
};

export interface BlackjackFeltView {
    phase: BlackjackPhase;
    dealer: DealerView;
    players: PlayerInfoView[];
    currentPlayerIndex: number;
    results: RoundResult[] | null;
    shoeCount: number;
}

function spotPoint(index: number, count: number, portrait: boolean) {
    if (portrait) {
        const columns = count <= 2 ? count : 2;
        const row = Math.floor(index / columns);
        const column = index % columns;
        const inRow = Math.min(columns, count - row * columns);
        return {
            x: 50 + (column - (inRow - 1) / 2) * 46,
            y: 52 + row * 30,
        };
    }
    const spread = count <= 1 ? 0 : Math.min(124, 34 * (count - 1));
    const angle =
        count <= 1 ? 90 : 90 + spread / 2 - (index * spread) / (count - 1);
    const radians = (angle * Math.PI) / 180;
    return {
        x: 50 + 40 * Math.cos(radians),
        y: 6 + 64 * Math.sin(radians),
    };
}

export function BlackjackFelt(props: {
    view: BlackjackFeltView;
    heroId?: string | null;
    seatTestIdPrefix?: string;
    dealerTestId: string;
}) {
    let container: HTMLDivElement | undefined;
    const [portrait, setPortrait] = createSignal(false);

    onSettled(() => {
        if (!container || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(([entry]) => {
            setPortrait(entry.contentRect.width < 640);
        });
        observer.observe(container.parentElement ?? container);
        return () => observer.disconnect();
    });

    const dealerCards = () => props.view.dealer.cards;
    const dealerBase = useArrivalBase(
        () => dealerCards().filter((card) => card !== "hidden").length,
    );
    const dealerRevealDelay = () =>
        Math.max(
            0,
            dealerCards().filter((card) => card !== "hidden").length -
                Math.max(dealerBase(), 1),
        ) * DEALER_STEP_MS;
    const initialDeal = () =>
        props.view.players.every((player) =>
            player.hands.every((hand) => hand.cards.length <= 2),
        );
    createEffect(
        () =>
            props.view.players.reduce(
                (sum, player) =>
                    sum +
                    player.hands.reduce((count, hand) => count + hand.cards.length, 0),
                0,
            ),
        (count, previous) => {
            if (previous === undefined || count <= previous) return;
            const step = count - previous > 2 ? 140 : 0;
            for (let index = 0; index < Math.min(12, count - previous); index++)
                playSfx("deal", index * step);
        },
    );
    createEffect(
        () => dealerCards().filter((card) => card !== "hidden").length,
        (count, previous) => {
            if (previous === undefined || count <= previous) return;
            for (let index = 0; index < count - previous; index++)
                playSfx("flip", index * DEALER_STEP_MS);
        },
    );
    createEffect(
        () => props.view.players.reduce((sum, player) => sum + player.bet, 0),
        (total, previous) => {
            if (previous !== undefined && total > previous) playSfx("chip");
        },
    );
    createEffect(
        () => ({
            phase: props.view.phase,
            anyWin: (props.view.results ?? []).some((result) => result.netChips > 0),
            delay: dealerRevealDelay(),
        }),
        (next, previous) => {
            if (!previous || next.phase !== "settled" || previous.phase === "settled") return;
            playSfx(next.anyWin ? "win" : "lose", next.delay + 200);
        },
    );

    const current = () =>
        props.view.phase === "playing"
            ? props.view.players[props.view.currentPlayerIndex]?.id
            : undefined;

    return (
        <div
            ref={container}
            data-testid="blackjack-felt"
            class="relative w-full mx-auto [container-type:size] select-none"
            style={{
                "aspect-ratio": portrait() ? "3 / 4.2" : "2.1 / 1",
                "--u": portrait() ? "2.3cqw" : "1cqw",
            }}
        >
            <div class="absolute inset-[0_1%_2%_1%] rounded-b-[50%_100%] bg-[#1a1a1a] translate-x-[calc(var(--u)*0.9)] translate-y-[calc(var(--u)*0.9)]" />
            <div class="absolute inset-[0_1%_2%_1%] rounded-b-[50%_100%] bg-[#c0261a] border-[length:calc(var(--u)*0.4)] border-[#1a1a1a]" />
            <div
                class="table-mat absolute inset-[0_calc(1%+var(--u)*2.4)_calc(2%+var(--u)*2.4)_calc(1%+var(--u)*2.4)] rounded-b-[50%_100%] overflow-hidden border-[length:calc(var(--u)*0.4)] border-t-0 border-[#1a1a1a]"
                style={{ "--mat": "#0f766e" }}
            >
                <div class="absolute inset-x-0 top-0 h-[calc(var(--u)*1.2)] bg-[#1a1a1a]" />
                <Show when={!portrait()}>
                    <svg
                        viewBox="0 0 210 100"
                        class="absolute inset-0 w-full h-full"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                    >
                        <defs>
                            <path id="bj-arc-1" d="M 60 12 A 45 23 0 0 0 150 12" />
                            <path id="bj-arc-2" d="M 54 12 A 51 29 0 0 0 156 12" />
                        </defs>
                        <text
                            font-family="'Bebas Neue', sans-serif"
                            font-size="4.4"
                            letter-spacing="1"
                            fill="#f5c542"
                            fill-opacity="0.9"
                        >
                            <textPath href="#bj-arc-1" startOffset="50%" text-anchor="middle">
                                BLACKJACK PAYS 3 TO 2
                            </textPath>
                        </text>
                        <text
                            font-family="'Bebas Neue', sans-serif"
                            font-size="2.2"
                            letter-spacing="0.5"
                            fill="#f7f2de"
                            fill-opacity="0.55"
                        >
                            <textPath href="#bj-arc-2" startOffset="50%" text-anchor="middle">
                                DEALER DRAWS TO 16 · STANDS ON ALL 17s · INSURANCE PAYS 2 TO 1
                            </textPath>
                        </text>
                    </svg>
                </Show>
            </div>

            <div class="absolute z-10 -translate-x-1/2" style={{ left: `${SHOE.x}%`, top: "1.5%" }}>
                <div class={`relative w-[calc(var(--u)*7)] h-[calc(var(--u)*6)] rounded-[calc(var(--u)*0.6)] bg-[#c9c0b0] flex items-end justify-center pb-[calc(var(--u)*0.4)] ${INK_EDGE}`}>
                    <div class="absolute -top-[calc(var(--u)*1.2)] left-[calc(var(--u)*1)] w-[calc(var(--u)*4.6)] rotate-[-8deg]">
                        <TableCard card={null} animate={false} class="w-full" />
                    </div>
                    <span class="relative font-bebas text-[calc(var(--u)*1.1)] tracking-wider text-[#1a1a1a]">
                        Shoe {props.view.shoeCount}
                    </span>
                </div>
            </div>

            <div
                data-testid={props.dealerTestId}
                class="absolute z-10 left-1/2 top-[3%] -translate-x-1/2 flex flex-col items-center"
            >
                <span class="font-bebas tracking-[.3em] text-[calc(var(--u)*1.5)] text-[#f7f2de]/80">
                    DEALER
                </span>
                <div class="relative flex items-start mt-[calc(var(--u)*0.4)] min-h-[calc(var(--u)*8.4)]">
                    <For each={dealerCards()} keyed={false}>
                        {(card, index) => (
                            <div
                                class={index > 0 ? "-ml-[calc(var(--u)*2.6)]" : ""}
                                style={{
                                    "--deal-from-x": `${SHOE.x - 50}cqw`,
                                    "--deal-from-y": `${SHOE.y - 10}cqh`,
                                }}
                            >
                                <Show
                                    when={card() !== "hidden" ? (card() as Card) : null}
                                    fallback={
                                        <div data-testid="blackjack-dealer-hidden">
                                            <TableCard
                                                card={null}
                                                class="w-[calc(var(--u)*6)]"
                                                delay={initialDeal() ? (index * (props.view.players.length + 1) + props.view.players.length) * 140 : 0}
                                            />
                                        </div>
                                    }
                                >
                                    {(visible) => (
                                        <TableCard
                                            card={visible()}
                                            class="w-[calc(var(--u)*6)]"
                                            delay={
                                                index < 2 && initialDeal() && dealerBase() === 0
                                                    ? (index * (props.view.players.length + 1) + props.view.players.length) * 140
                                                    : Math.max(0, index - Math.max(dealerBase(), 1)) * DEALER_STEP_MS
                                            }
                                        />
                                    )}
                                </Show>
                            </div>
                        )}
                    </For>
                    <Show
                        when={
                            props.view.dealer.value ??
                            props.view.dealer.upCardValue
                        }
                    >
                        {(value) => (
                            <span
                                class={`absolute -right-[calc(var(--u)*4.8)] top-1/2 -translate-y-1/2 min-w-[calc(var(--u)*3.6)] text-center rounded-[calc(var(--u)*0.5)] px-[calc(var(--u)*0.8)] pt-[calc(var(--u)*0.4)] pb-[calc(var(--u)*0.1)] font-bebas text-[calc(var(--u)*2)] leading-snug animate-stamp-in ${INK_EDGE} ${props.view.dealer.busted ? "bg-[#c0261a] text-[#f7f2de]" : "bg-[#f7f2de] text-[#1a1a1a]"}`}
                                style={{ "animation-delay": `${dealerRevealDelay()}ms` }}
                            >
                                {props.view.dealer.busted ? "BUST" : value()}
                            </span>
                        )}
                    </Show>
                </div>
            </div>

            <For each={props.view.players} keyed={false}>
                {(player, index) => {
                    const point = () =>
                        spotPoint(index, props.view.players.length, portrait());
                    const result = () =>
                        props.view.results?.find(
                            (entry) => entry.playerId === player().id,
                        );
                    const isTurn = () => current() === player().id;
                    const scale = () =>
                        props.view.players.length > 5 ? 0.8 : 1;
                    return (
                        <div
                            data-testid={
                                props.seatTestIdPrefix
                                    ? `${props.seatTestIdPrefix}-${player().id}`
                                    : undefined
                            }
                            data-acting={String(isTurn())}
                            class="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700"
                            style={{
                                left: `${point().x}%`,
                                top: `${point().y}%`,
                                scale: String(scale()),
                            }}
                        >
                            <SpotContent
                                player={player()}
                                spotIndex={index}
                                spotCount={props.view.players.length}
                                point={point()}
                                isTurn={isTurn()}
                                isHero={player().id === props.heroId}
                                phase={props.view.phase}
                                result={result()}
                                revealDelay={dealerRevealDelay()}
                            />
                        </div>
                    );
                }}
            </For>
        </div>
    );
}

function SpotContent(props: {
    player: PlayerInfoView;
    spotIndex: number;
    spotCount: number;
    point: { x: number; y: number };
    isTurn: boolean;
    isHero: boolean;
    phase: BlackjackPhase;
    result: RoundResult | undefined;
    revealDelay: number;
}) {
    return (
        <div
            data-testid={`blackjack-player-${props.player.id}`}
            data-current-turn={props.isTurn ? "true" : "false"}
            class="relative flex flex-col items-center"
        >
            <Show when={props.isTurn}>
                <div class="absolute -top-[calc(var(--u)*3.4)] left-1/2 -translate-x-1/2 text-[#f5c542] text-[calc(var(--u)*2.6)] leading-none animate-bounce [-webkit-text-stroke:calc(var(--u)*0.2)_#1a1a1a] [paint-order:stroke]">
                    ▼
                </div>
            </Show>
            <div class="flex items-end gap-[calc(var(--u)*1.4)] min-h-[calc(var(--u)*9)]">
                <For each={props.player.hands} keyed={false}>
                    {(hand, handIndex) => (
                        <SpotHand
                            hand={hand()}
                            playerId={props.player.id}
                            handIndex={handIndex}
                            active={
                                props.isTurn &&
                                handIndex === props.player.currentHandIndex
                            }
                            multi={props.player.hands.length > 1}
                            spotIndex={props.spotIndex}
                            spotCount={props.spotCount}
                            point={props.point}
                            outcome={props.result?.hands[handIndex]?.outcome}
                            revealDelay={props.revealDelay}
                        />
                    )}
                </For>
            </div>

            <div
                class={`relative mt-[calc(var(--u)*0.8)] w-[calc(var(--u)*7)] h-[calc(var(--u)*7)] rounded-full border-[length:calc(var(--u)*0.3)] flex items-center justify-center transition-all duration-300 ${props.isTurn ? "border-solid border-[#f5c542] bg-[#f5c542]/20" : "border-dashed border-[#f7f2de]/45"}`}
            >
                <Show
                    when={props.player.bet > 0 ? props.player.bet : null}
                    keyed
                    fallback={
                        <span class="font-bebas text-[calc(var(--u)*1.1)] tracking-[.2em] text-[#f7f2de]/55 text-center leading-tight">
                            {props.phase === "betting" ? "Betting…" : ""}
                        </span>
                    }
                >
                    {(bet) => (
                        <div
                            class="animate-chip-toss"
                            style={{ "--toss-y": "12cqh" }}
                        >
                            <ChipStack
                                amount={bet}
                                size={20}
                                labelClass="text-[calc(var(--u)*1.3)]"
                                class="[&_svg]:w-[calc(var(--u)*2.8)] [&_svg]:h-[calc(var(--u)*2.8)]"
                            />
                        </div>
                    )}
                </Show>
                <Show when={props.player.insuranceBet > 0}>
                    <span class="absolute -right-[calc(var(--u)*2.6)] top-0 rounded-[calc(var(--u)*0.3)] border-[length:calc(var(--u)*0.15)] border-[#1a1a1a] bg-[#1a3a6e] px-[calc(var(--u)*0.5)] pt-[calc(var(--u)*0.15)] font-bebas text-[calc(var(--u)*1)] text-[#f7f2de]">
                        INS {props.player.insuranceBet}
                    </span>
                </Show>
            </div>

            <div
                class={`relative mt-[calc(var(--u)*0.9)] flex items-center gap-[calc(var(--u)*0.7)] rounded-[calc(var(--u)*0.7)] pr-[calc(var(--u)*1.1)] transition-colors duration-300 ${INK_EDGE} ${props.isTurn ? "bg-[#f5c542] animate-nudge" : "bg-[#f7f2de]"}`}
            >
                <PlayerAvatar
                    id={props.player.id}
                    name={props.player.name}
                    index={props.spotIndex}
                    class="w-[calc(var(--u)*3.6)] h-[calc(var(--u)*3.6)] text-[calc(var(--u)*1.9)] -ml-[calc(var(--u)*0.6)] !border-[length:calc(var(--u)*0.25)] !shadow-none"
                />
                <div class="py-[calc(var(--u)*0.3)]">
                    <div class="font-bebas tracking-wider text-[#1a1a1a] text-[calc(var(--u)*1.5)] leading-none max-w-[calc(var(--u)*10)] truncate">
                        {props.player.name}
                        <Show when={props.isHero}>
                            <span class="text-[#c0261a]"> · You</span>
                        </Show>
                    </div>
                    <div class="font-bebas tracking-wide text-[#1a3a6e] text-[calc(var(--u)*1.6)] leading-none">
                        $<AnimatedNumber value={props.player.chips} />
                    </div>
                </div>
                <Show when={props.result && props.result.netChips !== 0 ? props.result : null} keyed>
                    {(result) => (
                        <span
                            class={`absolute left-1/2 -translate-x-1/2 -bottom-[calc(var(--u)*3)] whitespace-nowrap rounded-[calc(var(--u)*0.4)] px-[calc(var(--u)*0.8)] pt-[calc(var(--u)*0.35)] font-bebas text-[calc(var(--u)*1.8)] leading-none animate-stamp-in ${INK_EDGE} ${result.netChips > 0 ? "bg-[#f5c542] text-[#1a1a1a]" : "bg-[#1a1a1a] text-[#f7f2de]"}`}
                            style={{ "animation-delay": `${props.revealDelay + 250}ms` }}
                        >
                            {result.netChips > 0 ? "+" : "−"}$
                            {Math.abs(result.netChips)}
                        </span>
                    )}
                </Show>
            </div>
        </div>
    );
}

function SpotHand(props: {
    hand: PlayerHandView;
    playerId: string;
    handIndex: number;
    active: boolean;
    multi: boolean;
    spotIndex: number;
    spotCount: number;
    point: { x: number; y: number };
    outcome: string | undefined;
    revealDelay: number;
}) {
    const base = useArrivalBase(() => props.hand.cards.length);
    const delayFor = (index: number) =>
        base() === 0
            ? (index * (props.spotCount + 1) + props.spotIndex) * 140
            : Math.max(0, index - base()) * 120;
    const outcome = createMemo(() =>
        props.outcome ? OUTCOMES[props.outcome] : undefined,
    );
    return (
        <div
            data-testid={`blackjack-hand-${props.playerId}-${props.handIndex}`}
            data-card-count={props.hand.cards.length}
            data-value={handValueLabel(props.hand)}
            class={`relative flex flex-col items-center rounded-[calc(var(--u)*1)] transition-all duration-300 ${props.active && props.multi ? "outline-[length:calc(var(--u)*0.3)] outline-dashed outline-offset-[calc(var(--u)*0.8)] outline-[#f5c542]" : ""}`}
        >
            <div
                class="relative flex items-end"
                style={{
                    "--deal-from-x": `${SHOE.x - props.point.x}cqw`,
                    "--deal-from-y": `${SHOE.y - props.point.y + 10}cqh`,
                }}
            >
                <For each={props.hand.cards} keyed={false}>
                    {(card, index) => (
                        <div
                            class={index > 0 ? "-ml-[calc(var(--u)*3.4)]" : ""}
                            style={{
                                transform: `translateY(${-index * 0.7}cqw) rotate(${(index - (props.hand.cards.length - 1) / 2) * 4}deg)`,
                            }}
                        >
                            <TableCard
                                card={card()}
                                class="w-[calc(var(--u)*5.4)]"
                                delay={delayFor(index)}
                                dimmed={props.hand.busted}
                            />
                        </div>
                    )}
                </For>
                <Show when={props.hand.cards.length > 0 && !(props.hand.busted && outcome()) ? handValueLabel(props.hand) : null} keyed>
                    {(label) => (
                        <span
                            class={`absolute -top-[calc(var(--u)*1.4)] -right-[calc(var(--u)*1.8)] z-10 min-w-[calc(var(--u)*3)] text-center rounded-[calc(var(--u)*0.4)] px-[calc(var(--u)*0.6)] pt-[calc(var(--u)*0.3)] font-bebas text-[calc(var(--u)*1.6)] leading-snug animate-pop-in ${INK_EDGE} ${props.hand.isBlackjack ? "bg-[#f5c542] text-[#1a1a1a]" : props.hand.busted ? "bg-[#c0261a] text-[#f7f2de]" : "bg-[#f7f2de] text-[#1a1a1a]"}`}
                            style={{ "animation-delay": `${delayFor(props.hand.cards.length - 1) + 380}ms` }}
                        >
                            {label}
                        </span>
                    )}
                </Show>
                <Show when={outcome()} keyed>
                    {(style) => (
                        <span
                            class={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 whitespace-nowrap rounded-[calc(var(--u)*0.4)] px-[calc(var(--u)*1.1)] pt-[calc(var(--u)*0.45)] pb-[calc(var(--u)*0.1)] font-bebas tracking-wider text-[calc(var(--u)*2.1)] leading-snug animate-stamp-in ${INK_EDGE} ${style.badge}`}
                            style={{
                                "animation-delay": `${props.revealDelay}ms`,
                                "--stamp-rot": props.spotIndex % 2 === 0 ? "-6deg" : "5deg",
                            }}
                        >
                            {style.label}
                        </span>
                    )}
                </Show>
            </div>
            <Show when={props.hand.doubled}>
                <span class="mt-[calc(var(--u)*0.5)] rounded-[calc(var(--u)*0.3)] border-[length:calc(var(--u)*0.15)] border-[#1a1a1a] bg-[#f5c542] px-[calc(var(--u)*0.5)] pt-[calc(var(--u)*0.15)] font-bebas text-[calc(var(--u)*1)] text-[#1a1a1a]">
                    DOUBLED
                </span>
            </Show>
        </div>
    );
}
