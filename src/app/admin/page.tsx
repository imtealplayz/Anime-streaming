"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, MessageSquare, Smartphone, Users } from "lucide-react";
import { FileClock } from "lucide-react";

type Stats = {
  registeredUsers: number;
  activeToday: number;
  active7Days: number;
  active30Days: number;
  androidActiveToday: number;
  websiteActiveToday: number;
  newUsers7Days: number;
  totalComments: number;
  generatedAt: string;
};

const metricCards = [
  { key: "registeredUsers", label: "Registered accounts", icon: Users },
  { key: "activeToday", label: "Active in last 24 hours", icon: Activity },
  { key: "active7Days", label: "Active in last 7 days", icon: Activity },
  { key: "active30Days", label: "Active in last 30 days", icon: Activity },
  { key: "androidActiveToday", label: "Android active today", icon: Smartphone },
  { key: "websiteActiveToday", label: "Website active today", icon: Activity },
  { key: "newUsers7Days", label: "New accounts this week", icon: Users },
  { key: "totalComments", label: "Community comments", icon: MessageSquare },
] as const;

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load dashboard.");
        if (active) setStats(data);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-20 pt-28 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to AnimeTeal
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">AnimeTeal</p>
          <h1 className="mt-2 text-3xl font-black">Admin dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Registered Discord accounts and recent account activity.</p>
          <Link
            href="/logs"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-teal-300/20 bg-teal-300/[0.07] px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-teal-300/[0.12]"
          >
            <FileClock className="h-4 w-4" /> Open security logs
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((card) => (
              <div key={card.key} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))}
          </div>
        ) : message ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5 text-sm text-amber-100">
            {message}
            {message.includes("Admin access") && (
              <p className="mt-2 text-xs text-amber-200/70">
                Add your Discord user ID to ADMIN_DISCORD_IDS in Vercel, then redeploy.
              </p>
            )}
          </div>
        ) : stats ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metricCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.key} className="rounded-2xl border border-white/10 bg-[#0d121d] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-400">{card.label}</span>
                      <Icon className="h-4 w-4 text-teal-300" />
                    </div>
                    <p className="mt-4 text-3xl font-black tabular-nums">{stats[card.key].toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Updated {new Date(stats.generatedAt).toLocaleString()}. Activity is based on authenticated account check-ins, not raw app opens by logged-out users.
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
