import React from "react";
import AnimeCard from "./anime-card";
import { MediaList } from "@/types/miruro-api";
import { ROUTES } from "@/constants/routes";
import { Sparkles } from "lucide-react";

type Props = {
  title: string;
  anime: MediaList[];
};

const FeaturedCollectionCard = (props: Props) => {
  if (!props.anime || props.anime.length < 3) return null;

  const cardFanStyles = [
    "absolute z-0 w-32 sm:w-36 md:w-36 lg:w-36 xl:w-44 -translate-x-16 sm:-translate-x-18 md:-translate-x-18 lg:-translate-x-18 xl:-translate-x-22 -rotate-12 transition-all duration-300 hover:scale-105 hover:-rotate-6 hover:-translate-y-3 hover:z-30 shadow-2xl",
    "relative z-10 w-32 sm:w-36 md:w-36 lg:w-36 xl:w-44 -rotate-2 -translate-y-2 transition-all duration-300 hover:scale-105 hover:rotate-0 hover:-translate-y-5 hover:z-30 shadow-2xl",
    "absolute z-0 w-32 sm:w-36 md:w-36 lg:w-36 xl:w-44 translate-x-16 sm:translate-x-18 md:translate-x-18 lg:translate-x-18 xl:translate-x-22 rotate-12 transition-all duration-300 hover:scale-105 hover:rotate-6 hover:-translate-y-3 hover:z-30 shadow-2xl",
  ];

  return (
    <div className="flex flex-col items-center w-full">
      {/* Category Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
        <h3 className="text-base sm:text-lg font-bold text-white tracking-wide text-center">
          {props.title}
        </h3>
      </div>

      {/* Fan Twist Cards (no enclosing box container) */}
      <div className="relative w-full h-72 sm:h-80 flex items-center justify-center pt-2">
        {props.anime.slice(0, 3).map((item, index) => {
          const title =
            item.title?.english ||
            item.title?.romaji ||
            item.title?.native ||
            "Untitled";
          const poster =
            item.coverImage?.extraLarge || item.coverImage?.large || "";

          return (
            <div key={item.id || index} className={cardFanStyles[index]}>
              <AnimeCard
                title={title}
                format={item.format}
                score={item.averageScore}
                poster={poster}
                href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedCollectionCard;
