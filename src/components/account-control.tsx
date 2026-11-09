"use client";

import Image from "next/image";
import Link from "next/link";
import { useAnimeTealSession } from "@/hooks/use-anime-session";

export default function AccountControl() {
  const { user, loading, signOut } = useAnimeTealSession();

  if (loading) {
    return <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.06]" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <a
        href="/api/auth/discord/start"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-sm font-bold text-indigo-100 transition hover:bg-indigo-500/25"
      >
        <span aria-hidden="true">◈</span>
        Sign in with Discord
      </a>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5">
      {user.avatarUrl ? (
        <Image
          src={user.avatarUrl}
          alt=""
          width={30}
          height={30}
          unoptimized
          className="h-[30px] w-[30px] rounded-full"
        />
      ) : (
        <div className="h-[30px] w-[30px] rounded-full bg-indigo-500/30" />
      )}
      <span className="max-w-28 truncate text-xs font-semibold text-slate-100">
        {user.displayName}
      </span>
      {user.isAdmin && (
        <Link href="/admin" className="text-[11px] font-bold text-teal-300 hover:text-teal-200">
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
