"use client";

import React from "react";

import { cn } from "@/lib/utils";

import { ROUTES } from "@/constants/routes";
import { Episode } from "@/types/episodes";
import { useAnimeStore } from "@/store/anime-store";
import { useHasAnimeWatched } from "@/hooks/use-is-anime-watched";
import { Captions, Mic } from "lucide-react";
import Link from "next/link";
import { WatchHistory } from "@/hooks/use-get-bookmark";

import { useSearchParams } from "next/navigation";

type Props = {
  className?: string;
  episode: Episode;
  showCard?: boolean;
  animeId: string;
  variant?: "card" | "list";
  subOrDub?: { sub: number; dub: number };
  watchedEpisodes?: WatchHistory[] | null;
};

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

  if (showCard && variant === "card") {
    return (
      <div
        className={cn([
          "rounded-xl overflow-hidden relative cursor-pointer ",
          "h-[8.625rem] min-w-[8.625rem] max-w-[10.625rem] md:h-[10.75rem] md:max-w-[12.5rem]",
          props.className,
        ])}
      >
        <div className="absolute inset-0 m-auto h-full w-full bg-gradient-to-t from-[#000000a9] to-transparent"></div>
        <div className="absolute bottom-0 flex flex-col gap-1 px-4 pb-3">
          <h5 className="line-clamp-1">{`${props.episode.number}. ${props.episode.title}`}</h5>
        </div>
      </div>
    );
  } else if (!showCard && variant === "card") {
    return (
      <Link
        href={`${ROUTES.WATCH}?anime=${props.animeId}&ep=${props.episode.number}`}
      >
        <div
          className={cn([
            "h-[5.25rem] rounded-xl cursor-pointer w-full flex items-center justify-center bg-slate-900/60 border border-white/5 md:text-base text-xs font-semibold transition-all hover:border-cyan-500/30",
            isSelected && "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/25 border-cyan-400/50",
            !isSelected && hasWatchedEpisode && "bg-slate-950/80 text-gray-500 border-white/5",
          ])}
        >
          {`Episode ${props.episode.number}`}
        </div>
      </Link>
    );
  } else {
    return (
      <Link
        href={`${ROUTES.WATCH}?anime=${props.animeId}&ep=${props.episode.number}`}
      >
        <div
          className={cn([
            "flex gap-3 items-center justify-between w-full h-fit rounded-xl p-3 transition-all cursor-pointer text-xs md:text-sm font-medium border border-transparent",
            isSelected
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/25 border-cyan-400/40"
              : hasWatchedEpisode
                ? "bg-slate-950/60 text-gray-400 hover:bg-slate-900 border-white/5"
                : "bg-slate-900/50 text-gray-300 hover:bg-slate-800/80 hover:text-white border-white/5 hover:border-cyan-500/20",
          ])}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0">{`Episode ${props.episode.number}`}</span>
            {props.episode.title && props.episode.title !== `Episode ${props.episode.number}` && (
              <span className="text-xs opacity-75 line-clamp-1 font-normal">
                - {props.episode.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(props.episode.hasSub ?? (props.subOrDub && props.episode.number <= props.subOrDub.sub)) && (
              <Captions className={`h-4 w-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
            )}
            {(props.episode.hasDub ?? (props.subOrDub && props.episode.number <= props.subOrDub.dub)) && (
              <Mic className={`h-4 w-4 ${isSelected ? "text-white" : "text-gray-400"}`} />
            )}
          </div>
        </div>
      </Link>
    );
  }
};

export default EpisodeCard;
