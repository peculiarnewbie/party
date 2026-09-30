import { createEffect, onSettled, untrack } from "solid-js";
import type { SixNimmtTableView } from "~/game/six-nimmt/schemas";

type CardRect = Pick<DOMRect, "left" | "top" | "width" | "height">;
const EASING = "cubic-bezier(.22,.7,.25,1)";

function transform(from: CardRect, to: CardRect): string {
    return `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`;
}

export function createCardPlacementMotion(
    view: () => SixNimmtTableView,
    board: () => HTMLElement,
) {
    const initial = untrack(view);
    let turn = `${initial.round}:${initial.turn}`;
    let round = initial.round;
    let placed = initial.placements.length;
    const templates = new Map<number, HTMLElement>();
    const flights = new Set<() => void>();
    const cancelFlights = () => {
        for (const finish of flights) finish();
    };
    const slotElement = (row: number, slot: number) =>
        board().querySelector<HTMLElement>(
            `[data-testid="six-nimmt-slot-${row}-${slot}"]`,
        );

    createEffect(
        () => ({
            round: view().round,
            turn: `${view().round}:${view().turn}`,
            placements: view().placements,
            rows: view().rows,
        }),
        (next) => {
            if (next.turn !== turn || next.placements.length < placed) {
                cancelFlights();
                turn = next.turn;
                placed = 0;
            }
            if (next.round !== round) {
                templates.clear();
                round = next.round;
            }
            const additions = next.placements.slice(placed);
            placed = next.placements.length;
            const reduced = window.matchMedia(
                "(prefers-reduced-motion: reduce)",
            ).matches;

            for (const placement of reduced ? [] : additions) {
                const slot = next.rows[placement.row]?.indexOf(placement.card);
                if (slot === undefined || slot < 0) continue;
                const source = Array.from(
                    board().querySelectorAll<HTMLElement>(
                        "[data-six-nimmt-source]",
                    ),
                ).find(
                    (element) =>
                        element.dataset.sixNimmtSource === placement.playerId,
                );
                const cell = slotElement(placement.row, slot);
                const target = cell?.firstElementChild;
                if (
                    !source ||
                    !cell ||
                    !(target instanceof HTMLElement) ||
                    !target.animate
                )
                    continue;
                const from = source.getBoundingClientRect();
                const to = cell.getBoundingClientRect();
                if (!from.width || !from.height || !to.width || !to.height)
                    continue;

                const animations: Animation[] = [];
                const ghosts: HTMLElement[] = [];
                const finish = () => {
                    for (const animation of animations) {
                        animation.onfinish = null;
                        animation.oncancel = null;
                        animation.cancel();
                    }
                    for (const ghost of ghosts) ghost.remove();
                    source.style.opacity = "";
                    target.style.opacity = "";
                    target.style.position = "";
                    target.style.zIndex = "";
                    target.style.transformOrigin = "";
                    delete target.dataset.sixNimmtFlight;
                    flights.delete(finish);
                };
                flights.add(finish);
                source.style.opacity = ".35";

                const layer = board().querySelector<HTMLElement>(
                    "[data-six-nimmt-motion-layer]",
                );
                const taken = placement.taken.map((card, index) => ({
                    card,
                    template: templates.get(card),
                    cell: slotElement(placement.row, index),
                }));
                const canTake =
                    layer &&
                    taken.length &&
                    taken.every((card) => card.template && card.cell);

                if (canTake) {
                    const origin = layer.getBoundingClientRect();
                    const ghost = (template: HTMLElement, cell: HTMLElement) => {
                        const element = template.cloneNode(true) as HTMLElement;
                        const rect = cell.getBoundingClientRect();
                        const computed = getComputedStyle(cell);
                        Object.assign(element.style, {
                            position: "absolute",
                            left: `${rect.left - origin.left}px`,
                            top: `${rect.top - origin.top}px`,
                            width: `${rect.width}px`,
                            height: `${rect.height}px`,
                            opacity: "1",
                            zIndex: "1",
                            transformOrigin: "top left",
                        });
                        for (const variable of [
                            "--number-card-font",
                            "--number-card-small",
                            "--number-card-direction",
                        ])
                            element.style.setProperty(
                                variable,
                                computed.getPropertyValue(variable),
                            );
                        delete element.dataset.sixNimmtFlight;
                        layer.appendChild(element);
                        ghosts.push(element);
                        return element;
                    };
                    const cells = taken.map((card) =>
                        card.cell!.getBoundingClientRect(),
                    );
                    const first = cells[0]!;
                    const last = slotElement(
                        placement.row,
                        4,
                    )!.getBoundingClientRect();
                    const gap =
                        parseFloat(
                            getComputedStyle(cell.parentElement!).columnGap,
                        ) || 0;
                    const count = Math.max(5, taken.length + 1);
                    const width =
                        (last.right - first.left - gap * (count - 1)) / count;
                    const packed = (index: number): CardRect => ({
                        left: first.left + index * (width + gap),
                        top: first.top,
                        width,
                        height: first.height,
                    });
                    const arrival = packed(taken.length);
                    target.style.opacity = "0";
                    const played = ghost(target, cell);
                    played.dataset.sixNimmtFlight = String(placement.card);
                    played.dataset.sixNimmtTake = String(taken.length);
                    played.dataset.sixNimmtSlot = `${placement.row}-${slot}`;
                    animations.push(
                        played.animate(
                            [
                                {
                                    transform: transform(to, from),
                                    offset: 0,
                                    easing: EASING,
                                },
                                {
                                    transform: transform(to, arrival),
                                    offset: 0.42,
                                },
                                {
                                    transform: transform(to, arrival),
                                    offset: 0.52,
                                    easing: EASING,
                                },
                                { transform: "none", offset: 1 },
                            ],
                            { duration: 1000, fill: "forwards" },
                        ),
                    );

                    taken.forEach((card, index) => {
                        const element = ghost(card.template!, card.cell!);
                        element.dataset.sixNimmtCollected = String(card.card);
                        element.dataset.sixNimmtCollector = placement.playerId;
                        const start = cells[index]!;
                        const wait = 520 + index * 24;
                        const duration = 1000 + index * 24;
                        animations.push(
                            element.animate(
                                [
                                    {
                                        transform: "none",
                                        opacity: 1,
                                        offset: 0,
                                        easing: EASING,
                                    },
                                    {
                                        transform: transform(start, packed(index)),
                                        opacity: 1,
                                        offset: 420 / duration,
                                    },
                                    {
                                        transform: transform(start, packed(index)),
                                        opacity: 1,
                                        offset: wait / duration,
                                        easing: EASING,
                                    },
                                    {
                                        transform: transform(start, from),
                                        opacity: 0,
                                        offset: 1,
                                    },
                                ],
                                { duration, fill: "forwards" },
                            ),
                        );
                    });
                } else {
                    target.style.position = "relative";
                    target.style.zIndex = "10";
                    target.style.transformOrigin = "top left";
                    target.dataset.sixNimmtFlight = String(placement.card);
                    animations.push(
                        target.animate(
                            [
                                { transform: transform(to, from) },
                                {
                                    transform: "translate(0, -3px) scale(1, 1)",
                                    offset: 0.88,
                                },
                                { transform: "none" },
                            ],
                            { duration: 680, easing: EASING },
                        ),
                    );
                }
                let remaining = animations.length;
                for (const animation of animations) {
                    animation.onfinish = () => {
                        if (--remaining === 0) finish();
                    };
                    animation.oncancel = finish;
                }
            }

            next.rows.forEach((row, rowIndex) => {
                row.forEach((card, slot) => {
                    const element = slotElement(rowIndex, slot)?.firstElementChild;
                    if (element instanceof HTMLElement)
                        templates.set(card, element.cloneNode(true) as HTMLElement);
                });
            });
        },
    );

    onSettled(() => {
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        window.addEventListener("resize", cancelFlights);
        motion.addEventListener("change", cancelFlights);
        return () => {
            cancelFlights();
            window.removeEventListener("resize", cancelFlights);
            motion.removeEventListener("change", cancelFlights);
        };
    });
}
