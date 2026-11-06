"use client";

import React from "react";
import Image from "next/image";
import parse from "html-react-parser";
import Container from "@/components/container";
import AnimeCard from "@/components/anime-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WatchButton from "@/components/watch-button";
import { IAnime } from "@/types/anime";
import AnimeCarousel from "@/components/anime-carousel";
import AnimeEpisodes from "@/components/anime-episodes";
import CharacterCard from "@/components/common/character-card";
import { ROUTES } from "@/constants/routes";
import WatchTrailer from "@/components/watch-trailer";
import {
  Star,
  Film,
  Layers,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import Loading from "@/app/loading";

const Page = () => {
  const { slug } = useParams();
  const { data: anime, isLoading } = useGetAnimeDetails(slug as string);
  if (isLoading || !anime) {
    return <Loading />;
  }

  const bgImage =
    anime.anime.info.bannerImage || anime.anime.info.poster || "";

  return (
    <div className="w-full min-h-screen bg-[#07090e] pb-20">
      {/* Cinematic Banner */}
      <div className="relative h-[36vh] md:h-[46vh] w-full overflow-hidden">
        <Image
          src={bgImage}
          alt={anime.anime.info.name}
          fill
          priority
          className="object-cover object-center scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-transparent to-transparent" />

        {anime.anime.info.promotionalVideos[0]?.source && (
          <div className="absolute right-6 bottom-6 z-20">
            <WatchTrailer
              videoHref={anime.anime.info.promotionalVideos[0]?.source}
            />
          </div>
        )}
      </div>

      <Container className="relative z-20 -mt-24 md:-mt-32 space-y-10">
        {/* Anime Title & Poster Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-10">
          <div className="w-48 sm:w-56 md:w-64 shrink-0 shadow-2xl">
            <AnimeCard
              title={anime.anime.info.name}
              poster={anime.anime.info.poster}
              href={`${ROUTES.ANIME_DETAILS}/${anime.anime.info.id}`}
              displayDetails={false}
              variant="lg"
              className="w-full aspect-[3/4.2] rounded-2xl ring-2 ring-white/10 shadow-2xl shadow-black/80"
            />
          </div>

          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4 pb-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase bg-violet-600/80 text-white shadow-sm">
                {anime.anime.info.stats.type || "ANIME"}
              </span>
              {anime.anime.info.stats.rating && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {anime.anime.info.stats.rating}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-slate-300">
                {anime.anime.moreInfo.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {anime.anime.info.name}
            </h1>

            {anime.anime.moreInfo.japanese && (
              <p className="text-sm md:text-base font-medium text-slate-400">
                {anime.anime.moreInfo.japanese}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <WatchButton />
              
            </div>
          </div>
        </div>

        {/* Tab Sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex items-center justify-start gap-1 p-1.5 bg-[#0d121d] border border-white/10 rounded-2xl w-fit">
            <TabsTrigger
              value="overview"
              className="px-5 py-2 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="episodes"
              className="px-5 py-2 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
            >
              Episodes
            </TabsTrigger>
            {anime.anime.info.charactersVoiceActors.length > 0 && (
              <TabsTrigger
                value="characters"
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
              >
                Characters
              </TabsTrigger>
            )}
            {anime.seasons.length > 0 && (
              <TabsTrigger
                value="relations"
                className="px-5 py-2 rounded-xl text-sm font-bold text-slate-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all"
              >
                Relations
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent
            value="overview"
            className="w-full grid lg:grid-cols-3 gap-8 mt-6"
          >
            {/* Left: Metadata specs */}
            <div className="lg:col-span-1 p-6 rounded-2xl bg-[#0d121d] border border-white/10 space-y-4 shadow-xl">
              <h3 className="text-base font-extrabold text-white tracking-wide border-b border-white/10 pb-3 flex items-center gap-2">
                <Film className="h-4 w-4 text-indigo-400" />
                Information
              </h3>
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Aired</span>
                  <span className="text-white font-medium">{anime.anime.moreInfo.aired}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Premiered</span>
                  <span className="text-white font-medium">{anime.anime.moreInfo.premiered}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Duration</span>
                  <span className="text-white font-medium">{anime.anime.moreInfo.duration}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Status</span>
                  <span className="text-white font-medium">{anime.anime.moreInfo.status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Score</span>
                  <span className="text-amber-300 font-bold">{anime.anime.info.stats.rating}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Studios</span>
                  <span className="text-white font-medium">{anime.anime.moreInfo.studios}</span>
                </div>
                <div className="flex flex-col gap-1.5 pt-2">
                  <span className="text-slate-400">Genres</span>
                  <div className="flex flex-wrap gap-1.5">
                    {anime.anime.moreInfo.genres.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-md text-xs bg-white/5 border border-white/10 text-slate-300 font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Synopsis */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0d121d] border border-white/10 space-y-4 shadow-xl">
              <h3 className="text-base font-extrabold text-white tracking-wide border-b border-white/10 pb-3">
                Synopsis
              </h3>
              <div className="text-sm md:text-base leading-relaxed text-slate-300 space-y-3">
                {parse(anime.anime.info.description || "No synopsis available.")}
              </div>
            </div>
          </TabsContent>

          {/* Relations Tab */}
          <TabsContent value="relations" className="w-full mt-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" /> Related Series
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {anime.seasons.map((relation, idx) => (
                !relation.isCurrent && (
                  <AnimeCard
                    key={idx}
                    title={relation.name}
                    subTitle={relation.title}
                    poster={relation.poster}
                    href={`${ROUTES.ANIME_DETAILS}/${relation.id}`}
                  />
                )
              ))}
            </div>
          </TabsContent>

          {/* Episodes Tab */}
          <TabsContent value="episodes" className="mt-6">
            <AnimeEpisodes animeId={anime.anime.info.id} />
          </TabsContent>

          {/* Characters Tab */}
          {!!anime.anime.info.charactersVoiceActors.length && (
            <TabsContent value="characters" className="w-full mt-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Characters & Voice Cast</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {anime.anime.info.charactersVoiceActors.map((character, idx) => (
                  <CharacterCard
                    key={idx}
                    character={character}
                    className="w-full"
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Recommended Anime Carousel */}
        {!!anime.recommendedAnimes.length && (
          <AnimeCarousel
            anime={anime.recommendedAnimes as IAnime[]}
            title="You Might Also Like"
            className="pt-10"
          />
        )}
      </Container>
    </div>
  );
};

export default Page;
