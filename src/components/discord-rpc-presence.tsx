"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Monitor,
  Power,
  Radio,
  ShieldAlert,
} from "lucide-react";

const DISCORD_APPLICATION_ID = "1568740982042787840";
const TOKEN_STORAGE_KEY = "animeteal.discord.rpc.session.v1";
const RPC_PORTS = Array.from({ length: 10 }, (_, index) => 6463 + index);

type DiscordToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type PresenceMetadata = {
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
};

type PendingRequest = {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type RpcSocket = WebSocket & {
  __animetealPending?: Map<string, PendingRequest>;
};

function createNonce() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRpcSocket(port: number): Promise<RpcSocket> {
  return new Promise((resolve, reject) => {
    let socket: RpcSocket;

    try {
      const url = new URL(`ws://127.0.0.1:${port}/`);
      url.searchParams.set("v", "1");
      url.searchParams.set("client_id", DISCORD_APPLICATION_ID);
      url.searchParams.set("encoding", "json");
      socket = new WebSocket(url.toString()) as RpcSocket;
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not open Discord RPC."));
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error("Discord RPC did not respond on this port."));
    }, 900);

    socket.onopen = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.__animetealPending = new Map();

      socket.onmessage = (event) => {
        let message: any;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (message?.nonce && socket.__animetealPending?.has(message.nonce)) {
          const pending = socket.__animetealPending.get(message.nonce)!;
          clearTimeout(pending.timeout);
          socket.__animetealPending.delete(message.nonce);

          if (message.evt === "ERROR") {
            const code = message.data?.code;
            const detail = message.data?.message || "Discord rejected the RPC request.";
            pending.reject(new Error(code ? `${detail} (Discord error ${code})` : detail));
          } else {
            pending.resolve(message.data ?? message);
          }
        }
      };

      socket.onclose = () => {
        socket.__animetealPending?.forEach((pending) => {
          clearTimeout(pending.timeout);
          pending.reject(new Error("The Discord RPC connection closed."));
        });
        socket.__animetealPending?.clear();
      };

      resolve(socket);
    };

    socket.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error("Discord RPC is unavailable on this port."));
    };
  });
}

async function openDiscordRpc(): Promise<RpcSocket> {
  let lastError: Error | null = null;

  for (const port of RPC_PORTS) {
    try {
      return await createRpcSocket(port);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Discord RPC connection failed.");
    }
  }

  throw lastError || new Error("Could not find Discord's local RPC service.");
}

function rpcRequest(
  socket: RpcSocket,
  command: string,
  args: Record<string, unknown>,
  timeoutMs = 15000,
): Promise<any> {
  if (socket.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error("Discord RPC is not connected."));
  }

  const nonce = createNonce();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.__animetealPending?.delete(nonce);
      reject(new Error(`Discord did not respond to ${command}.`));
    }, timeoutMs);

    socket.__animetealPending?.set(nonce, { resolve, reject, timeout });

    try {
      socket.send(JSON.stringify({ cmd: command, args, nonce }));
    } catch (error) {
      clearTimeout(timeout);
      socket.__animetealPending?.delete(nonce);
      reject(error instanceof Error ? error : new Error("Could not send the Discord RPC request."));
    }
  });
}

async function exchangeRpcCode(code: string): Promise<DiscordToken> {
  const response = await fetch("/api/discord/rpc/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ grantType: "authorization_code", code }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Discord authorization could not be completed.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Number(payload.expires_in || 604800) * 1000,
  };
}

async function refreshRpcToken(token: DiscordToken): Promise<DiscordToken> {
  if (token.expiresAt > Date.now() + 60000) return token;

  const response = await fetch("/api/discord/rpc/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      grantType: "refresh_token",
      refreshToken: token.refreshToken,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Your Discord connection expired. Please reconnect.");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || token.refreshToken,
    expiresAt: Date.now() + Number(payload.expires_in || 604800) * 1000,
  };
}

function readSavedToken(): DiscordToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as DiscordToken;
    if (!token.accessToken || !token.refreshToken || !token.expiresAt) return null;
    return token;
  } catch {
    return null;
  }
}

function saveToken(token: DiscordToken) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
}

function activityFor(metadata: PresenceMetadata, startedAt: number) {
  const watchUrl = new URL("/anime/watch", window.location.origin);
  watchUrl.searchParams.set("anime", metadata.animeId);
  watchUrl.searchParams.set("ep", String(metadata.episodeNumber));

  return {
    // Browser pages do not expose their operating-system PID. Discord's
    // WebSocket RPC accepts a numeric PID field; zero identifies this web session.
    pid: 0,
    activity: {
      type: 3,
      details: `Watching ${metadata.animeTitle}`.slice(0, 128),
      details_url: watchUrl.toString(),
      state: `Episode ${metadata.episodeNumber}`.slice(0, 128),
      timestamps: { start: startedAt },
      buttons: [{ label: "Watch", url: watchUrl.toString() }],
      instance: false,
    },
  };
}

type Props = {
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
};

