# Grid Chase: Obsidian

A 3D WebGL Light Cycle combat arena built with Three.js, GLSL shaders, Cloudflare Workers WebSockets, and Web Audio.

## Modes
- **Solo vs. AI (4 Cycles):** Battle Veteran, Apex, or Rookie AI across 3 arenas (Open Grid, 4-Pillar Foundry, Reactor Core).
- **2-Player Local Split-Screen:** Dual 3D viewports (`1v1 Duel` or `2P + 2 AI`) with independent cameras, vignettes, and P2 Cycle Garage livery.
- **4-Player Online PvP (Free Cloudflare WebSocket Relay):** Host a `GRID-XXXX` room for up to 4 players across any Wi-Fi or 5G/LTE network with a live 4-slot roster, **Fill Empty Slots with AI** toggle, Ready-Up checkmarks, and live Ping (ms).

## Controls
- **Player 1 / Solo / Online:** `A`/`D` (or `Z`/`X` double-binds) to turn • `Space` Nitro • `Left Shift` Brake-Bait • `C` Camera (Low / High / Iso / First-Person Visor)
- **Player 2 (Split-Screen):** `←`/`→` to turn • `↑`/`Right Shift` Nitro • `↓` Brake-Bait • `V` P2 Camera
- **Global:** `Tab` Spectate Survivors • `M` Mute • `P`/`Esc` Pause • `R` Rematch

## Free Online Relay Setup
See [`relay/README.md`](relay/README.md) to deploy the included zero-cost Cloudflare Workers + Durable Objects WebSocket relay in ~2 minutes (no credit card required).

## Live Game
Play live on GitHub Pages: https://thatboi-427.github.io/grid-chase-obsidian/
