"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { MessageSquare, Send, ShieldAlert } from "lucide-react";
import { useAnimeTealSession } from "@/hooks/use-anime-session";

type AnimeComment = {
  id: string;
  content: string;
  spoiler: boolean;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
  isOwner?: boolean;
};

export default function AnimeComments({
  animeId,
  animeTitle,
}: {
  animeId: string;
  animeTitle: string;
}) {
  const { user } = useAnimeTealSession();
  const [comments, setComments] = useState<AnimeComment[]>([]);
  const [content, setContent] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "/api/comments?animeId=" + encodeURIComponent(animeId),
        { cache: "no-store" },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load comments.");
      setComments(data.items || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [animeId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || posting) return;

    setPosting(true);
    setError("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ animeId, animeTitle, content, spoiler }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not post your comment.");
      setComments((items) => [data.item, ...items]);
      setContent("");
      setSpoiler(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your comment.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-[#0d121d] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-500/10 p-2 text-indigo-300">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Community discussion</h2>
          <p className="text-xs text-slate-400">Share your thoughts about {animeTitle}.</p>
        </div>
        <span className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          {comments.length}
        </span>
      </div>

      {user ? (
        <form onSubmit={submitComment} className="space-y-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value.slice(0, 1000))}
            placeholder="What did you think about this anime?"
            rows={3}
            maxLength={1000}
            className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-400/50"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-amber-200">
              <input
                type="checkbox"
                checked={spoiler}
                onChange={(event) => setSpoiler(event.target.checked)}
                className="accent-amber-400"
              />
              Contains spoilers
            </label>
            <span className="text-[11px] text-slate-500">{content.length}/1000</span>
            <button
              type="submit"
              disabled={!content.trim() || posting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {posting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-200">Sign in with Discord to join the discussion.</p>
          <a
            href="/api/auth/discord/start"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400"
          >
            Continue with Discord
          </a>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-rose-300">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-7 text-center">
          <MessageSquare className="mx-auto mb-2 h-7 w-7 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">No comments yet</p>
          <p className="mt-1 text-xs text-slate-500">Start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const showSpoiler = !comment.spoiler || revealed[comment.id];
            return (
              <article key={comment.id} className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/15 p-3">
                {comment.avatarUrl ? (
                  <Image
                    src={comment.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 shrink-0 rounded-full"
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-500/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">{comment.displayName}</span>
                    <time className="text-[10px] text-slate-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </time>
                  </div>
                  {showSpoiler ? (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                      {comment.content}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRevealed((value) => ({ ...value, [comment.id]: true }))}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs font-semibold text-amber-200"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Reveal spoiler
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
