"use client";

import EpisodeCard from "./common/episode-card";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAnimeStore } from "@/store/anime-store";
import { Episode, IEpisodes } from "@/types/episodes";
import Select, { ISelectOptions } from "./common/select";
import { Input } from "./ui/input";
import { Bookmark } from "@/hooks/use-get-bookmark";
import { Search, ListFilter } from "lucide-react";

type Props = {
  animeId: string;
  title: string;
  subOrDub?: { sub: number; dub: number };
  episodes: IEpisodes;
  isLoading: boolean;
  bookmarks?: Bookmark[] | null;
};

const EpisodePlaylist = ({
  animeId,
  title,
  subOrDub,
  episodes,
  isLoading,
  bookmarks,
}: Props) => {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode");
  const isLatestEpisode = searchParams.get("type");

  const { setSelectedEpisode } = useAnimeStore();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const episodeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [currentGroup, setCurrentGroup] = useState(
    `1 - ${Math.min(50, episodes?.totalEpisodes || 12)}`,
  );
  const [search, setSearch] = useState("");

  const [start, end] = currentGroup.split(" - ").map(Number);
  const filtered = (episodes?.episodes || []).filter((_, index) => {
    return index >= (start || 1) - 1 && index <= (end || 50) - 1;
  });

  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>(filtered);

  useEffect(() => {
    if (
      (!episodeId || !episodeId.includes("ep")) &&
      !!episodes &&
      !!episodes.episodes.length
    ) {
      if (!!isLatestEpisode) {
        setSelectedEpisode(
          episodes.episodes[episodes.episodes.length - 1].episodeId as string,
        );
      } else {
        setSelectedEpisode(episodes.episodes[0].episodeId as string);
      }
    }
  }, [episodes, episodeId, isLatestEpisode, setSelectedEpisode]);

  useEffect(() => {
    if (!episodes || currentGroup === "") return;
    const [grpStart, grpEnd] = currentGroup.split(" - ").map(Number);
    const grpFiltered = episodes.episodes.filter((_, index) => {
      return index >= (grpStart || 1) - 1 && index <= (grpEnd || 50) - 1;
    });

    setFilteredEpisodes(grpFiltered);
  }, [episodes, currentGroup]);

  useEffect(() => {
    const episodeIndex = episodes?.episodes.findIndex(
      (ep) => ep.episodeId === episodeId,
    );

    if (
      episodeIndex !== undefined &&
      episodeIndex >= 0 &&
      episodeRefs.current[episodeIndex]
    ) {
      episodeRefs.current[episodeIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [episodeId, episodes]);

  const handleOnSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (value.trim() === "") {
      const [grpStart, grpEnd] = currentGroup.split(" - ").map(Number);
      const grpFiltered = episodes.episodes.filter((_, index) => {
        return index >= (grpStart || 1) - 1 && index <= (grpEnd || 50) - 1;
      });
      setFilteredEpisodes(grpFiltered);
      return;
    }

    const matched = episodes?.episodes.filter((episode) =>
      episode.number.toString().toLowerCase().includes(value.toLowerCase()),
    );

    setFilteredEpisodes(matched || []);
  };

  const handleOnSelectChange = (range: string) => {
    setCurrentGroup(range);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const groupOptions = (): ISelectOptions[] => {
    let grpStart = 1;
    const grpEnd = episodes?.totalEpisodes || 12;
    const options: ISelectOptions[] = [];
    while (grpStart <= grpEnd) {
      const range = `${grpStart} - ${Math.min(grpStart + 49, grpEnd)}`;
      options.push({
        label: range,
        value: range,
      });
      grpStart += 50;
    }
    return options;
  };

  if (!episodes) return null;

  return (
    <div className="col-span-1 flex flex-col w-full rounded-2xl overflow-hidden bg-[#0d121d] border border-white/10 shadow-xl min-h-[300px] lg:h-full lg:max-h-[640px]">
      {/* Header */}
      <div className="p-4 bg-slate-900/80 border-b border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <ListFilter className="h-4 w-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Episode Playlist
              </h3>
              {title && (
                <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                  {title}
                </p>
              )}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shrink-0">
            {episodes.totalEpisodes} Total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search Ep #"
              value={search}
              onChange={handleOnSearchChange}
              className="h-8 pl-8 text-xs bg-slate-950/60 border-white/10 rounded-xl placeholder:text-slate-500"
            />
          </div>
          {groupOptions().length > 1 && (
            <div className="w-28 shrink-0">
              <Select
                value={currentGroup}
                placeholder={currentGroup}
                onChange={handleOnSelectChange}
                options={groupOptions()}
                className="h-8 text-xs bg-slate-950/60 border-white/10 rounded-xl"
              />
            </div>
          )}
        </div>
      </div>

      {/* Episode Cards Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex flex-col flex-1 gap-1.5 p-3 overflow-y-auto no-scrollbar"
      >
        {filteredEpisodes &&
          filteredEpisodes.map((episode, idx) => (
            //@ts-expect-error type mismatch
            <div key={idx} ref={(el) => (episodeRefs.current[idx] = el)}>
              <EpisodeCard
                subOrDub={subOrDub}
                variant="list"
                episode={episode}
                animeId={animeId}
                watchedEpisodes={bookmarks?.[0]?.expand?.watchHistory}
              />
            </div>
          ))}

        {!filteredEpisodes?.length && !isLoading && (
          <div className="text-center text-xs text-slate-400 py-8">
            No matching episodes found.
          </div>
        )}

        {isLoading && <PlaylistSkeleton />}
      </div>
    </div>
  );
};

const PlaylistSkeleton = () => {
  return (
    <div className="space-y-2 p-1">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="h-14 w-full rounded-xl bg-slate-800/40 border border-white/5 animate-pulse"
        />
      ))}
    </div>
  );
};

export default EpisodePlaylist;
