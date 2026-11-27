# Grid Chase: Obsidian — Free Cloudflare WebSocket Relay

This lightweight Cloudflare Worker + SQLite Durable Object replaces PeerJS WebRTC P2P with standard HTTPS/WebSocket rooms (`wss://...`) so players on **5G/LTE cellular, different Wi-Fi networks, or strict firewalls** connect reliably without exposing each other's IP addresses.

Runs 100% on the **Cloudflare Workers Free Plan ($0/month, no credit card required)**.

## Option A: Deploy Directly from GitHub (No Terminal Needed)
1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Go to **Workers & Pages** → **Create** → **Import a repository** (or **Continue with GitHub**).
3. Select your `grid-chase-obsidian` repository.
4. Set **Root directory** to `relay` and **Deploy command** to `npx wrangler deploy`.
5. Click **Save and Deploy**. Cloudflare gives you a free URL like:
   `https://grid-chase-relay.<your-subdomain>.workers.dev`

## Option B: Deploy from Your Computer (1 Command)
```bash
cd relay
npm install
npx wrangler login
npx wrangler deploy
```

## Connect Your Game to the Relay
- Paste your `https://grid-chase-relay.<your-subdomain>.workers.dev` URL into the **Relay Server URL** box in the game's **Online PvP** tab (or set `DEFAULT_RELAY_URL` in `index.html` so every player connects automatically without pasting anything).
