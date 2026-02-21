import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, Show, For } from "solid-js";

export const Route = createFileRoute("/")({
    component: Index,
});

// Deterministic "random" positions for decorative elements
const STARS = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: ((i * 2971 + 13) % 1000) / 10,
    y: ((i * 1783 + 7) % 850) / 10,
    size: ((i * 1337) % 3) + 1,
    delay: (((i * 7) % 30) / 10).toFixed(1),
    dur: (1.5 + ((i * 0.7) % 2)).toFixed(1),
}));

// ─────────────────────────────────────────────
// THEME 1: CARNIVAL NIGHT
// Dark indigo cosmos · Glowing warm typography · Neon fairground
// ─────────────────────────────────────────────
function CarnivalTheme() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Boogaloo&family=Nunito:wght@400;600;700;800&display=swap');

                @keyframes carn-twinkle {
                    0%,100% { opacity:.2; transform:scale(.7); }
                    50% { opacity:1; transform:scale(1.3); }
                }
                @keyframes carn-float {
                    0%,100% { transform:translateY(0); }
                    50% { transform:translateY(-14px); }
                }
                @keyframes carn-glow {
                    0%,100% { text-shadow:0 0 20px #fbbf24,0 0 50px rgba(251,191,36,.5); }
                    50% { text-shadow:0 0 40px #fbbf24,0 0 80px rgba(251,191,36,.9),0 0 120px rgba(245,158,11,.4); }
                }
                @keyframes carn-scroll {
                    from { background-position:0 0; }
                    to   { background-position:105px 0; }
                }
                .carn-root {
                    min-height:100vh;
                    background:radial-gradient(ellipse at 50% 30%, #1e1055 0%, #0e0830 55%, #050318 100%);
                    font-family:'Nunito',sans-serif;
                    position:relative;
                    overflow:hidden;
                }
                .carn-bar {
                    height:10px;
                    background:repeating-linear-gradient(90deg,
                        #ef4444 0,#ef4444 15px, #fbbf24 15px,#fbbf24 30px,
                        #22c55e 30px,#22c55e 45px, #60a5fa 45px,#60a5fa 60px,
                        #a78bfa 60px,#a78bfa 75px, #f472b6 75px,#f472b6 90px,
                        #fb923c 90px,#fb923c 105px);
                    animation:carn-scroll 3s linear infinite;
                    box-shadow:0 4px 24px rgba(251,191,36,.6);
                }
                .carn-title {
                    font-family:'Boogaloo',cursive;
                    font-size:clamp(4rem,12vw,9rem);
                    color:#fde68a;
                    animation:carn-glow 2.5s ease-in-out infinite;
                    line-height:.95;
                    letter-spacing:-.02em;
                }
                .carn-cta {
                    font-family:'Boogaloo',cursive;
                    font-size:1.75rem;
                    letter-spacing:.05em;
                    background:linear-gradient(135deg,#f59e0b,#ef4444);
                    color:white;
                    padding:1rem 3.5rem;
                    border-radius:9999px;
                    text-decoration:none;
                    display:inline-block;
                    animation:carn-float 2.5s ease-in-out infinite;
                    box-shadow:0 8px 40px rgba(245,158,11,.4),0 0 0 3px rgba(255,255,255,.1);
                    transition:filter .2s;
                }
                .carn-cta:hover { filter:brightness(1.15); }
                .carn-card {
                    background:rgba(255,255,255,.05);
                    border:1px solid rgba(251,191,36,.25);
                    border-radius:20px;
                    padding:1.5rem;
                    backdrop-filter:blur(8px);
                    transition:all .3s ease;
                    text-align:center;
                }
                .carn-card:hover {
                    background:rgba(255,255,255,.09);
                    border-color:rgba(251,191,36,.55);
                    transform:translateY(-6px);
                    box-shadow:0 20px 40px rgba(0,0,0,.35);
                }
            `}</style>
            <div class="carn-root">
                <div class="carn-bar" />
                <For each={STARS}>
                    {(s) => (
                        <div style={{
                            position: "absolute",
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            width: `${s.size}px`,
                            height: `${s.size}px`,
                            "border-radius": "50%",
                            background: "white",
                            animation: `carn-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
                        }} />
                    )}
                </For>
                <div style={{
                    "max-width": "900px",
                    margin: "0 auto",
                    padding: "4rem 2rem 8rem",
                    "text-align": "center",
                    position: "relative",
                    "z-index": "1",
                }}>
                    <p style={{ color: "#fb923c", "font-weight": "800", "letter-spacing": ".3em", "text-transform": "uppercase", "font-size": ".875rem", "margin-bottom": "1.5rem" }}>
                        🎪 Your Party Awaits
                    </p>
                    <h1 class="carn-title">PARTY<br />GAMES!</h1>
                    <p style={{ color: "#c4b5fd", "font-size": "clamp(1rem,2.5vw,1.3rem)", "font-weight": "600", margin: "1.5rem auto 2.5rem", "max-width": "480px" }}>
                        Trivia, word games & more — invite friends with one link, no accounts ever needed.
                    </p>
                    <div style={{ "margin-bottom": "4rem" }}>
                        <a href="/room" class="carn-cta">Start the Party! 🎉</a>
                    </div>
                    <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fit,minmax(180px,1fr))", gap: "1.25rem" }}>
                        <For each={[
                            { icon: "🎯", title: "Trivia Night", desc: "Test everyone's knowledge" },
                            { icon: "🃏", title: "Word Games", desc: "Wit & words collide" },
                            { icon: "🎲", title: "Party Picks", desc: "Fast rounds, big laughs" },
                        ]}>
                            {(card) => (
                                <div class="carn-card">
                                    <div style={{ "font-size": "2.5rem", "margin-bottom": ".75rem" }}>{card.icon}</div>
                                    <div style={{ "font-family": "'Boogaloo',cursive", "font-size": "1.35rem", color: "#fde68a", "margin-bottom": ".25rem" }}>{card.title}</div>
                                    <div style={{ color: "#9ca3af", "font-size": ".875rem" }}>{card.desc}</div>
                                </div>
                            )}
                        </For>
                    </div>
                    <p style={{ "margin-top": "3rem", color: "#4b5563", "font-size": ".8rem" }}>
                        Share a link · No installs · No accounts · Just play
                    </p>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// THEME 2: HEARTHSIDE
