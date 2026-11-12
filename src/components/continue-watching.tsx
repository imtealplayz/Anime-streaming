"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Container from "./container";
import { ROUTES } from "@/constants/routes";
import { History, Play } from "lucide-react";
import {
  EPISODE_THUMBNAIL_UPDATED_EVENT,
  getEpisodeThumbnail,
  getEpisodeThumbnailKey,
} from "@/lib/episode-thumbnails";

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

const ContinueWatchingCard = ({ anime }: { anime: WatchedAnime }) => {
  const [savedThumbnail, setSavedThumbnail] = useState<string | null>(null);
  const episodeNumber = Number.parseInt(anime.episode, 10) || 1;
  const thumbnailKey = getEpisodeThumbnailKey(anime.id, episodeNumber);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadThumbnail = async () => {
      try {
        const blob = await getEpisodeThumbnail(anime.id, episodeNumber);
        if (!active) return;

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = blob ? URL.createObjectURL(blob) : null;
        setSavedThumbnail(objectUrl);
      } catch {
        if (active) setSavedThumbnail(null);
      }
    };

    const handleThumbnailUpdate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === thumbnailKey) {
        void loadThumbnail();
      }
    };

    void loadThumbnail();
    window.addEventListener(
      EPISODE_THUMBNAIL_UPDATED_EVENT,
      handleThumbnailUpdate,
    );

    return () => {
      active = false;
      window.removeEventListener(
        EPISODE_THUMBNAIL_UPDATED_EVENT,
        handleThumbnailUpdate,
      );
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [anime.id, episodeNumber, thumbnailKey]);

  const image = savedThumbnail || anime.poster;
  const watchHref =
    ROUTES.WATCH + "?anime=" + anime.id + "&ep=" + episodeNumber;

  return (
    <Link
      href={watchHref}
      className="group block min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090e]"
      aria-label={"Continue watching " + anime.name + ", episode " + episodeNumber}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-lg shadow-black/10 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-teal-300/50 group-hover:shadow-teal-950/30">
        {image ? (
          <div
            role="img"
            aria-label={anime.name + " episode " + episodeNumber}
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: "url(" + JSON.stringify(image) + ")" }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(45,212,191,0.18),transparent_65%),linear-gradient(135deg,#172330,#080d13)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full border border-white/20 bg-teal-300 text-slate-950 shadow-xl shadow-black/40 transition-transform duration-200 group-hover:scale-100">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </div>

        <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          EP {episodeNumber}
        </span>
      </div>

      <div className="mt-2 min-w-0">
        <h3 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-teal-200">
          {anime.name}
        </h3>
        <p className="mt-0.5 text-xs text-slate-400">
          Continue from episode {episodeNumber}
        </p>
      </div>
    </Link>
  );
};

const ContinueWatching = ({ loading }: Props) => {
  const [anime, setAnime] = useState<WatchedAnime[] | null>(null);

  useEffect(() => {
    const refreshHistory = () => {
      try {
        const storedData = localStorage.getItem("watched");
        const watchedAnimes: WatchedEntry[] = storedData
          ? JSON.parse(storedData)
          : [];

        if (!Array.isArray(watchedAnimes)) {
          localStorage.removeItem("watched");
          setAnime(null);
          return;
        }

        const entries = watchedAnimes
          .filter(
            (item) =>
              item?.anime?.id &&
              Array.isArray(item.episodes) &&
              item.episodes.length > 0,
          )
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
      window.removeEventListener(
        "animeteal:watch-history-updated",
        refreshHistory,
      );
      window.removeEventListener("focus", refreshHistory);
    };
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!anime?.length) return null;

  return (
    <Container className="flex flex-col gap-6 py-8 md:py-12">
      <div className="flex items-center gap-3">
        <div className="h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500" />
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            Continue Watching
          </h2>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {anime.map((ani, idx) => (
          <ContinueWatchingCard key={ani.id + "-" + idx} anime={ani} />
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-6 py-8 md:py-12">
    <div className="flex items-center gap-3">
      <div className="h-6 w-1.5 shrink-0 rounded-full bg-slate-800" />
      <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-800/80" />
    </div>
    <div className="grid w-full grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="aspect-video w-full animate-pulse rounded-xl border border-white/5 bg-slate-900/60" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-900/60" />
        </div>
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
