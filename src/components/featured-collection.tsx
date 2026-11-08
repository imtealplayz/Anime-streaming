import React from "react";
import Container from "./container";
import FeaturedCollectionCard from "./featured-collection-card";
import { MediaList } from "@/types/miruro-api";

type CategoryItem = {
  title: string;
  anime: MediaList[];
};

type Props = {
  featuredAnime: CategoryItem[];
  loading: boolean;
};

const FeaturedCollection = ({ featuredAnime, loading }: Props) => {
  if (loading || !featuredAnime?.length) return <LoadingSkeleton />;

  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0" />
        <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Featured Collections
        </h2>
      </div>

      <div className="grid w-full gap-6 lg:gap-6 xl:gap-8 grid-cols-1 lg:grid-cols-3">
        {featuredAnime.map((category, idx) => (
          <FeaturedCollectionCard
            title={category.title}
            key={idx}
            anime={category.anime}
          />
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => {
  return (
    <Container className="py-8 md:py-12 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 rounded-full bg-slate-800 shrink-0" />
        <div className="h-7 w-48 rounded-lg bg-slate-800/80 animate-pulse" />
      </div>
      <div className="grid w-full gap-6 lg:gap-6 xl:gap-8 grid-cols-1 lg:grid-cols-3">
        {[1, 2, 3].map((colIdx) => (
          <div key={colIdx} className="flex flex-col gap-3.5 w-full">
            <div className="h-5 w-36 rounded bg-slate-800/80 animate-pulse" />
            <div className="grid grid-cols-3 gap-3 w-full">
              {[1, 2, 3].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="aspect-[3/4.2] w-full rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
};

export default FeaturedCollection;