// Warm linen · Serif · Amber & walnut · Board game night vibes
// ─────────────────────────────────────────────
function HeartsideTheme() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lora:wght@400;500;600&display=swap');

                @keyframes hearth-sway {
                    0%,100% { transform:rotate(-2deg); }
                    50% { transform:rotate(2deg); }
                }
                @keyframes hearth-float {
                    0%,100% { transform:translateY(0) rotate(-1deg); }
                    50% { transform:translateY(-10px) rotate(2deg); }
                }
                .hearth-root {
                    min-height:100vh;
                    background:#fef3e2;
                    font-family:'Lora',Georgia,serif;
                    position:relative;
                    overflow:hidden;
                }
                .hearth-root::before {
                    content:'';
                    position:absolute;
                    inset:0;
                    background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d97706' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E");
                }
                .hearth-title {
                    font-family:'Playfair Display',serif;
                    font-size:clamp(3rem,9vw,7rem);
                    color:#78350f;
                    line-height:1;
                    font-weight:900;
                }
                .hearth-cta {
                    font-family:'Playfair Display',serif;
                    font-weight:700;
                    font-size:1.2rem;
                    background:#78350f;
                    color:#fef3e2;
                    padding:1rem 3rem;
                    border-radius:4px;
                    text-decoration:none;
                    display:inline-block;
                    transition:all .25s;
                    box-shadow:5px 5px 0 #d97706, 7px 7px 0 rgba(0,0,0,.08);
                }
                .hearth-cta:hover {
                    transform:translate(-2px,-2px);
                    box-shadow:7px 7px 0 #d97706, 9px 9px 0 rgba(0,0,0,.08);
                }
                .hearth-divider {
                    display:flex;
                    align-items:center;
                    gap:1rem;
                    color:#d97706;
                    margin:2rem 0;
                }
                .hearth-divider::before,.hearth-divider::after {
                    content:'';
                    flex:1;
                    height:1px;
                    background:linear-gradient(90deg,transparent,#d97706,transparent);
                }
                .hearth-card {
                    background:white;
                    border:1px solid #fde68a;
                    border-radius:6px;
                    padding:1.5rem;
                    box-shadow:4px 4px 0 #fde68a;
                    transition:all .25s;
                }
                .hearth-card:hover {
                    transform:translate(-3px,-3px);
                    box-shadow:7px 7px 0 #fde68a;
                }
                .hearth-badge {
                    display:inline-flex;
                    align-items:center;
                    gap:.5rem;
                    background:#fef9c3;
                    border:1px solid #fde68a;
                    color:#713f12;
                    font-size:.875rem;
                    padding:.375rem .875rem;
                    border-radius:9999px;
                }
            `}</style>
            <div class="hearth-root">
                <div style={{ position: "absolute", top: "2rem", right: "3rem", "font-size": "4rem", animation: "hearth-sway 4s ease-in-out infinite", "transform-origin": "top center" }}>🎲</div>
                <div style={{ position: "absolute", bottom: "18rem", left: "2rem", "font-size": "3rem", animation: "hearth-float 5s ease-in-out infinite" }}>🎴</div>
                <div style={{ position: "absolute", top: "38%", right: "2.5rem", "font-size": "2.5rem", animation: "hearth-float 6s ease-in-out 1s infinite" }}>🃏</div>
                <div style={{ "max-width": "800px", margin: "0 auto", padding: "5rem 2rem 8rem", position: "relative", "z-index": "1" }}>
                    <div style={{ "margin-bottom": "2rem" }}>
                        <span class="hearth-badge">✦ Gather Round</span>
                    </div>
                    <h1 class="hearth-title">
                        Game<br /><em>Night</em><br />Starts Here.
                    </h1>
                    <div class="hearth-divider">
                        <span style={{ "font-size": ".875rem", "white-space": "nowrap" }}>♦ ♣ ♥ ♠</span>
                    </div>
                    <p style={{ "font-family": "'Playfair Display',serif", "font-style": "italic", "font-size": "clamp(1.1rem,2.5vw,1.6rem)", color: "#b45309" }}>
                        "Pull up a chair. The games are ready."
                    </p>
                    <p style={{ color: "#92400e", "font-size": "1rem", "margin-top": ".75rem", "margin-bottom": "2.5rem", "max-width": "460px", "line-height": "1.75" }}>
                        Trivia, word battles, and party games for your whole crew. Send a link, pick a name, and play — no fuss, no accounts.
                    </p>
                    <a href="/room" class="hearth-cta">Gather Around →</a>
                    <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fit,minmax(200px,1fr))", gap: "1.25rem", "margin-top": "4rem" }}>
                        <For each={[
                            { num: "01", title: "Create a Room", desc: "Be the host, pick your game" },
                            { num: "02", title: "Share the Link", desc: "Friends join in seconds" },
                            { num: "03", title: "Play Together", desc: "Real-time, no accounts ever" },
                        ]}>
                            {(step) => (
                                <div class="hearth-card">
                                    <div style={{ "font-family": "'Playfair Display',serif", "font-size": "2rem", "font-weight": "900", color: "#fde68a", "margin-bottom": ".5rem" }}>{step.num}</div>
                                    <div style={{ "font-family": "'Playfair Display',serif", "font-weight": "700", color: "#78350f", "margin-bottom": ".25rem" }}>{step.title}</div>
                                    <div style={{ color: "#92400e", "font-size": ".875rem" }}>{step.desc}</div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// THEME 3: NEON ARCADE
// Pure black · Pixel font · CRT scanlines · Neon green glow
// ─────────────────────────────────────────────
function ArcadeTheme() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

                @keyframes arc-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
                @keyframes arc-scan {
                    from { transform:translateY(-100%); }
                    to   { transform:translateY(110vh); }
                }
                @keyframes arc-flicker {
                    0%,100%{opacity:1} 93%{opacity:.85} 94%{opacity:1} 97%{opacity:.9} 98%{opacity:1}
                }
                @keyframes arc-glow-g {
                    0%,100%{text-shadow:0 0 10px #00ff41,0 0 20px #00ff41,0 0 40px #00ff41;}
                    50%{text-shadow:0 0 20px #00ff41,0 0 50px #00ff41,0 0 90px rgba(0,255,65,.3);}
                }
                @keyframes arc-glow-p {
                    0%,100%{text-shadow:0 0 10px #ff2d78,0 0 20px #ff2d78;}
                    50%{text-shadow:0 0 25px #ff2d78,0 0 50px rgba(255,45,120,.4);}
                }
                @keyframes arc-marquee {
                    from{transform:translateX(100%)} to{transform:translateX(-100%)}
                }
                .arc-root {
                    min-height:100vh;
                    background:#000;
                    font-family:'Press Start 2P',monospace;
                    color:#00ff41;
                    position:relative;
                    overflow:hidden;
                    animation:arc-flicker 9s infinite;
                }
                .arc-root::before {
                    content:'';
                    position:absolute;
                    inset:0;
                    background:repeating-linear-gradient(
                        0deg,
                        transparent,transparent 2px,
                        rgba(0,255,65,.025) 2px,rgba(0,255,65,.025) 4px
                    );
                    pointer-events:none;
                    z-index:10;
                }
                .arc-scanline {
                    position:absolute;
                    top:0;left:0;right:0;
                    height:180px;
                    background:linear-gradient(rgba(0,255,65,.06),transparent);
                    animation:arc-scan 4.5s linear infinite;
                    z-index:9;
                    pointer-events:none;
                }
                .arc-grid {
                    position:absolute;
                    inset:0;
                    background-image:
                        linear-gradient(rgba(0,255,65,.06) 1px,transparent 1px),
                        linear-gradient(90deg,rgba(0,255,65,.06) 1px,transparent 1px);
                    background-size:40px 40px;
                }
                .arc-title {
                    font-size:clamp(1.6rem,5vw,3.5rem);
                    animation:arc-glow-g 1.5s ease-in-out infinite;
                    line-height:1.4;
                }
                .arc-sub {
                    color:#ff2d78;
                    font-size:clamp(.45rem,1.2vw,.7rem);
                    animation:arc-glow-p 2s ease-in-out infinite;
                    letter-spacing:.15em;
                    line-height:2.2;
                }
                .arc-cta {
                    display:inline-block;
                    font-family:'Press Start 2P',monospace;
                    font-size:.8rem;
                    color:#000;
                    background:#00ff41;
                    padding:.9rem 2rem;
                    text-decoration:none;
                    box-shadow:4px 4px 0 #007a1f,-1px -1px 0 rgba(255,255,255,.3) inset;
                    transition:all .08s;
                    margin:.4rem;
                }
                .arc-cta:hover { background:#ffff00; box-shadow:0 0 25px #ffff00,4px 4px 0 #808000; }
                .arc-cta-out {
                    display:inline-block;
                    font-family:'Press Start 2P',monospace;
                    font-size:.8rem;
                    color:#00ff41;
                    background:transparent;
                    padding:.9rem 2rem;
                    text-decoration:none;
                    border:2px solid #00ff41;
                    box-shadow:0 0 10px rgba(0,255,65,.3);
                    transition:all .08s;
                    margin:.4rem;
                }
                .arc-cta-out:hover { background:rgba(0,255,65,.1); box-shadow:0 0 25px rgba(0,255,65,.6); }
                .arc-stat {
                    border:1px solid rgba(0,255,65,.4);
                    padding:1rem;
                    background:rgba(0,255,65,.03);
                    text-align:center;
                }
                .arc-ticker {
                    overflow:hidden;
                    border-top:1px solid rgba(0,255,65,.3);
                    border-bottom:1px solid rgba(0,255,65,.3);
                    padding:.6rem 0;
                    margin:2rem 0;
                    white-space:nowrap;
                    font-size:.5rem;
                    color:rgba(0,255,65,.55);
                    letter-spacing:.2em;
                }
                .arc-ticker-inner { display:inline-block; animation:arc-marquee 18s linear infinite; }
            `}</style>
            <div class="arc-root">
                <div class="arc-grid" />
                <div class="arc-scanline" />
                <div style={{ position: "relative", "z-index": "5", "max-width": "900px", margin: "0 auto", padding: "3rem 2rem 8rem" }}>
                    <div style={{ "font-size": ".45rem", "letter-spacing": ".3em", color: "rgba(0,255,65,.45)", "margin-bottom": "2rem" }}>
                        ▶ PLAYER ONE — READY ▶
                    </div>
                    <h1 class="arc-title">
                        PARTY<br />
                        <span style={{ color: "#ff2d78" }}>GAMES</span><br />
                        ARCADE
                    </h1>
                    <div class="arc-ticker">
                        <span class="arc-ticker-inner">
                            ★ TRIVIA ★ WORD GAMES ★ PARTY GAMES ★ MULTIPLAYER ★ NO ACCOUNT NEEDED ★ SHARE A LINK ★ PLAY NOW ★ TRIVIA ★ WORD GAMES ★ PARTY GAMES ★ MULTIPLAYER ★
                        </span>
                    </div>
                    <p class="arc-sub" style={{ "margin-bottom": "2.5rem" }}>
                        MULTIPLAYER PARTY GAMES<br />
                        FOR GROUPS OF ALL SIZES
                    </p>
                    <div>
                        <a href="/room" class="arc-cta">INSERT COIN</a>
                        <a href="/room" class="arc-cta-out">JOIN GAME</a>
                    </div>
                    <div style={{ display: "grid", "grid-template-columns": "repeat(3,1fr)", gap: "1rem", "margin-top": "3rem" }}>
                        <For each={[
                            { label: "PLAYERS", value: "∞", unit: "MAX" },
                            { label: "GAMES", value: "5+", unit: "MODES" },
                            { label: "LATENCY", value: "<10", unit: "MS" },
                        ]}>
                            {(stat) => (
                                <div class="arc-stat">
                                    <div style={{ color: "#ff2d78", "font-size": ".45rem", "margin-bottom": ".5rem", "letter-spacing": ".2em" }}>{stat.label}</div>
                                    <div style={{ "font-size": "1.5rem" }}>{stat.value}</div>
                                    <div style={{ "font-size": ".35rem", color: "rgba(0,255,65,.5)", "margin-top": ".25rem" }}>{stat.unit}</div>
                                </div>
                            )}
                        </For>
                    </div>
                    <div style={{ "margin-top": "2rem", "font-size": ".45rem", color: "rgba(0,255,65,.4)", "letter-spacing": ".2em" }}>
                        <span style={{ animation: "arc-blink 1s step-end infinite", display: "inline-block" }}>█</span>
                        {" "}NO ACCOUNT REQUIRED — JUST SHARE THE LINK
                    </div>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// THEME 4: COTTON CANDY
