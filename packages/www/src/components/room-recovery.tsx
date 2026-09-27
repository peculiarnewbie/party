import { For, Show, createSignal, onSettled } from "solid-js";
import type { RoomRecovery } from "~/game";
import type { ConnectionStatus } from "~/room/types";

type RecoveryAction = "extend" | "wait" | "continue";

export function RoomRecoveryPanel(props: {
    recovery?: RoomRecovery;
    players: readonly { id: string; name: string }[];
    status: ConnectionStatus;
    isHost?: boolean;
    suspended?: boolean;
    onGraceChange?: (seconds: RoomRecovery["graceSeconds"]) => void;
    onManage?: (playerId: string, action: RecoveryAction) => void;
    onRetry?: () => void;
}) {
    const [now, setNow] = createSignal(Date.now());
    onSettled(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    });
    const offline = () => props.recovery?.offline ?? [];
    const buttonClass =
        "border-2 border-ink bg-paper px-3 py-1 font-bebas tracking-wider shadow-[2px_2px_0_var(--color-ink)] disabled:opacity-50";

    return (
        <Show
            when={
                props.isHost ||
                offline().length > 0 ||
                props.status !== "connected"
            }
        >
            <aside
                data-testid="room-recovery"
                class="relative z-50 border-b-2 border-ink bg-paper px-4 py-3 text-ink font-karla"
            >
                <Show when={props.status !== "connected"}>
                    <div
                        role="status"
                        class="flex flex-wrap items-center gap-3"
                    >
                        <strong>
                            {props.status === "session_expired"
                                ? "This browser could not recover your seat."
                                : "Reconnecting to your room…"}
                        </strong>
                        <span>
                            {props.status === "session_expired"
                                ? "Use the browser you joined with to recover your player."
                                : "Your last table is still visible. Controls will return after we sync."}
                        </span>
                        <button
                            type="button"
                            class={buttonClass}
                            onClick={props.onRetry}
                        >
                            Retry connection
                        </button>
                    </div>
                </Show>
                <Show when={props.isHost}>
                    <details>
                        <summary class="cursor-pointer font-bebas text-xl tracking-wider">
                            Disconnected players
                        </summary>
                        <label class="mt-2 flex flex-wrap items-center gap-3">
                            Reconnect grace period
                            <select
                                aria-label="Reconnect grace period"
                                data-testid="disconnect-grace"
                                class="border-2 border-ink bg-paper p-2"
                                disabled={props.status !== "connected"}
                                value={
                                    props.recovery?.graceSeconds === null
                                        ? "wait"
                                        : String(
                                              props.recovery?.graceSeconds ??
                                                  60,
                                          )
                                }
                                onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    props.onGraceChange?.(
                                        value === "30"
                                            ? 30
                                            : value === "120"
                                              ? 120
                                              : value === "wait"
                                                ? null
                                                : 60,
                                    );
                                }}
                            >
                                <option value="30">30 seconds</option>
                                <option value="60">60 seconds</option>
                                <option value="120">2 minutes</option>
                                <option value="wait">Wait indefinitely</option>
                            </select>
                        </label>
                        <p class="mt-2 text-sm">
                            Applies to future disconnects. After time expires,
                            poker checks or folds automatically and reserves the
                            seat. Other games continue without that player until
                            the next game.
                        </p>
                    </details>
                </Show>
                <For each={offline()} keyed={false}>
                    {(entry) => (
                        <div
                            data-testid={`offline-${entry().playerId}`}
                            class="mt-2 flex flex-wrap items-center gap-3"
                        >
                            <span role="status">
                                <strong>
                                    {props.players.find(
                                        (player) =>
                                            player.id === entry().playerId,
                                    )?.name ?? "Player"}
                                </strong>
                                {entry().status === "expired"
                                    ? " · Offline · game continuing"
                                    : props.suspended
                                      ? " · Offline · room paused"
                                      : entry().deadline === null
                                        ? " · Offline · waiting for return"
                                        : ` · Offline · ${Math.max(0, Math.ceil(((entry().deadline ?? now()) - now()) / 1000))}s to reconnect`}
                            </span>
                            <Show
                                when={
                                    props.isHost && entry().status === "waiting"
                                }
                            >
                                <button
                                    type="button"
                                    class={buttonClass}
                                    disabled={props.status !== "connected"}
                                    onClick={() =>
                                        props.onManage?.(
                                            entry().playerId,
                                            "extend",
                                        )
                                    }
                                >
                                    Add 30 seconds
                                </button>
                                <button
                                    type="button"
                                    class={buttonClass}
                                    disabled={props.status !== "connected"}
                                    onClick={() =>
                                        props.onManage?.(
                                            entry().playerId,
                                            "wait",
                                        )
                                    }
                                >
                                    Wait indefinitely
                                </button>
                                <button
                                    type="button"
                                    class={buttonClass}
                                    disabled={
                                        props.status !== "connected" ||
                                        props.suspended
                                    }
                                    onClick={() =>
                                        props.onManage?.(
                                            entry().playerId,
                                            "continue",
                                        )
                                    }
                                >
                                    Continue without player
                                </button>
                            </Show>
                        </div>
                    )}
                </For>
            </aside>
        </Show>
    );
}
