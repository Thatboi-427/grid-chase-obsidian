import { DurableObject } from "cloudflare:workers";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const MAX_MESSAGE_BYTES = 16384;
const MAX_GUESTS_PER_ROOM = 4;

export class GameRoom extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426, headers: CORS_HEADERS });
    }

    const role = url.searchParams.get("role") === "host" ? "host" : "guest";
    const room = (url.searchParams.get("room") || "ROOM").toUpperCase();

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    if (role === "host") {
      // Close any stale host socket before accepting the new host
      for (const oldHost of this.ctx.getWebSockets("host")) {
        try {
          oldHost.send(JSON.stringify({ t: "relay_error", code: "replaced", msg: "Room taken over by another host session." }));
          oldHost.close(1000, "Host replaced");
        } catch (_) {}
      }

      this.ctx.acceptWebSocket(server, ["host"]);
      server.serializeAttachment({ role: "host", peerId: "host", room });
      server.send(JSON.stringify({ t: "relay_ready", role: "host", peerId: "host", room }));

      // Notify host of any guests already waiting (rare reconnect case)
      for (const g of this.ctx.getWebSockets("guest")) {
        const meta = g.deserializeAttachment();
        if (meta && meta.peerId) {
          try { server.send(JSON.stringify({ t: "peer_join", peerId: meta.peerId })); } catch (_) {}
        }
      }
      return new Response(null, { status: 101, webSocket: client });
    }

    // Guest connection requires an active host in the room
    const hosts = this.ctx.getWebSockets("host");
    if (hosts.length === 0) {
      this.ctx.acceptWebSocket(server, ["rejected"]);
      server.serializeAttachment({ role: "rejected" });
      server.send(JSON.stringify({
        t: "relay_error",
        code: "no_host",
        msg: `Room GRID-${room} not found (Host has not created this room or disconnected).`
      }));
      server.close(1000, "No host");
      return new Response(null, { status: 101, webSocket: client });
    }

    const guests = this.ctx.getWebSockets("guest");
    if (guests.length >= MAX_GUESTS_PER_ROOM) {
      this.ctx.acceptWebSocket(server, ["rejected"]);
      server.serializeAttachment({ role: "rejected" });
      server.send(JSON.stringify({
        t: "relay_error",
        code: "full",
        msg: "Room is full."
      }));
      server.close(1000, "Room full");
      return new Response(null, { status: 101, webSocket: client });
    }

    const peerId = "g-" + crypto.randomUUID().slice(0, 8);
    this.ctx.acceptWebSocket(server, ["guest", peerId]);
    server.serializeAttachment({ role: "guest", peerId, room });

    server.send(JSON.stringify({ t: "relay_ready", role: "guest", peerId, room }));
    for (const hostWs of hosts) {
      try { hostWs.send(JSON.stringify({ t: "peer_join", peerId })); } catch (_) {}
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return;
    const meta = ws.deserializeAttachment();
    if (!meta || meta.role === "rejected") return;

    let env;
    try {
      env = JSON.parse(message);
    } catch (_) {
      return;
    }
    if (!env || typeof env !== "object") return;

    if (meta.role === "host") {
      if (env.t === "kick" && typeof env.to === "string") {
        for (const target of this.ctx.getWebSockets(env.to)) {
          try { target.close(1000, "Kicked by host"); } catch (_) {}
        }
        return;
      }
      if (env.to === "*") {
        const out = JSON.stringify({ t: "peer_msg", from: "host", data: env.data });
        for (const guestWs of this.ctx.getWebSockets("guest")) {
          try { guestWs.send(out); } catch (_) {}
        }
        return;
      }
      if (typeof env.to === "string") {
        const out = JSON.stringify({ t: "peer_msg", from: "host", data: env.data });
        for (const target of this.ctx.getWebSockets(env.to)) {
          try { target.send(out); } catch (_) {}
        }
      }
    } else if (meta.role === "guest") {
      const out = JSON.stringify({ t: "peer_msg", from: meta.peerId, data: env.data });
      for (const hostWs of this.ctx.getWebSockets("host")) {
        try { hostWs.send(out); } catch (_) {}
      }
    }
  }

  webSocketClose(ws) {
    this.#handleDisconnect(ws);
  }

  webSocketError(ws) {
    this.#handleDisconnect(ws);
  }

  #handleDisconnect(ws) {
    const meta = ws.deserializeAttachment();
    if (!meta || meta.role === "rejected") return;

    if (meta.role === "guest") {
      for (const hostWs of this.ctx.getWebSockets("host")) {
        try { hostWs.send(JSON.stringify({ t: "peer_leave", peerId: meta.peerId })); } catch (_) {}
      }
    } else if (meta.role === "host") {
      for (const guestWs of this.ctx.getWebSockets("guest")) {
        try {
          guestWs.send(JSON.stringify({ t: "host_left" }));
          guestWs.close(1000, "Host disconnected");
        } catch (_) {}
      }
    }
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, service: "grid-chase-obsidian-relay", transport: "websocket" }),
        { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const match = url.pathname.match(/^\/room\/([A-Za-z0-9]{3,10})$/);
    if (!match) {
      return new Response("Not found. Connect via /room/<CODE>?role=host|guest", {
        status: 404,
        headers: CORS_HEADERS
      });
    }

    const roomCode = match[1].toUpperCase();
    const id = env.GAME_ROOMS.idFromName(roomCode);
    const stub = env.GAME_ROOMS.get(id);

    const forwardUrl = new URL(request.url);
    forwardUrl.searchParams.set("room", roomCode);
    return stub.fetch(new Request(forwardUrl.toString(), request));
  }
};
