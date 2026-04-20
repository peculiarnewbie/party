import { animate } from "animejs";

export function fadeSlideIn(
    element: HTMLElement,
    options: { duration?: number; delay?: number; y?: number } = {},
) {
    const { duration = 600, delay = 0, y = 30 } = options;
    return animate(element, {
        opacity: { from: 0, to: 1 },
        translateY: { from: y, to: 0 },
        duration,
        delay,
        ease: "outExpo",
    });
}

export function fadeSlideOut(
    element: HTMLElement,
    options: { duration?: number; delay?: number; y?: number } = {},
) {
    const { duration = 400, delay = 0, y = -20 } = options;
    return animate(element, {
        opacity: { from: 1, to: 0 },
        translateY: { from: 0, to: y },
        duration,
        delay,
        ease: "inQuad",
    });
}

export function scaleBounceIn(
    element: HTMLElement,
    options: { duration?: number; delay?: number } = {},
) {
    const { duration = 700, delay = 0 } = options;
    return animate(element, {
        opacity: { from: 0, to: 1 },
        scale: { from: 0.5, to: 1 },
        duration,
        delay,
        ease: "outElastic(1, .6)",
    });
}

export function pulseHighlight(
    element: HTMLElement,
    options: { duration?: number; scale?: number } = {},
) {
    const { duration = 600, scale = 1.06 } = options;
    return animate(element, {
        scale: { from: 1, to: scale },
        duration: duration / 2,
        ease: "outQuad",
        alternate: true,
        loop: 1,
    });
}

export function flashBackground(
    element: HTMLElement,
    options: { duration?: number; color?: string } = {},
) {
    const { duration = 800, color = "#c0261a" } = options;
    const original = element.style.backgroundColor;
    return animate(element, {
        backgroundColor: { from: color, to: original || "transparent" },
        duration,
        ease: "outQuad",
    });
}
