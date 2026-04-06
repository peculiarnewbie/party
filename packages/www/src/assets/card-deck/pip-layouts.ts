export type Pip = { x: number; y: number; f: boolean };

export const PIPS: Record<number, Pip[]> = {
    1: [{ x: 125, y: 175, f: false }],

    2: [
        { x: 125, y: 90, f: false },
        { x: 125, y: 260, f: true },
    ],

    3: [
        { x: 125, y: 90, f: false },
        { x: 125, y: 175, f: false },
        { x: 125, y: 260, f: true },
    ],

    4: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],

    5: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 125, y: 175, f: false },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],

    6: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 80, y: 175, f: false },
        { x: 170, y: 175, f: false },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],

    7: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 125, y: 128, f: false },
        { x: 80, y: 175, f: false },
        { x: 170, y: 175, f: false },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],

    8: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 125, y: 128, f: false },
        { x: 80, y: 175, f: false },
        { x: 170, y: 175, f: false },
        { x: 125, y: 222, f: true },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],

    9: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 80, y: 145, f: false },
        { x: 170, y: 145, f: false },
        { x: 125, y: 175, f: false },
        { x: 80, y: 205, f: true },
        { x: 170, y: 205, f: true },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],

    10: [
        { x: 80, y: 90, f: false },
        { x: 170, y: 90, f: false },
        { x: 125, y: 113, f: false },
        { x: 80, y: 145, f: false },
        { x: 170, y: 145, f: false },
        { x: 80, y: 205, f: true },
        { x: 170, y: 205, f: true },
        { x: 125, y: 237, f: true },
        { x: 80, y: 260, f: true },
        { x: 170, y: 260, f: true },
    ],
};

export const PIP_SIZE: Record<number, number> = {
    1: 75,
    2: 28,
    3: 28,
    4: 28,
    5: 28,
    6: 28,
    7: 26,
    8: 26,
    9: 24,
    10: 24,
};
