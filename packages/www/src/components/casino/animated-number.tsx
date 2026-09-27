import { createEffect, createSignal, onCleanup, untrack } from "solid-js";

export function AnimatedNumber(props: {
    value: number;
    duration?: number;
    prefix?: string;
    class?: string;
}) {
    const initial = untrack(() => props.value);
    const [display, setDisplay] = createSignal(initial);
    let frame = 0;
    let current = initial;

    createEffect(
        () => ({ target: props.value, duration: props.duration ?? 700 }),
        ({ target, duration }) => {
            cancelAnimationFrame(frame);
            const from = current;
            if (from === target) return;
            const start = performance.now();
            const step = (now: number) => {
                const progress = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - progress, 3);
                current = Math.round(from + (target - from) * eased);
                setDisplay(current);
                if (progress < 1) frame = requestAnimationFrame(step);
            };
            frame = requestAnimationFrame(step);
        },
    );

    onCleanup(() => cancelAnimationFrame(frame));

    return (
        <span class={`tabular-nums ${props.class ?? ""}`}>
            {props.prefix ?? ""}
            {display()}
        </span>
    );
}
