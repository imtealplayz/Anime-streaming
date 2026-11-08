"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Star } from "lucide-react";
import { cn, formatSecondsToMMSS } from "@/lib/utils";
import { WatchHistory } from "@/hooks/use-get-bookmark";

type Props = {
  className?: string;
  poster: string;
  title: string;
  episodeCard?: boolean;
  episodes?: number | null;
  score?: number | null;
  format?: string | null;
  subTitle?: string;
  displayDetails?: boolean;
  variant?: "sm" | "lg";
  href?: string;
  showGenre?: boolean;
  watchDetail?: WatchHistory | null;
};

const AnimeCard = ({
  displayDetails = true,
  variant = "sm",
  ...props
}: Props) => {
  const safeCurrent =
    typeof props.watchDetail?.current === "number"
      ? props.watchDetail.current
      : 0;
  const safeTotal =
    typeof props.watchDetail?.timestamp === "number" &&
    props.watchDetail.timestamp > 0
      ? props.watchDetail.timestamp
      : 0;

  const clampedCurrent = Math.min(safeCurrent, safeTotal);
  const percentage = safeTotal > 0 ? (clampedCurrent / safeTotal) * 100 : 0;

  return (
    <Link href={props.href || "#"} className="group block w-full focus:outline-none">
      <div
        className={cn([
          "relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d121d] transition-all duration-300",
          "group-hover:border-indigo-500/50 group-hover:shadow-xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-1.5",
          variant === "sm" && "aspect-[3/4.2] w-full",
          variant === "lg" && "aspect-[3/4.2] w-full md:max-w-[18rem]",
          props.className,
        ])}
      >
        {/* Poster Image */}
        <Image
          src={props.poster}
          alt={props.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          unoptimized
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 z-20 flex items-center justify-between pointer-events-none">
          {props.format ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-black/60 text-indigo-300 backdrop-blur-md border border-white/10">
              {props.format}
            </span>
          ) : <span />}

          {props.score ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/60 text-amber-300 backdrop-blur-md border border-white/10 shadow-sm">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {props.score}%
            </span>
          ) : null}
        </div>

        {/* Floating Play Button on Hover */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="h-12 w-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 backdrop-blur-sm border border-white/20 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-5 w-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom Scrim & Details */}
        {displayDetails && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-3 pt-12 bg-gradient-to-t from-[#07090e] via-[#07090e]/90 to-transparent flex flex-col justify-end">
            <h4 className="font-bold text-sm text-white line-clamp-1 leading-snug group-hover:text-indigo-300 transition-colors">
              {props.title}
            </h4>

            {props.subTitle && (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {props.subTitle}
              </p>
            )}

            {/* Watch Progress Indicator */}
            {props.watchDetail ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Ep {props.watchDetail.episodeNumber}</span>
                  <span>{formatSecondsToMMSS(props.watchDetail.current)}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                {props.episodeCard && !!props.episodes && (
                  <span className="text-slate-300 font-semibold">
                    {props.episodes} Episodes
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default AnimeCard;
