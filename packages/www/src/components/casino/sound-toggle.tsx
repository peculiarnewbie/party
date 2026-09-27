import { onSettled, Show } from "solid-js";
import { listenForAudioUnlock, muted, setMuted, unlocked } from "./sfx";

export function SoundToggle(props: { class?: string; compact?: boolean }) {
    onSettled(() => listenForAudioUnlock());
    const label = () =>
        muted() ? "Sound off" : unlocked() ? "Sound on" : "Tap for sound";
    return (
        <button
            type="button"
            data-testid="sound-toggle"
            aria-pressed={muted() ? "false" : "true"}
            aria-label={props.compact ? label() : undefined}
            onClick={() => setMuted(!muted() && unlocked())}
            class={`inline-flex items-center gap-1.5 border-2 border-[#1a1a1a] bg-[#f7f2de] px-2.5 py-1 font-bebas tracking-wider text-sm text-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${props.class ?? ""}`}
        >
            <svg viewBox="0 0 24 24" class="w-4 h-4" aria-hidden="true">
                <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
                <Show
                    when={muted()}
                    fallback={
                        <path
                            d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"
                            stroke="currentColor"
                            stroke-width="2"
                            fill="none"
                            stroke-linecap="round"
                        />
                    }
                >
                    <path
                        d="M16 9l5 6m0-6l-5 6"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                </Show>
            </svg>
            <Show when={!props.compact}>{label()}</Show>
        </button>
    );
}
