import { createMemo, createSignal, For, onSettled } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { TableSurface } from "~/components/casino";
import { colors, fonts } from "~/styles/tokens.stylex";
import { OpponentZone } from "./opponent-zone";
import { DrawPile } from "./draw-pile";
import type { GoFishPlayerView } from "~/game/go-fish";
import type { JSX } from "@solidjs/web";

export function GoFishFelt(props: {
    fit?: boolean;
    players: GoFishPlayerView["players"];
    heroId: string | null;
    currentPlayerId: string;
    selectedOpponent: string | null;
    canAsk: boolean;
    drawPileCount: number;
    onSelect: (id: string) => void;
    announcement?: JSX.Element;
}) {
    let container: HTMLDivElement | undefined;
    const [portrait, setPortrait] = createSignal(false);
    onSettled(() => {
        if (!container || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(([entry]) =>
            setPortrait(entry.contentRect.width < 640),
        );
        observer.observe(container.parentElement ?? container);
        return () => observer.disconnect();
    });
    const seats = createMemo(() => {
        const heroIndex = props.players.findIndex(
            (player) => player.id === props.heroId,
        );
        return heroIndex > 0
            ? [
                  ...props.players.slice(heroIndex),
                  ...props.players.slice(0, heroIndex),
              ]
            : props.players;
    });
    const point = (index: number) => {
        const angle =
            ((90 + (index * 360) / Math.max(1, seats().length)) * Math.PI) /
            180;
        return {
            x: 50 + (portrait() ? 33 : 39) * Math.cos(angle),
            y: 50 + 38 * Math.sin(angle),
        };
    };
    return (
        <div
            ref={container}
            data-testid="go-fish-felt"
            {...stylex.attrs(styles.stage)}
            style={{
                height: props.fit ? "100%" : undefined,
                "aspect-ratio": props.fit
                    ? "auto"
                    : portrait()
                      ? "3 / 4"
                      : "2.15 / 1",
                "--u": props.fit
                    ? portrait()
                        ? "min(2.3cqw, max(6.5px, 3cqh))"
                        : "min(1cqw, 2cqh)"
                    : portrait()
                      ? "2.3cqw"
                      : "1cqw",
            }}
        >
            <TableSurface>
                <div {...stylex.attrs(styles.stitching)} />
                <div {...stylex.attrs(styles.watermark)}>GO FISH</div>
            </TableSurface>
            <div {...stylex.attrs(styles.center)}>
                <DrawPile
                    count={props.drawPileCount}
                    showDrawButton={false}
                    onDraw={() => {}}
                />
            </div>
            <For each={seats()} keyed={false}>
                {(player, index) => (
                    <div
                        {...stylex.attrs(styles.seat)}
                        style={{
                            left: `${point(index).x}%`,
                            top: `${point(index).y}%`,
                        }}
                    >
                        <OpponentZone
                            id={player().id}
                            name={player().name}
                            index={props.players.findIndex(
                                (entry) => entry.id === player().id,
                            )}
                            isHero={player().id === props.heroId}
                            cardCount={player().cardCount}
                            books={player().books}
                            isCurrentTurn={
                                props.currentPlayerId === player().id
                            }
                            selectable={
                                props.canAsk && player().id !== props.heroId
                            }
                            selected={props.selectedOpponent === player().id}
                            onSelect={props.onSelect}
                        />
                    </div>
                )}
            </For>
            <div {...stylex.attrs(styles.announcement)}>
                {props.announcement}
            </div>
        </div>
    );
}
const styles = stylex.create({
    stage: {
        position: "relative",
        width: "100%",
        marginInline: "auto",
        containerType: "size",
        userSelect: "none",
    },
    stitching: {
        position: "absolute",
        inset: "calc(var(--u) * 3)",
        borderRadius: "9999px",
        borderWidth: "calc(var(--u) * 0.25)",
        borderStyle: "dashed",
        borderColor: `color-mix(in srgb, ${colors.cream} 20%, transparent)`,
    },
    watermark: {
        position: "absolute",
        left: 0,
        right: 0,
        top: "15%",
        textAlign: "center",
        fontFamily: fonts.heading,
        fontSize: "calc(var(--u) * 3.4)",
        letterSpacing: "0.3em",
        color: `color-mix(in srgb, ${colors.cream} 15%, transparent)`,
    },
    center: {
        position: "absolute",
        left: "50%",
        top: "49%",
        translate: "-50% -50%",
        zIndex: 10,
    },
    seat: {
        position: "absolute",
        translate: "-50% -50%",
        width: "calc(var(--u) * 16)",
        zIndex: 20,
        transitionProperty: "left, top",
        transitionDuration: "700ms",
    },
    announcement: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 30,
    },
});
