"use client";

import React from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { MediaList } from "@/types/miruro-api";
import { ROUTES } from "@/constants/routes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

type Props = {
  animeList: MediaList[];
  loading: boolean;
  title: string;
  page?: number;
  hasNextPage?: boolean;
  onPageChange?: (newPage: number) => void;
};

const AnimeSections = ({
  animeList,
  loading,
  title: sectionTitle,
  page = 1,
  hasNextPage = false,
  onPageChange,
}: Props) => {
  if (loading || !animeList?.length) {
    return <LoadingSkeleton title={sectionTitle} />;
  }

  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400 shrink-0" />
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {sectionTitle}
          </h2>
        </div>

        {onPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1">
              Page {page}
            </span>
            <Button
              size="icon"
              onClick={() => onPageChange(Math.max(page - 1, 1))}
              disabled={page <= 1}
              className="h-8 w-8 rounded-lg bg-slate-900 border border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-500 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNextPage}
              className="h-8 w-8 rounded-lg bg-slate-900 border border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-500 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5 sm:gap-4 md:gap-5 w-full">
        {animeList.map((anime, idx) => {
          const title =
            anime.title?.english || anime.title?.romaji || anime.title?.native || "Untitled";
          const subTitle = anime.title?.english ? anime.title?.romaji : undefined;
          const poster =
            anime.coverImage?.extraLarge || anime.coverImage?.large || "";

          return (
            <div key={`${anime.id}-${idx}`} className="w-full">
              <AnimeCard
                title={title}
                subTitle={subTitle}
                format={anime.format}
                score={anime.averageScore}
                poster={poster}
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              />
            </div>
          );
        })}
      </div>
    </Container>
  );
};

const LoadingSkeleton = ({ title }: { title: string }) => {
  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-cyan-500/50 shrink-0" />
        <h2 className="text-xl md:text-2xl font-black text-white/40 tracking-tight">{title}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 w-full">
        {Array.from({ length: 14 }).map((_, idx) => (
          <div
            key={idx}
            className="aspect-[3/4.2] w-full rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse"
          />
        ))}
      </div>
    </Container>
  );
};

export default AnimeSections;
