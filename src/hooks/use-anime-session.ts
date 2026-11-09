"use client";

import { useCallback, useEffect } from "react";
import { create } from "zustand";

export type AnimeTealSessionUser = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
};

type AnimeTealSessionState = {
  user: AnimeTealSessionUser | null;
  loading: boolean;
};

const useSessionStore = create<AnimeTealSessionState>(() => ({
  user: null,
  loading: true,
}));

// Account controls and comment forms share one session lookup and one state.
// This prevents separate components from briefly disagreeing about login status.
let refreshInFlight: Promise<void> | null = null;

function refreshSession(force = false): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  if (!force && !useSessionStore.getState().loading) return Promise.resolve();

  refreshInFlight = (async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      useSessionStore.setState({
        user: response.ok ? data.user ?? null : null,
      });
    } catch {
      useSessionStore.setState({ user: null });
    } finally {
      useSessionStore.setState({ loading: false });
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function useAnimeTealSession() {
  const user = useSessionStore((state) => state.user);
  const loading = useSessionStore((state) => state.loading);

  useEffect(() => {
    void refreshSession();
  }, []);

  const refresh = useCallback(() => refreshSession(true), []);

  const signOut = useCallback(async () => {
    if (refreshInFlight) await refreshInFlight;
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    useSessionStore.setState({ user: null, loading: false });
  }, []);

  return { user, loading, refresh, signOut };
}
