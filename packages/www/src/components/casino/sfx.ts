import { createSignal, untrack } from "solid-js";

export type SoundName = "deal" | "flip" | "chip" | "turn" | "win" | "lose";

const MUTE_KEY = "party:sfx-muted";

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let listening = false;

const [muted, setMutedSignal] = createSignal(
    typeof localStorage !== "undefined" &&
        localStorage.getItem(MUTE_KEY) === "1",
);
const [unlocked, setUnlocked] = createSignal(false);

export { muted, unlocked };

export function setMuted(value: boolean) {
    setMutedSignal(value);
    try {
        localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch {}
    if (!value) unlockAudio();
}

export function unlockAudio() {
    if (typeof window === "undefined") return;
    const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
    if (!AudioCtor) return;
    context ??= new AudioCtor();
    if (context.state === "suspended") void context.resume();
    if (!noise) {
        noise = context.createBuffer(1, context.sampleRate * 0.4, context.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    setUnlocked(true);
}

export function buzz(pattern: number[]) {
    if (typeof navigator === "undefined") return;
    const activation = (
        navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }
    ).userActivation;
    if (activation && !activation.hasBeenActive) return;
    navigator.vibrate?.(pattern);
}

export function listenForAudioUnlock() {
    if (listening || typeof document === "undefined") return;
    listening = true;
    const unlock = () => unlockAudio();
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
}

function tone(
    ctx: AudioContext,
    start: number,
    frequency: number,
    duration: number,
    options: { type?: OscillatorType; gain?: number; endFrequency?: number } = {},
) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    if (options.endFrequency)
        oscillator.frequency.exponentialRampToValueAtTime(
            options.endFrequency,
            start + duration,
        );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain ?? 0.2, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
}

function burst(
    ctx: AudioContext,
    start: number,
    duration: number,
    from: number,
    to: number,
    level: number,
) {
    if (!noise) return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start);
    source.stop(start + duration + 0.02);
}

export function playSfx(name: SoundName, delayMs = 0) {
    if (untrack(muted) || !context || context.state !== "running") return;
    const ctx = context;
    const start = ctx.currentTime + delayMs / 1000;
    switch (name) {
        case "deal":
            burst(ctx, start, 0.14, 3200, 700, 0.35);
            break;
        case "flip":
            burst(ctx, start, 0.07, 5000, 1800, 0.3);
            tone(ctx, start + 0.02, 180, 0.05, { type: "triangle", gain: 0.08 });
            break;
        case "chip":
            tone(ctx, start, 2600, 0.07, { type: "triangle", gain: 0.12 });
            tone(ctx, start + 0.05, 3400, 0.08, { type: "triangle", gain: 0.1 });
            tone(ctx, start + 0.11, 2900, 0.06, { type: "triangle", gain: 0.07 });
            break;
        case "turn":
            tone(ctx, start, 880, 0.18, { gain: 0.18 });
            tone(ctx, start + 0.12, 1320, 0.3, { gain: 0.16 });
            break;
        case "win":
            [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) =>
                tone(ctx, start + index * 0.09, frequency, 0.45, {
                    type: "triangle",
                    gain: 0.16,
                }),
            );
            tone(ctx, start + 0.36, 1567.98, 0.6, { gain: 0.08 });
            break;
        case "lose":
            tone(ctx, start, 392, 0.25, { type: "triangle", gain: 0.12, endFrequency: 370 });
            tone(ctx, start + 0.2, 294, 0.45, { type: "triangle", gain: 0.12, endFrequency: 262 });
            break;
    }
}
