"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Stats, User } from "@/lib/types";

type Patch = Partial<Stats> | ((stats: Stats) => Stats);

type UserContextValue = {
  user: User;
  stats: Stats;
  patchStats: (patch: Patch) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}

export function UserProvider({
  initialUser,
  initialStats,
  children,
}: {
  initialUser: User;
  initialStats: Stats;
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && timezone !== initialUser.timezone) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      }).catch(() => {});
    }
  }, [initialUser.timezone]);

  const patchStats = useCallback((patch: Patch) => {
    setStats((current) => (typeof patch === "function" ? patch(current) : { ...current, ...patch }));
  }, []);

  const value = useMemo(() => ({ user: initialUser, stats, patchStats }), [initialUser, stats, patchStats]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
