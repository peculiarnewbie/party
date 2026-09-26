import { createMemo, For } from "solid-js";
import QRCode from "qrcode";

export function JoinQr(props: { url: string }) {
    const qr = createMemo(() =>
        QRCode.create(props.url, { errorCorrectionLevel: "M" }),
    );
    const rows = createMemo(() => {
        const { size, data } = qr().modules;
        return Array.from({ length: size }, (_, y) => {
            let path = "";
            for (let x = 0; x < size; x++) {
                if (data[y * size + x]) path += `M${x + 4} ${y + 4}h1v1h-1z`;
            }
            return path;
        });
    });
    return (
        <svg
            role="img"
            aria-label="Scan to join on your phone"
            data-testid="join-qr"
            viewBox={`0 0 ${qr().modules.size + 8} ${qr().modules.size + 8}`}
            class="w-full max-w-72 bg-white"
            shape-rendering="crispEdges"
        >
            <rect width="100%" height="100%" fill="white" />
            <For each={rows()}>{(path) => <path d={path} fill="black" />}</For>
        </svg>
    );
}
