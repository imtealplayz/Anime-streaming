"use client";

import React, { useEffect, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import { History } from "lucide-react";

type WatchedEntry = {
  anime: { id: string; title: string; poster: string };
  episodes: string[];
};

type WatchedAnime = {
  id: string;
  name: string;
  poster: string;
  episode: string;
};

type Props = {
  loading: boolean;
};

const ContinueWatching = ({ loading }: Props) => {
  const [anime, setAnime] = useState<WatchedAnime[] | null>(null);

  useEffect(() => {
    const refreshHistory = () => {
      try {
        const storedData = localStorage.getItem("watched");
        const watchedAnimes: WatchedEntry[] = storedData ? JSON.parse(storedData) : [];

        if (!Array.isArray(watchedAnimes)) {
          localStorage.removeItem("watched");
          setAnime(null);
          return;
        }

        const entries = watchedAnimes
          .filter((item) => item?.anime?.id && Array.isArray(item.episodes) && item.episodes.length > 0)
          .slice()
          .reverse()
          .map((item) => ({
            id: item.anime.id,
            name: item.anime.title,
            poster: item.anime.poster,
            episode: item.episodes[item.episodes.length - 1],
          }));

        setAnime(entries);
      } catch (error) {
        console.error("Could not read local watch history:", error);
        setAnime(null);
      }
    };

    refreshHistory();
    window.addEventListener("animeteal:watch-history-updated", refreshHistory);
    window.addEventListener("focus", refreshHistory);
    return () => {
      window.removeEventListener("animeteal:watch-history-updated", refreshHistory);
      window.removeEventListener("focus", refreshHistory);
    };
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!anime?.length) return null;

  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500 shrink-0" />
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Continue Watching
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 sm:gap-4 md:gap-5 w-full">
        {anime.map((ani, idx) => (
          <div key={`${ani.id}-${idx}`} className="w-full">
            <AnimeCard
              title={ani.name}
              poster={ani.poster}
              href={`${ROUTES.WATCH}?anime=${ani.id}&ep=${ani.episode}`}
            />
          </div>
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="py-8 md:py-12 flex flex-col gap-6">
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-6 rounded-full bg-slate-800 shrink-0" />
      <div className="h-7 w-48 rounded-lg bg-slate-800/80 animate-pulse" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 w-full">
      {Array.from({ length: 7 }).map((_, idx) => (
        <div
          key={idx}
          className="aspect-[3/4.2] w-full rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse"
        />
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
