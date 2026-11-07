"use client";

import Loading from "@/app/loading";
import parse from "html-react-parser";
import { ROUTES } from "@/constants/routes";

import Container from "@/components/container";
import AnimeCard from "@/components/anime-card";
import { useAnimeStore } from "@/store/anime-store";

import EpisodePlaylist from "@/components/episode-playlist";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAnimeDetails } from "@/query/get-anime-details";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import AnimeCarousel from "@/components/anime-carousel";
import { IAnime } from "@/types/anime";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import CommentsSection from "@/components/comments/comments-section";
import DiscordRpcPresence from "@/components/discord-rpc-presence";

type Props = {
  children: ReactNode;
};

const Layout = (props: Props) => {
  const searchParams = useSearchParams();
  const { setAnime, setSelectedEpisode } = useAnimeStore();
  const router = useRouter();

  const currentAnimeId = useMemo(
    () => searchParams.get("anime"),
    [searchParams],
  );
  const episodeId = searchParams.get("episode");

  const epNumberParam = searchParams.get("ep");
  const currentEpNum = epNumberParam ? Number(epNumberParam) : 1;

  const [animeId, setAnimeId] = useState<string | null>(currentAnimeId);

  useEffect(() => {
    if (currentAnimeId !== animeId) {
      setAnimeId(currentAnimeId);
    }
  }, [currentAnimeId, animeId]);

  const { data: anime, isLoading } = useGetAnimeDetails(animeId as string);

  useEffect(() => {
    if (anime) {
      setAnime(anime);
    }
  }, [anime, setAnime]);

  useEffect(() => {
    if (!animeId && typeof window !== "undefined") {
      router.push(ROUTES.HOME);
    }
  }, [animeId, router]);

  const { data: episodes, isLoading: episodeLoading } = useGetAllEpisodes(
    animeId as string,
  );

  // Auto-resolve episode ID if only episode number (ep) is in query or if no episode parameter exists
  useEffect(() => {
    if (episodes?.episodes?.length) {
      if (episodeId) {
        setSelectedEpisode(episodeId);
      } else {
        const epNum = epNumberParam ? Number(epNumberParam) : 1;
        const matchedEp =
          episodes.episodes.find((e) => e.number === epNum) || episodes.episodes[0];
        if (matchedEp?.episodeId) {
          setSelectedEpisode(matchedEp.episodeId);
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("episode", matchedEp.episodeId);
            window.history.replaceState({}, "", url.toString());
          }
        }
      }
    }
  }, [episodes, episodeId, epNumberParam, setSelectedEpisode]);

  if (isLoading) return <Loading />;

  return (
    anime?.anime.info && (
      <Container className="mt-[6.5rem] space-y-10 pb-20">
        <DiscordRpcPresence
          animeId={anime?.anime.info.id || animeId || ""}
          animeTitle={anime?.anime.info.name || "Anime"}
          episodeNumber={Number.isFinite(currentEpNum) && currentEpNum > 0 ? currentEpNum : 1}
        />
        <div className="grid lg:grid-cols-4 grid-cols-1 gap-y-5 gap-x-10 h-auto w-full">
          <div className="lg:col-span-3 col-span-1 lg:mb-0">
            {props.children}
          </div>
          {episodes && (
            <EpisodePlaylist
              animeId={animeId as string}
              title={
                !!anime?.anime.info.name
                  ? anime.anime.info.name
                  : (anime?.anime.moreInfo.japanese as string)
              }
              subOrDub={anime?.anime.info.stats.episodes}
              episodes={episodes}
              isLoading={episodeLoading}
            />
          )}
        </div>
        <div className="flex md:flex-row flex-col gap-6 p-6 rounded-2xl glass-panel border border-white/10 shadow-xl">
          <div className="w-36 sm:w-44 shrink-0 mx-auto md:mx-0">
            <AnimeCard
              title={anime?.anime.info.name}
              poster={anime?.anime.info.poster}
              subTitle={anime?.anime.moreInfo.aired}
              displayDetails={false}
              href={ROUTES.ANIME_DETAILS + "/" + anime?.anime.info.id}
            />
          </div>
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {anime?.anime.info.stats.type || "ANIME"}
                </span>
                {anime?.anime.info.stats.rating && (
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    ★ {anime.anime.info.stats.rating}
                  </span>
                )}
                {anime?.anime.moreInfo.status && (
                  <span className="text-xs font-medium text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                    {anime.anime.moreInfo.status}
                  </span>
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              {anime?.anime.info.name}
            </h1>
            {anime?.anime.moreInfo.japanese && (
              <p className="text-xs sm:text-sm font-medium text-slate-400 -mt-1">
                {anime.anime.moreInfo.japanese}
              </p>
            )}
            <div className="text-xs sm:text-sm text-slate-300/80 leading-relaxed max-w-4xl max-h-36 overflow-y-auto pr-2 custom-scrollbar">
              {parse(anime?.anime.info.description as string)}
            </div>
          </div>
        </div>

        {/* Community Comments Section */}
        <CommentsSection
          animeId={animeId as string}
          animeTitle={anime?.anime.info.name || "Anime"}
          episodeNumber={currentEpNum}
        />

        <AnimeCarousel
          title={"Also Watch"}
          anime={anime?.relatedAnimes as IAnime[]}
        />
        <AnimeCarousel
          title={"Recommended"}
          anime={anime?.recommendedAnimes as IAnime[]}
        />
      </Container>
    )
  );
};
export default Layout;
