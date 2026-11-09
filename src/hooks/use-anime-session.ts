"use client";

import { useCallback, useEffect, useState } from "react";

export type AnimeTealSessionUser = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
};

export function useAnimeTealSession() {
  const [user, setUser] = useState<AnimeTealSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      setUser(response.ok ? data.user ?? null : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    setUser(null);
  }, []);

  return { user, loading, refresh, signOut };
}
