import { createEffect, createMemo, createSignal, For, onCleanup, onSettled, Show, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";
import {
    AnimatedNumber,
    CardSlot,
    ChipStack,
    PlayerAvatar,
    playSfx,
    TableCard,
    useArrivalBase,
} from "~/components/casino";
import type { Card } from "~/assets/card-deck/types";
import type {
    PokerEvent,
    PokerPlayerPublicView,
    PokerPot,
    PokerStreet,
} from "~/game/poker";
import {
    cardKey,
    lastSeatActions,
    potResults,
    winningsByPlayer,
    type SeatAction,
} from "./hand-events";

interface Point {
    x: number;
    y: number;
}

const ACTION_TONES: Record<SeatAction["tone"], string> = {
    fold: "bg-[#9a9080] text-[#f7f2de]",
    check: "bg-[#1a3a6e] text-[#f7f2de]",
    call: "bg-[#0f766e] text-[#f7f2de]",
    raise: "bg-[#f5c542] text-[#1a1a1a]",
    all_in: "bg-[#c0261a] text-[#f7f2de]",
};

const INK_EDGE =
    "border-[length:calc(var(--u)*0.25)] border-[#1a1a1a] shadow-[calc(var(--u)*0.35)_calc(var(--u)*0.35)_0_#1a1a1a]";

function ellipsePoint(index: number, count: number, rx: number, ry: number, offset = 0): Point {
    const angle = ((90 + (index * 360) / Math.max(count, 1) + offset) * Math.PI) / 180;
    return { x: 50 + rx * Math.cos(angle), y: 50 + ry * Math.sin(angle) };
}

export function PokerFelt(props: {
    players: PokerPlayerPublicView[];
    board: Card[];
    pots: PokerPot[];
    street: PokerStreet;
    handNumber: number;
    eventLog: PokerEvent[];
    title: string;
    heroId?: string | null;
    heroCards?: Card[];
    center?: JSX.Element;
    seatTestIdPrefix?: string;
}) {
    let container: HTMLDivElement | undefined;
    const [portrait, setPortrait] = createSignal(false);

    onSettled(() => {
        if (!container || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width;
            setPortrait(width < 640);
        });
        observer.observe(container.parentElement ?? container);
        return () => observer.disconnect();
    });

    const seats = createMemo(() => {
        const heroIndex = props.players.findIndex((player) => player.id === props.heroId);
        if (heroIndex <= 0) return props.players;
        return [...props.players.slice(heroIndex), ...props.players.slice(0, heroIndex)];
    });

    const geometry = () =>
        portrait()
            ? { seat: [36, 40], bet: [22, 25], button: [29, 33] }
            : { seat: [41, 39], bet: [29, 20], button: [34, 27] };

    const seatPoint = (index: number) =>
        ellipsePoint(index, seats().length, geometry().seat[0], geometry().seat[1]);
    const betPoint = (index: number) =>
        ellipsePoint(index, seats().length, geometry().bet[0], geometry().bet[1]);
    const buttonPoint = (index: number) =>
        ellipsePoint(index, seats().length, geometry().button[0], geometry().button[1], seats().length > 2 ? 14 : 22);

    const flash = useStreetFlash(() => props.street);
    const finished = () =>
        ["hand_over", "tournament_over"].includes(props.street);
    const actions = (): ReturnType<typeof lastSeatActions> =>
        finished() ? {} : lastSeatActions(props.eventLog);
    const results = () =>
        ["hand_over", "tournament_over", "showdown"].includes(props.street)
            ? potResults(props.eventLog, props.players)
            : [];
    const winnings = () => winningsByPlayer(results());
    const winningCards = () => {
        const keys = new Set<string>();
        for (const result of results()) for (const card of result.winningCards) keys.add(cardKey(card));
        return keys;
    };
    const totalPot = () => props.pots.reduce((sum, pot) => sum + pot.amount, 0);
    const collectedPot = () =>
        Math.max(
            0,
            totalPot() -
                props.players.reduce((sum, player) => sum + player.committedThisStreet, 0),
        );

    createEffect(
        () => props.board.length,
        (length, previous) => {
            if (previous === undefined || length <= previous) return;
            for (let index = 0; index < length - previous; index++)
                playSfx("flip", index * 170);
        },
    );
    createEffect(
        () => ({
            hand: props.handNumber,
            cards: Math.min(
                12,
                props.players.filter((player) => player.holeCardCount > 0).length * 2,
            ),
        }),
        (next, previous) => {
            if (previous === undefined || next.hand === previous.hand) return;
            for (let index = 0; index < next.cards; index++)
                playSfx("deal", index * 110);
        },
    );
    createEffect(
        () => props.players.reduce((sum, player) => sum + player.committedThisStreet, 0),
        (total, previous) => {
            if (previous !== undefined && total > previous) playSfx("chip");
        },
    );
    createEffect(
        () => results().length,
        (count, previous) => {
            if (previous !== undefined && count > previous) playSfx("win", 250);
        },
    );

    const boardBase = useArrivalBase(
        () => props.board.length,
        untrack(() => props.board.length),
    );

    const seatCards = (player: PokerPlayerPublicView): (Card | null)[] => {
        if (player.visibleHoleCards.length > 0) return player.visibleHoleCards;
        if (player.id === props.heroId && (props.heroCards?.length ?? 0) > 0) return props.heroCards!;
        return Array.from({ length: player.holeCardCount }, () => null);
    };

    return (
        <div
            ref={container}
            data-testid="poker-felt"
            class="relative w-full mx-auto [container-type:size] select-none"
            style={{
                "aspect-ratio": portrait() ? "3 / 4" : "2.15 / 1",
                "--u": portrait() ? "2.3cqw" : "1cqw",
            }}
        >
            <div class="absolute inset-[4%_4%] rounded-full bg-[#1a1a1a] translate-x-[calc(var(--u)*0.9)] translate-y-[calc(var(--u)*0.9)]" />
            <div class="absolute inset-[4%_4%] rounded-full bg-[#c0261a] border-[length:calc(var(--u)*0.4)] border-[#1a1a1a]" />
            <div class="table-mat absolute inset-[calc(4%+var(--u)*2.4)_calc(4%+var(--u)*2.4)] rounded-full border-[length:calc(var(--u)*0.4)] border-[#1a1a1a] overflow-hidden">
                <div class="absolute inset-[calc(var(--u)*3)] rounded-full border-[length:calc(var(--u)*0.25)] border-dashed border-[#f7f2de]/20" />
                <div class="absolute inset-x-0 top-[15%] text-center font-bebas tracking-[.3em] text-[#f7f2de]/15 text-[calc(var(--u)*3.4)] leading-none">
                    {props.title}
                </div>
            </div>

            <div class="absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[calc(var(--u)*1.2)] z-10">
                <div data-testid="poker-board" class="flex gap-[calc(var(--u)*0.8)]">
                    <For each={[0, 1, 2, 3, 4]} keyed={false}>
                        {(slot) => (
                            <Show
                                when={props.board[slot()]}
                                fallback={<CardSlot class="w-[calc(var(--u)*6.4)]" />}
                            >
                                {(card) => (
                                    <TableCard
                                        card={card()}
                                        class="w-[calc(var(--u)*6.4)]"
                                        delay={Math.max(0, slot() - boardBase()) * 170}
                                        highlight={winningCards().has(cardKey(card()))}
                                        dimmed={winningCards().size > 0 && !winningCards().has(cardKey(card()))}
                                    />
                                )}
                            </Show>
                        )}
                    </For>
                </div>
                <div class="flex items-center gap-[calc(var(--u)*1)] min-h-[calc(var(--u)*4)]">
                    <Show when={!finished() || totalPot() > 0}>
                    <Show when={collectedPot() > 0}>
                        <ChipStack amount={collectedPot()} size={22} showLabel={false} class="[&_svg]:w-[calc(var(--u)*2.4)] [&_svg]:h-[calc(var(--u)*2.4)]" />
                    </Show>
                    <div
                        data-testid="poker-pot-total"
                        class={`rounded-[calc(var(--u)*0.5)] bg-[#f7f2de] px-[calc(var(--u)*1.4)] pt-[calc(var(--u)*0.5)] pb-[calc(var(--u)*0.3)] font-bebas tracking-wider text-[#1a1a1a] text-[calc(var(--u)*2)] leading-none ${INK_EDGE}`}
                    >
                        Pot <AnimatedNumber value={totalPot()} class="text-[#c0261a]" />
                    </div>
                    </Show>
                    <Show when={props.pots.length > 1}>
                        <For each={props.pots.slice(1)} keyed={false}>
                            {(pot, index) => (
                                <span class="rounded-[calc(var(--u)*0.4)] border-[length:calc(var(--u)*0.2)] border-[#1a1a1a] bg-[#c9c0b0] px-[calc(var(--u)*0.9)] pt-[calc(var(--u)*0.35)] pb-[calc(var(--u)*0.2)] font-bebas tracking-wider text-[#1a1a1a] text-[calc(var(--u)*1.4)] leading-none">
                                    Side {index + 1}: {pot().amount}
                                </span>
                            )}
                        </For>
                    </Show>
                </div>
                <div class="absolute left-1/2 top-[calc(100%-var(--u)*4)] -translate-x-1/2">
                    {props.center}
                </div>
            </div>

            <Show when={flash()} keyed>
                {(street) => (
                    <div class="pointer-events-none absolute inset-x-0 top-[14%] z-40 flex justify-center">
                        <div class="font-bebas text-[calc(var(--u)*6)] leading-none tracking-[.14em] text-[#f7f2de] bg-[#c0261a] border-[length:calc(var(--u)*0.4)] border-[#1a1a1a] px-[calc(var(--u)*2.6)] pt-[calc(var(--u)*0.8)] pb-[calc(var(--u)*0.3)] shadow-[calc(var(--u)*0.7)_calc(var(--u)*0.7)_0_#1a1a1a] animate-float-up">
                            {street}
                        </div>
                    </div>
                )}
            </Show>

            <For each={seats()} keyed={false}>
                {(player, index) => {
                    const point = () => seatPoint(index);
                    const bet = () => betPoint(index);
                    const winSpot = () => ({
                        x: point().x + (point().x <= 50 ? 11 : -11),
                        y: point().y,
                    });
                    const won = () => winnings()[player().id] ?? 0;
                    const action = () => actions()[player().id];
                    const out = () =>
                        player().status === "folded" || player().status === "busted";
                    const cardsBelow = () => point().y < 35;
                    return (
                        <>
                            <Show when={player().isDealer}>
                                <div
                                    class={`absolute z-20 -translate-x-1/2 -translate-y-1/2 w-[calc(var(--u)*2.8)] h-[calc(var(--u)*2.8)] rounded-full bg-[#f7f2de] flex items-center justify-center pt-[calc(var(--u)*0.2)] font-bebas text-[calc(var(--u)*1.7)] text-[#1a1a1a] transition-all duration-700 ease-out ${INK_EDGE}`}
                                    style={{ left: `${buttonPoint(index).x}%`, top: `${buttonPoint(index).y}%` }}
                                >
                                    D
                                </div>
                            </Show>

                            <Show when={player().committedThisStreet > 0 ? player().committedThisStreet : null} keyed>
                                {(amount) => (
                                    <div
                                        data-testid={`poker-bet-${player().id}`}
                                        class="absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-chip-toss"
                                        style={{
                                            left: `${bet().x}%`,
                                            top: `${bet().y}%`,
                                            "--toss-x": `${point().x - bet().x}cqw`,
                                            "--toss-y": `${point().y - bet().y}cqh`,
                                        }}
                                    >
                                        <ChipStack
                                            amount={amount}
                                            size={20}
                                            labelClass="text-[calc(var(--u)*1.5)]"
                                            class="[&_svg]:w-[calc(var(--u)*2.2)] [&_svg]:h-[calc(var(--u)*2.2)]"
                                        />
                                    </div>
                                )}
                            </Show>

                            <Show when={won() > 0 ? won() : null} keyed>
                                {(amount) => (
                                    <div
                                        class="absolute z-30 -translate-x-1/2 -translate-y-1/2 animate-chip-toss [animation-duration:900ms]"
                                        style={{
                                            left: `${winSpot().x}%`,
                                            top: `${winSpot().y}%`,
                                            "--toss-x": `${50 - winSpot().x}cqw`,
                                            "--toss-y": `${55 - winSpot().y}cqh`,
                                        }}
                                    >
                                        <ChipStack
                                            amount={amount}
                                            size={20}
                                            labelClass="text-[calc(var(--u)*1.6)] !bg-[#f5c542]"
                                            class="[&_svg]:w-[calc(var(--u)*2.4)] [&_svg]:h-[calc(var(--u)*2.4)]"
                                        />
                                    </div>
                                )}
                            </Show>

                            <div
                                data-testid={`${props.seatTestIdPrefix ?? "poker-seat"}-${player().id}`}
                                data-status={player().status}
                                data-acting={String(player().isActing)}
                                data-connected={String(player().connected)}
                                data-visible-card-count={player().visibleHoleCards.length}
                                data-hole-card-count={player().holeCardCount}
                                class={`absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center w-[calc(var(--u)*16)] transition-[left,top] duration-700 ${cardsBelow() ? "flex-col-reverse" : "flex-col"}`}
                                style={{ left: `${point().x}%`, top: `${point().y}%` }}
                            >
                                <Show when={String(props.handNumber)} keyed>
                                    {(_hand) => (
                                        <div
                                            class={`flex justify-center ${player().id === props.heroId ? "h-[calc(var(--u)*8.5)]" : "h-[calc(var(--u)*6.5)]"} ${cardsBelow() ? "mt-[calc(var(--u)*0.6)] items-start" : "-mb-[calc(var(--u)*1.8)]"} transition-all duration-500 ${out() ? "opacity-0 translate-y-[calc(var(--u)*2)] scale-75" : ""}`}
                                            style={{
                                                "--deal-from-x": `${50 - point().x}cqw`,
                                                "--deal-from-y": `${50 - point().y}cqh`,
                                            }}
                                        >
                                            <For each={seatCards(player())} keyed={false}>
                                                {(card, cardIndex) => (
                                                    <div
                                                        class={cardIndex === 0 ? "-rotate-6 translate-x-[calc(var(--u)*0.6)]" : "rotate-6 -translate-x-[calc(var(--u)*0.6)]"}
                                                    >
                                                        <TableCard
                                                            card={card()}
                                                            class={player().id === props.heroId ? "w-[calc(var(--u)*6.8)]" : "w-[calc(var(--u)*5.2)]"}
                                                            delay={(cardIndex * seats().length + index) * 110}
                                                            highlight={!!card() && winningCards().has(cardKey(card()!))}
                                                        />
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    )}
                                </Show>

                                <div
                                    class={`relative w-full flex items-center gap-[calc(var(--u)*0.8)] rounded-[calc(var(--u)*0.8)] pr-[calc(var(--u)*1.2)] transition-[background-color,opacity,filter] duration-300 ${INK_EDGE} ${
                                        won() > 0
                                            ? "bg-[#f5c542] animate-wiggle"
                                            : player().isActing
                                              ? "bg-[#f5c542] animate-nudge"
                                              : "bg-[#f7f2de]"
                                    } ${out() ? "opacity-60 grayscale" : ""}`}
                                >
                                    <PlayerAvatar
                                        id={player().id}
                                        name={player().name}
                                        index={props.players.findIndex((entry) => entry.id === player().id)}
                                        class="w-[calc(var(--u)*4.6)] h-[calc(var(--u)*4.6)] text-[calc(var(--u)*2.4)] -ml-[calc(var(--u)*0.8)] !border-[length:calc(var(--u)*0.25)] !shadow-none"
                                    />
                                    <div class="min-w-0 flex-1 py-[calc(var(--u)*0.5)]">
                                        <div class="font-bebas tracking-wider text-[#1a1a1a] text-[calc(var(--u)*1.75)] leading-none truncate">
                                            {player().name}
                                            <Show when={player().id === props.heroId}>
                                                <span class="text-[#c0261a]"> · You</span>
                                            </Show>
                                        </div>
                                        <div class="font-bebas tracking-wide text-[#1a3a6e] text-[calc(var(--u)*1.9)] leading-none mt-[calc(var(--u)*0.2)]">
                                            <AnimatedNumber value={player().stack} />
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-[calc(var(--u)*0.2)]">
                                        <Show when={player().isSmallBlind}>
                                            <span class="rounded-[calc(var(--u)*0.3)] border-[length:calc(var(--u)*0.15)] border-[#1a1a1a] bg-[#1a3a6e] px-[calc(var(--u)*0.5)] pt-[calc(var(--u)*0.15)] font-bebas text-[calc(var(--u)*1.1)] text-[#f7f2de] leading-snug">
                                                SB
                                            </span>
                                        </Show>
                                        <Show when={player().isBigBlind}>
                                            <span class="rounded-[calc(var(--u)*0.3)] border-[length:calc(var(--u)*0.15)] border-[#1a1a1a] bg-[#c0261a] px-[calc(var(--u)*0.5)] pt-[calc(var(--u)*0.15)] font-bebas text-[calc(var(--u)*1.1)] text-[#f7f2de] leading-snug">
                                                BB
                                            </span>
                                        </Show>
                                    </div>

                                    <Show
                                        when={
                                            won() > 0
                                                ? { label: `Wins ${won()}`, cls: "bg-[#c0261a] text-[#f7f2de]", key: `won-${won()}` }
                                                : !player().connected
                                                  ? { label: "Offline", cls: "bg-[#9a9080] text-[#f7f2de]", key: "offline" }
                                                  : player().status === "all_in"
                                                    ? { label: "All-in", cls: "bg-[#c0261a] text-[#f7f2de]", key: "all_in" }
                                                    : player().status === "busted"
                                                      ? { label: "Busted", cls: "bg-[#1a1a1a] text-[#f7f2de]", key: "busted" }
                                                      : action()
                                                        ? { label: action()!.label, cls: ACTION_TONES[action()!.tone], key: `a-${action()!.id}` }
                                                        : player().isActing
                                                          ? { label: "Thinking…", cls: "bg-[#f7f2de] text-[#1a1a1a]", key: "thinking" }
                                                          : null
                                        }
                                        keyed
                                    >
                                        {(badge) => (
                                            <span
                                                class={`absolute left-1/2 ${cardsBelow() ? "-top-[calc(var(--u)*2.9)]" : "-bottom-[calc(var(--u)*2.1)]"} -translate-x-1/2 whitespace-nowrap rounded-[calc(var(--u)*0.35)] border-[length:calc(var(--u)*0.2)] border-[#1a1a1a] px-[calc(var(--u)*0.9)] pt-[calc(var(--u)*0.3)] pb-[calc(var(--u)*0.05)] font-bebas tracking-wider text-[calc(var(--u)*1.45)] leading-snug shadow-[calc(var(--u)*0.25)_calc(var(--u)*0.25)_0_#1a1a1a] animate-stamp-in ${badge.cls}`}
                                                style={{ "--stamp-rot": index % 2 === 0 ? "-4deg" : "3deg" }}
                                            >
                                                {badge.label}
                                            </span>
                                        )}
                                    </Show>
                                </div>
                            </div>
                        </>
                    );
                }}
            </For>
        </div>
    );
}

export function useStreetFlash(street: () => PokerStreet) {
    const [flash, setFlash] = createSignal<string | null>(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    createEffect(street, (current) => {
        if (first) {
            first = false;
            return;
        }
        if (!["flop", "turn", "river", "showdown"].includes(current)) return;
        clearTimeout(timer);
        setFlash(current);
        timer = setTimeout(() => setFlash(null), 1400);
    });
    onCleanup(() => clearTimeout(timer));
    return flash;
}