// Dreamy pastels · Pacifico script · Bubbly & bouncy
// ─────────────────────────────────────────────
function PastelTheme() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Nunito:wght@700;800;900&display=swap');

                @keyframes past-float1 {
                    0%,100%{transform:translateY(0) rotate(0deg);}
                    33%{transform:translateY(-16px) rotate(5deg);}
                    66%{transform:translateY(-8px) rotate(-3deg);}
                }
                @keyframes past-float2 {
                    0%,100%{transform:translateY(0) rotate(0deg);}
                    50%{transform:translateY(-20px) rotate(-8deg);}
                }
                @keyframes past-wiggle {
                    0%,100%{transform:rotate(-4deg);} 50%{transform:rotate(4deg);}
                }
                @keyframes past-bounce {
                    0%,100%{transform:translateY(0) scale(1);}
                    50%{transform:translateY(-10px) scale(1.04);}
                }
                @keyframes past-pulse-ring {
                    0%{box-shadow:0 0 0 0 rgba(139,92,246,.35);}
                    100%{box-shadow:0 0 0 20px rgba(139,92,246,0);}
                }
                .past-root {
                    min-height:100vh;
                    background:linear-gradient(135deg,#fce7f3 0%,#ede9fe 35%,#dbeafe 70%,#d1fae5 100%);
                    font-family:'Nunito',sans-serif;
                    position:relative;
                    overflow:hidden;
                }
                .past-blob {
                    position:absolute;
                    border-radius:50%;
                    filter:blur(70px);
                    opacity:.35;
                }
                .past-title {
                    font-family:'Pacifico',cursive;
                    font-size:clamp(3rem,10vw,7rem);
                    background:linear-gradient(135deg,#ec4899,#8b5cf6,#06b6d4);
                    -webkit-background-clip:text;
                    -webkit-text-fill-color:transparent;
                    background-clip:text;
                    line-height:1.2;
                    filter:drop-shadow(2px 4px 0 rgba(139,92,246,.18));
                }
                .past-cta {
                    font-family:'Nunito',sans-serif;
                    font-weight:900;
                    font-size:1.25rem;
                    background:linear-gradient(135deg,#ec4899,#8b5cf6);
                    color:white;
                    padding:1rem 3rem;
                    border-radius:9999px;
                    text-decoration:none;
                    display:inline-block;
                    box-shadow:0 8px 30px rgba(139,92,246,.35),0 3px 0 rgba(0,0,0,.1);
                    transition:all .3s;
                    animation:past-bounce 2s ease-in-out infinite,past-pulse-ring 2s ease-out infinite;
                }
                .past-cta:hover {
                    transform:translateY(-4px) scale(1.06);
                    box-shadow:0 18px 45px rgba(139,92,246,.5);
                }
                .past-card {
                    background:rgba(255,255,255,.72);
                    border-radius:24px;
                    padding:1.5rem;
                    box-shadow:0 8px 32px rgba(139,92,246,.1),0 0 0 1px rgba(255,255,255,.8);
                    backdrop-filter:blur(10px);
                    transition:all .3s;
                    text-align:center;
                }
                .past-card:hover {
                    transform:translateY(-8px) rotate(1.5deg);
                    box-shadow:0 24px 55px rgba(139,92,246,.2);
                }
                .past-tag {
                    display:inline-block;
                    background:white;
                    color:#7c3aed;
                    font-weight:800;
                    font-size:.75rem;
                    padding:.375rem 1rem;
                    border-radius:9999px;
                    box-shadow:0 2px 12px rgba(139,92,246,.15);
                    letter-spacing:.06em;
                    margin-bottom:1.5rem;
                }
            `}</style>
            <div class="past-root">
                <div class="past-blob" style={{ width: "420px", height: "420px", top: "-120px", left: "-80px", background: "#f9a8d4" }} />
                <div class="past-blob" style={{ width: "320px", height: "320px", top: "15%", right: "-60px", background: "#c4b5fd" }} />
                <div class="past-blob" style={{ width: "380px", height: "380px", bottom: "5%", left: "15%", background: "#6ee7f7" }} />
                <div style={{ position: "absolute", top: "7%", right: "7%", "font-size": "3rem", animation: "past-float1 4s ease-in-out infinite" }}>🌈</div>
                <div style={{ position: "absolute", top: "28%", left: "4%", "font-size": "2.5rem", animation: "past-float2 5s ease-in-out 1s infinite" }}>🎀</div>
                <div style={{ position: "absolute", bottom: "28%", right: "4%", "font-size": "2.5rem", animation: "past-float1 3.5s ease-in-out .5s infinite" }}>⭐</div>
                <div style={{ position: "absolute", bottom: "38%", left: "7%", "font-size": "2rem", animation: "past-wiggle 2s ease-in-out infinite" }}>🎮</div>
                <div style={{ "max-width": "800px", margin: "0 auto", padding: "5rem 2rem 8rem", position: "relative", "z-index": "1", "text-align": "center" }}>
                    <span class="past-tag">🎉 Your New Favorite Game Night</span>
                    <h1 class="past-title">Party<br />Time!</h1>
                    <p style={{ color: "#7c3aed", "font-weight": "700", "font-size": "clamp(1rem,2.5vw,1.25rem)", margin: "1.5rem auto 2.5rem", "max-width": "430px" }}>
                        Play amazing games with your friends — all from a single link! ✨
                    </p>
                    <a href="/room" class="past-cta">Let's Play! 🎊</a>
                    <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fit,minmax(160px,1fr))", gap: "1.25rem", "margin-top": "4rem" }}>
                        <For each={[
                            { emoji: "🧠", title: "Trivia", color: "#8b5cf6" },
                            { emoji: "💬", title: "Word Games", color: "#ec4899" },
                            { emoji: "🎲", title: "Party Fun", color: "#06b6d4" },
                            { emoji: "🏆", title: "Win Big", color: "#f59e0b" },
                        ]}>
                            {(item) => (
                                <div class="past-card">
                                    <div style={{ "font-size": "2.5rem", "margin-bottom": ".5rem" }}>{item.emoji}</div>
                                    <div style={{ "font-weight": "900", color: item.color, "font-size": "1.1rem" }}>{item.title}</div>
                                </div>
                            )}
                        </For>
                    </div>
                    <p style={{ "margin-top": "2.5rem", color: "#a78bfa", "font-weight": "700", "font-size": ".875rem" }}>
                        No accounts · No downloads · Just vibes 💕
                    </p>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// THEME 5: POP BANG
// Bold yellow · Halftone · Anton font · Comic book energy
// ─────────────────────────────────────────────
function PopArtTheme() {
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@500;600;700&display=swap');

                @keyframes pop-bounce {
                    0%,100%{transform:scale(1) rotate(-1deg);}
                    50%{transform:scale(1.04) rotate(1deg);}
                }
                @keyframes pop-shake {
                    0%,100%{transform:rotate(-3deg);}
                    25%{transform:rotate(-5deg) translateX(-4px);}
                    75%{transform:rotate(-1deg) translateX(4px);}
                }
                @keyframes pop-burst {
                    0%,100%{transform:scale(1) rotate(0deg);}
                    50%{transform:scale(1.12) rotate(5deg);}
                }
                @keyframes pop-slide {
                    from{transform:translateX(-80px) rotate(-4deg);opacity:0;}
                    to{transform:translateX(0) rotate(-3deg);opacity:1;}
                }
                .pop-root {
                    min-height:100vh;
                    background:#ffe135;
                    font-family:'Oswald',sans-serif;
                    position:relative;
                    overflow:hidden;
                }
                .pop-dots {
                    position:absolute;
                    inset:0;
                    background-image:radial-gradient(circle,rgba(0,0,0,.13) 1.5px,transparent 1.5px);
                    background-size:20px 20px;
                }
                .pop-title {
                    font-family:'Anton',sans-serif;
                    font-size:clamp(4.5rem,15vw,12rem);
                    color:#e63946;
                    line-height:.88;
                    -webkit-text-stroke:3px #000;
                    letter-spacing:-.01em;
                }
                .pop-bang {
                    display:inline-block;
                    background:#e63946;
                    color:white;
                    font-family:'Anton',sans-serif;
                    font-size:clamp(1.2rem,3.5vw,2.2rem);
                    padding:.3rem 1.5rem;
                    border:3px solid #000;
                    box-shadow:4px 4px 0 #000;
                    animation:pop-shake 3s ease-in-out infinite;
                    margin-bottom:1.5rem;
                    letter-spacing:.05em;
                }
                .pop-bubble {
                    background:white;
                    border:3px solid #000;
                    border-radius:20px;
                    padding:1rem 1.5rem;
                    position:relative;
                    box-shadow:4px 4px 0 #000;
                    font-size:1.05rem;
                    color:#000;
                    font-weight:500;
                    max-width:400px;
                    margin:1.75rem 0;
                    line-height:1.55;
                }
                .pop-bubble::before {
                    content:'';
                    position:absolute;
                    bottom:-17px;left:32px;
                    border:8px solid transparent;
                    border-top-color:#000;
                }
                .pop-bubble::after {
                    content:'';
                    position:absolute;
                    bottom:-12px;left:34px;
                    border:7px solid transparent;
                    border-top-color:white;
                    z-index:1;
                }
                .pop-cta {
                    font-family:'Anton',sans-serif;
                    font-size:1.75rem;
                    background:#1d3557;
                    color:#ffe135;
                    padding:1rem 3rem;
                    text-decoration:none;
                    display:inline-block;
                    border:3px solid #000;
                    box-shadow:6px 6px 0 #000;
                    transition:all .1s;
                    letter-spacing:.06em;
                    animation:pop-bounce 2s ease-in-out infinite;
                }
                .pop-cta:hover {
                    transform:translate(-3px,-3px);
                    box-shadow:9px 9px 0 #000;
                }
                .pop-card {
                    background:white;
                    border:3px solid #000;
                    padding:1.25rem;
                    box-shadow:4px 4px 0 #000;
                    transition:all .1s;
                }
                .pop-card:hover {
                    transform:translate(-3px,-3px);
                    box-shadow:7px 7px 0 #000;
                }
                .pop-label {
                    display:inline-block;
                    background:#e63946;
                    color:white;
                    font-family:'Anton',sans-serif;
                    font-size:.75rem;
                    padding:.2rem .75rem;
                    border:2px solid #000;
                    transform:rotate(-1deg);
                    letter-spacing:.1em;
                    margin-bottom:.75rem;
                }
                .pop-starburst {
                    clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    animation:pop-burst 2s ease-in-out infinite;
                }
            `}</style>
            <div class="pop-root">
                <div class="pop-dots" />
                <div class="pop-starburst" style={{ position: "absolute", top: "4%", right: "5%", width: "110px", height: "110px", background: "#1d3557" }}>
                    <span style={{ color: "#ffe135", "font-family": "'Anton',sans-serif", "font-size": ".65rem", "text-align": "center", "z-index": "1", "letter-spacing": ".05em" }}>FREE!</span>
                </div>
                <div class="pop-starburst" style={{ position: "absolute", bottom: "22%", right: "3%", width: "75px", height: "75px", background: "#e63946", "animation-delay": ".4s" }} />
                <div class="pop-starburst" style={{ position: "absolute", top: "30%", left: "2%", width: "60px", height: "60px", background: "#f59e0b", "animation-delay": ".8s" }} />
                <div style={{ "max-width": "900px", margin: "0 auto", padding: "4rem 2rem 8rem", position: "relative", "z-index": "1" }}>
                    <div class="pop-bang">🎮 PARTY GAMES!</div>
                    <h1 class="pop-title">PLAY<br />NOW!</h1>
                    <div class="pop-bubble">
                        Trivia, word games & more — just share a link and PLAY with your friends! No accounts needed!
                    </div>
                    <div style={{ "margin-bottom": "3rem" }}>
                        <a href="/room" class="pop-cta">START PLAYING!</a>
                    </div>
                    <div style={{ display: "grid", "grid-template-columns": "repeat(auto-fit,minmax(175px,1fr))", gap: "1rem" }}>
                        <For each={[
                            { tag: "BRAIN", icon: "🧠", title: "TRIVIA" },
                            { tag: "WIT", icon: "💬", title: "WORD GAMES" },
                            { tag: "FAST", icon: "⚡", title: "QUICK PLAY" },
                        ]}>
                            {(item) => (
                                <div class="pop-card">
                                    <div class="pop-label">{item.tag}</div>
                                    <div style={{ "font-size": "2.2rem" }}>{item.icon}</div>
                                    <div style={{ "font-family": "'Anton',sans-serif", "font-size": "1.5rem", color: "#1d3557", "margin-top": ".25rem", "letter-spacing": ".02em" }}>{item.title}</div>
                                </div>
                            )}
                        </For>
                    </div>
                    <p style={{ "margin-top": "2rem", "font-family": "'Anton',sans-serif", "font-size": ".8rem", color: "#000", "letter-spacing": ".15em" }}>
                        ★ NO ACCOUNT REQUIRED ★ SHARE A LINK ★ INSTANT FUN ★
                    </p>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────
// THEME SWITCHER DATA
// ─────────────────────────────────────────────
const THEMES = [
    { id: 1, name: "Carnival",  emoji: "🎪", accent: "#fde68a", bg: "#1a1040" },
    { id: 2, name: "Hearthside",emoji: "🎲", accent: "#fde68a", bg: "#78350f" },
    { id: 3, name: "Arcade",    emoji: "👾", accent: "#00ff41", bg: "#000000" },
    { id: 4, name: "Pastel",    emoji: "🌸", accent: "#fff",    bg: "#8b5cf6" },
    { id: 5, name: "Pop Bang",  emoji: "💥", accent: "#ffe135", bg: "#e63946" },
] as const;

// ─────────────────────────────────────────────
// INDEX
// ─────────────────────────────────────────────
function Index() {
    const [active, setActive] = createSignal<number>(1);

    return (
        <div style={{ position: "relative" }}>
            <Show when={active() === 1}><CarnivalTheme /></Show>
            <Show when={active() === 2}><HeartsideTheme /></Show>
            <Show when={active() === 3}><ArcadeTheme /></Show>
            <Show when={active() === 4}><PastelTheme /></Show>
            <Show when={active() === 5}><PopArtTheme /></Show>

            {/* ── Floating Theme Switcher ── */}
            <div style={{
                position: "fixed",
                bottom: "1.5rem",
                left: "50%",
                transform: "translateX(-50%)",
                "z-index": "9999",
                display: "flex",
                "align-items": "center",
                gap: ".5rem",
                background: "rgba(0,0,0,.82)",
                "backdrop-filter": "blur(14px)",
                padding: ".5rem .75rem",
                "border-radius": "9999px",
                border: "1px solid rgba(255,255,255,.14)",
                "box-shadow": "0 8px 40px rgba(0,0,0,.5)",
            }}>
                <For each={THEMES}>
                    {(theme) => (
                        <button
                            onClick={() => setActive(theme.id)}
                            title={theme.name}
                            style={{
                                width: "2.4rem",
                                height: "2.4rem",
                                "border-radius": "9999px",
                                background: active() === theme.id ? theme.bg : "rgba(255,255,255,.08)",
                                border: active() === theme.id ? `2px solid ${theme.accent}` : "2px solid transparent",
                                cursor: "pointer",
                                "font-size": "1.1rem",
                                transition: "all .2s",
                                display: "flex",
                                "align-items": "center",
                                "justify-content": "center",
                                transform: active() === theme.id ? "scale(1.2)" : "scale(1)",
                                "box-shadow": active() === theme.id ? `0 0 12px ${theme.bg}88` : "none",
                            }}
                        >
                            {theme.emoji}
                        </button>
                    )}
                </For>
                <div style={{
                    "padding-left": ".6rem",
                    "border-left": "1px solid rgba(255,255,255,.18)",
                    "margin-left": ".15rem",
                }}>
                    <span style={{
                        color: "rgba(255,255,255,.55)",
                        "font-size": ".6rem",
                        "font-family": "monospace",
                        "white-space": "nowrap",
                        display: "block",
                        "min-width": "5rem",
                    }}>
                        {THEMES.find(t => t.id === active())?.name}
                    </span>
                </div>
            </div>
        </div>
    );
}
