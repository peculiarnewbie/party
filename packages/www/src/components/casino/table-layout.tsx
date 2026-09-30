import * as stylex from "@stylexjs/stylex";
import type { JSX } from "@solidjs/web";

export function TableLayout(props: {
    table: JSX.Element;
    compactTable?: boolean;
    children: JSX.Element;
}) {
    return (
        <div
            data-testid="table-layout"
            {...stylex.attrs(
                styles.layout,
                props.compactTable && styles.compactLayout,
            )}
            style={{
                "--table-action-height": "44px",
                "--table-action-font": "20px",
                "--table-panel-padding": "10px",
            }}
        >
            <div
                data-testid="table-viewport"
                {...stylex.attrs(
                    styles.table,
                    props.compactTable && styles.compactTable,
                )}
            >
                {props.table}
            </div>
            <div
                data-testid="table-controls"
                {...stylex.attrs(
                    styles.controls,
                    props.compactTable && styles.compactControls,
                )}
            >
                {props.children}
            </div>
        </div>
    );
}

const styles = stylex.create({
    layout: {
        display: "grid",
        gridTemplateRows: {
            default: "minmax(0, 1fr) auto",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "minmax(0, 1fr)",
        },
        gridTemplateColumns: {
            default: "minmax(0, 1fr)",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "minmax(0, 1fr) 360px",
        },
        flex: "1 1 0%",
        minHeight: 0,
        width: "100%",
        paddingInline: { default: 8, "@media (min-width: 640px)": 16 },
        paddingTop: 4,
        paddingBottom: { default: 48, "@media (min-width: 900px)": 12 },
        gap: 8,
    },
    table: {
        minWidth: 0,
        minHeight: 0,
        paddingTop: 12,
        paddingBottom: 28,
    },
    compactLayout: {
        gridTemplateRows: {
            default: "minmax(0, 1fr) auto",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "minmax(0, 1fr)",
            "@media (max-height: 500px) and (min-aspect-ratio: 3/2)":
                "minmax(0, 1fr)",
        },
        gridTemplateColumns: {
            default: "minmax(0, 1fr)",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "minmax(0, 1fr) 360px",
            "@media (max-height: 500px) and (min-aspect-ratio: 3/2)":
                "minmax(0, 1fr) minmax(220px, 34%)",
        },
    },
    compactControls: {
        maxHeight: {
            default: "60dvh",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "100%",
            "@media (max-height: 500px) and (min-aspect-ratio: 3/2)": "100%",
        },
    },
    compactTable: { paddingTop: 4, paddingBottom: 8 },
    controls: {
        minWidth: 0,
        minHeight: 0,
        maxHeight: {
            default: "60dvh",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "100%",
        },
        overflowY: "auto",
        padding: 6,
        alignSelf: {
            default: "end",
            "@media (min-aspect-ratio: 18001/9000) and (min-width: 900px)":
                "center",
        },
    },
});
