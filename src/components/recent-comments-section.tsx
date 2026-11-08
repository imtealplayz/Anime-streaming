"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Play, AlertTriangle, EyeOff } from "lucide-react";
import { useGetRecentComments } from "@/hooks/use-comments";
import Avatar from "@/components/common/avatar";
import { formatDistanceToNow } from "date-fns";
import Container from "@/components/container";

const RecentCommentsSection = () => {
  const { data: comments, isLoading } = useGetRecentComments(8);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isLoading && (!comments || comments.length === 0)) {
    return null;
  }

  return (
    <Container className="space-y-6 my-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            Community Activity
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 bg-slate-800/60 animate-pulse rounded-xl border border-slate-800"
            ></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {comments?.map((comment) => {
            const user = comment.expand?.user;
            const createdDate = comment.created
              ? new Date(comment.created)
              : new Date();
            const isSpoiler = comment.spoil;
            const showSpoiler = revealed[comment.id];

            return (
              <div
                key={comment.id}
                className="flex flex-col justify-between glass-panel p-4 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition shadow-sm group"
              >
                <div className="flex flex-col gap-2.5">
                  {/* Header: User Info */}
                  <div className="flex items-center gap-2.5">
                    {user ? (
                      <Avatar
                        collectionID={user.collectionId}
                        id={user.id}
                        url={user.avatar}
                        className="h-8 w-8 rounded-full shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold shrink-0">
                        ?
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">
                        {user?.username || "Anonymous"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatDistanceToNow(createdDate, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Anime Title & Ep Badge */}
                  <div className="flex items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5">
                    <span
                      className="text-xs font-semibold text-slate-300 truncate"
                      title={comment.animeTitle}
                    >
                      {comment.animeTitle || "Anime"}
                    </span>
                    <span className="text-[10px] font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-2 py-0.5 rounded-md shadow-sm shrink-0">
                      Ep {comment.episodeNumber}
                    </span>
                  </div>

                  {/* Comment Body */}
                  {isSpoiler && !showSpoiler ? (
                    <button
                      onClick={() => toggleReveal(comment.id)}
                      className="flex items-center justify-center gap-1.5 p-2 bg-yellow-950/40 border border-yellow-800/40 text-yellow-300/90 rounded-xl text-xs hover:bg-yellow-900/50 transition w-full"
                    >
                      <AlertTriangle className="h-3 w-3 text-yellow-400" />{" "}
                      Spoiler — Click to view
                    </button>
                  ) : (
                    <div className="relative">
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed break-words">
                        {comment.content}
                      </p>
                      {isSpoiler && showSpoiler && (
                        <button
                          onClick={() => toggleReveal(comment.id)}
                          className="text-[10px] text-yellow-500/80 hover:text-yellow-400 flex items-center gap-1 mt-1 font-semibold"
                        >
                          <EyeOff className="h-3 w-3" /> Hide Spoiler
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Link to Episode */}
                <Link
                  href={`/anime/watch?anime=${comment.animeId}&ep=${comment.episodeNumber}`}
                  className="flex items-center justify-center gap-1.5 mt-3 pt-2.5 border-t border-white/10 text-xs font-bold text-slate-400 group-hover:text-cyan-400 transition"
                >
                  <Play className="h-3 w-3 fill-current" /> Watch Episode{" "}
                  {comment.episodeNumber}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
};

export default RecentCommentsSection;