export default function DiscordRpcPresence({
  animeId,
  animeTitle,
  episodeNumber,
}: Props) {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [message, setMessage] = useState("");
  const socketRef = useRef<RpcSocket | null>(null);
  const tokenRef = useRef<DiscordToken | null>(null);
  const connectedRef = useRef(false);
  const metadataRef = useRef<PresenceMetadata>({ animeId, animeTitle, episodeNumber });
  const episodeKeyRef = useRef(`${animeId}:${episodeNumber}`);
  const startedAtRef = useRef(Math.floor(Date.now() / 1000));
  const mountedRef = useRef(true);

  const publishActivity = useCallback(async (socket: RpcSocket) => {
    const metadata = metadataRef.current;
    if (!metadata.animeId || !metadata.animeTitle) return;

    await rpcRequest(
      socket,
      "SET_ACTIVITY",
      activityFor(metadata, startedAtRef.current),
    );
  }, []);

  const finishConnection = useCallback(() => {
    connectedRef.current = false;
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  const authenticateSavedSession = useCallback(async () => {
    const saved = readSavedToken();
    if (!saved) return;

    setStatus("connecting");
    setMessage("Reconnecting to Discord…");

    let socket: RpcSocket | null = null;
    try {
      socket = await openDiscordRpc();
      const token = await refreshRpcToken(saved);
      saveToken(token);
      tokenRef.current = token;

      await rpcRequest(socket, "AUTHENTICATE", {
        access_token: token.accessToken,
      });

      socketRef.current = socket;
      connectedRef.current = true;
      await publishActivity(socket);

      if (mountedRef.current) {
        setStatus("connected");
        setMessage("Your anime is being shared with Discord.");
      }
    } catch {
      socket?.close();
      tokenRef.current = null;
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      if (mountedRef.current) {
        setStatus("idle");
        setMessage("Reconnect Discord to resume sharing your activity.");
      }
    }
  }, [publishActivity]);

  const connectDiscord = useCallback(async () => {
    if (status === "connecting") return;

    setStatus("connecting");
    setMessage("Looking for the Discord desktop app…");

    let socket: RpcSocket | null = null;
    try {
      socket = await openDiscordRpc();
      socketRef.current = socket;
      setMessage("Approve AnimeTeal in the Discord authorization window…");

      const authorization = await rpcRequest(
        socket,
        "AUTHORIZE",
        {
          client_id: DISCORD_APPLICATION_ID,
          scopes: ["rpc", "identify"],
        },
        45000,
      );

      if (!authorization?.code) {
        throw new Error("Discord did not return an authorization code.");
      }

      setMessage("Finishing Discord authorization…");
      const token = await exchangeRpcCode(authorization.code);
      saveToken(token);
      tokenRef.current = token;

      await rpcRequest(socket, "AUTHENTICATE", {
        access_token: token.accessToken,
      });

      connectedRef.current = true;
      await publishActivity(socket);

      setStatus("connected");
      setMessage("Your anime is now being shared with Discord.");
    } catch (error) {
      socket?.close();
      socketRef.current = null;
      connectedRef.current = false;
      const detail = error instanceof Error ? error.message : "Discord connection failed.";
      setStatus("error");
      if (/4006|tester|authorization/i.test(detail)) {
        setMessage(`${detail} Make sure your Discord account is allowed to test this application.`);
      } else if (/unavailable|local rpc|port/i.test(detail)) {
        setMessage("Discord desktop was not detected. Open the Discord desktop app, sign in, and try again.");
      } else {
        setMessage(detail);
      }
    }
  }, [publishActivity, status]);

  const disconnectDiscord = useCallback(async () => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && connectedRef.current) {
      try {
        await rpcRequest(socket, "SET_ACTIVITY", { pid: 0, activity: null }, 4000);
      } catch {
        // Closing the connection also removes the local activity.
      }
    }

    finishConnection();
    tokenRef.current = null;
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setStatus("idle");
    setMessage("Discord Rich Presence is turned off.");
  }, [finishConnection]);

  useEffect(() => {
    metadataRef.current = { animeId, animeTitle, episodeNumber };
    const nextEpisodeKey = `${animeId}:${episodeNumber}`;
    if (episodeKeyRef.current !== nextEpisodeKey) {
      episodeKeyRef.current = nextEpisodeKey;
      startedAtRef.current = Math.floor(Date.now() / 1000);
    }

    if (connectedRef.current && socketRef.current) {
      void publishActivity(socketRef.current).catch((error) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not update Discord activity.");
        finishConnection();
      });
    }
  }, [animeId, animeTitle, episodeNumber, finishConnection, publishActivity]);

  useEffect(() => {
    mountedRef.current = true;
    void authenticateSavedSession();

    return () => {
      mountedRef.current = false;
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN && connectedRef.current) {
        void rpcRequest(socket, "SET_ACTIVITY", { pid: 0, activity: null }, 1500)
          .catch(() => undefined)
          .finally(() => {
            socket.close();
          });
      } else {
        socket?.close();
      }
      socketRef.current = null;
      connectedRef.current = false;
    };
  }, [authenticateSavedSession]);

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-cyan-950/40 p-4 shadow-lg shadow-black/20 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-white">Discord Rich Presence</h2>
              {status === "connected" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Show <span className="font-semibold text-white">{animeTitle}</span> · Episode{" "}
              <span className="font-semibold text-white">{episodeNumber}</span> on your Discord profile.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Requires the Discord desktop app to be open. You can still view your updated profile from Discord Web.
              Activity buttons are visible to other people viewing your profile.
            </p>
            {message && (
              <p
                className={`mt-2 flex items-start gap-1.5 text-xs leading-relaxed ${
                  status === "error" ? "text-amber-300" : "text-slate-300"
                }`}
                role="status"
              >
                {status === "error" ? (
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                ) : null}
                <span>{message}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {status === "connected" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={disconnectDiscord}
              className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <Power className="mr-2 h-4 w-4" /> Turn off
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={connectDiscord}
              disabled={status === "connecting"}
              className="bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400"
            >
              {status === "connecting" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Monitor className="mr-2 h-4 w-4" />
              )}
              {status === "connecting" ? "Connecting…" : "Enable on Discord"}
            </Button>
          )}
          <a
            href="https://discord.com/download"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            Desktop app <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}
