"use client";

import React, { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { ROUTES } from "@/constants/routes";
import { Episode } from "@/types/episodes";
import { useAnimeStore } from "@/store/anime-store";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";
import { Captions, Mic, Play } from "lucide-react";
import Link from "next/link";
import { WatchHistory } from "@/hooks/use-get-bookmark";

import { useSearchParams } from "next/navigation";
import { EPISODE_THUMBNAIL_UPDATED_EVENT, getEpisodeThumbnail, getEpisodeThumbnailKey } from "@/lib/episode-thumbnails";

type Props = {
  className?: string;
  episode: Episode;
  showCard?: boolean;
  animeId: string;
  variant?: "card" | "list";
  subOrDub?: { sub: number; dub: number };
  watchedEpisodes?: WatchHistory[] | null;
};

const EpisodeThumbnail = ({
  src,
  label,
  className,
}: {
  src?: string | null;
  label: string;
  className?: string;
}) => (
  <div className={cn("group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-900", className)}>
    {src ? (
      <div
        role="img"
        aria-label={label + " thumbnail"}
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: "url(" + JSON.stringify(src) + ")" }}
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_50%_40%,rgba(45,212,191,0.18),transparent_65%),linear-gradient(135deg,#172330,#080d13)]">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Episode preview</span>
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/10 transition-colors group-hover:from-black/80 group-hover:via-black/20" />
    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
      <span className="flex h-11 w-11 scale-90 items-center justify-center rounded-full bg-teal-300 text-slate-950 shadow-xl shadow-black/40 transition-transform duration-200 group-hover:scale-100">
        <Play className="ml-0.5 h-4 w-4 fill-current" />
      </span>
    </div>
    <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">{label}</span>
  </div>
);

const EpisodeCard = ({
  showCard = false,
  variant = "card",
  ...props
}: Props) => {
  const searchParams = useSearchParams();
  const epParam = searchParams.get("ep");
  const activeEpNum = epParam ? Number(epParam) : null;

  const { selectedEpisode } = useAnimeStore();
  const { hasWatchedEpisode } = useHasAnimeWatched(
    props.animeId,
    props.episode.episodeId,
    props.watchedEpisodes!,
  );

  const isSelected =
    activeEpNum !== null
      ? activeEpNum === props.episode.number
      : selectedEpisode === props.episode.episodeId ||
        (!!selectedEpisode && selectedEpisode.endsWith(`/${props.episode.number}`));


  const episodeNumber = props.episode.number;
  const thumbnailKey = getEpisodeThumbnailKey(props.animeId, episodeNumber);
  const [savedThumbnail, setSavedThumbnail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const loadThumbnail = async () => {
      try {
        const blob = await getEpisodeThumbnail(props.animeId, episodeNumber);
        if (!active) return;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = blob ? URL.createObjectURL(blob) : null;
        setSavedThumbnail(objectUrl);
      } catch {
        if (active) setSavedThumbnail(null);
      }
    };

    const handleThumbnailUpdate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === thumbnailKey) void loadThumbnail();
    };

    void loadThumbnail();
    window.addEventListener(EPISODE_THUMBNAIL_UPDATED_EVENT, handleThumbnailUpdate);

    return () => {
      active = false;
      window.removeEventListener(EPISODE_THUMBNAIL_UPDATED_EVENT, handleThumbnailUpdate);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [episodeNumber, props.animeId, thumbnailKey]);

  const thumbnail = savedThumbnail || props.episode.image || null;
  const watchHref = ROUTES.WATCH + "?anime=" + props.animeId + "&ep=" + episodeNumber;
  const title = props.episode.title && props.episode.title !== "Episode " + episodeNumber
    ? props.episode.title
    : "Episode " + episodeNumber;

  if (showCard && variant === "card") {
    return (
      <div className={cn("w-full max-w-[12.5rem] cursor-pointer overflow-hidden", props.className)}>
        <EpisodeThumbnail src={thumbnail} label={"EP " + episodeNumber} />
        <h5 className="mt-2 line-clamp-1 text-xs font-semibold text-white">
          {episodeNumber}. {title}
        </h5>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Link href={watchHref} aria-label={"Play episode " + episodeNumber + ": " + title} className="group block w-full">
        <EpisodeThumbnail
          src={thumbnail}
          label={"EP " + episodeNumber}
          className={cn(
            "transition-colors group-hover:border-teal-300/60",
            isSelected && "border-teal-300/80 ring-1 ring-teal-300/30",
            props.className,
          )}
        />
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
          <h5 className="line-clamp-1 min-w-0 text-xs font-semibold text-slate-200 transition-colors group-hover:text-white sm:text-sm">
            {title}
          </h5>
          {hasWatchedEpisode && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" title="Watched" />}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={watchHref}
      aria-label={"Play episode " + episodeNumber + ": " + title}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border p-2 transition-all",
        isSelected
          ? "border-teal-400/40 bg-teal-500/10"
          : hasWatchedEpisode
            ? "border-white/5 bg-slate-950/60 hover:bg-slate-900"
            : "border-white/5 bg-slate-900/50 hover:border-teal-500/25 hover:bg-slate-800/80",
      )}
    >
      <EpisodeThumbnail src={thumbnail} label={"EP " + episodeNumber} className="w-28 shrink-0 rounded-lg sm:w-36" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("truncate text-xs font-semibold sm:text-sm", isSelected ? "text-teal-200" : "text-slate-200 group-hover:text-white")}>
            {title}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Episode {episodeNumber}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {(props.episode.hasSub ?? (props.subOrDub && episodeNumber <= props.subOrDub.sub)) && (
            <Captions className={cn("h-4 w-4", isSelected ? "text-teal-200" : "text-gray-400")} />
          )}
          {(props.episode.hasDub ?? (props.subOrDub && episodeNumber <= props.subOrDub.dub)) && (
            <Mic className={cn("h-4 w-4", isSelected ? "text-teal-200" : "text-gray-400")} />
          )}
        </div>
      </div>
    </Link>
  );
};

export default EpisodeCard;
