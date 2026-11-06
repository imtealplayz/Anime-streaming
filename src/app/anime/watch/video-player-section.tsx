"use client";

import React, { useEffect, useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
import dynamic from "next/dynamic";

const AnimeTealPlayer = dynamic(() => import("@/components/animeteal-player"), {
  ssr: false,
});
import { useGetEpisodeData } from "@/query/get-episode-data";
import { Captions, Mic, AlertCircle, Tv } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useGetAllEpisodes } from "@/query/get-all-episodes";

import type { IEpisodeSource } from "@/types/episodes";
import { useGetSourceAvailable } from "@/query/get-source-available";

const VideoPlayerSection = () => {
  const searchParams = useSearchParams();
  const animeIdParam = searchParams.get("anime") || "";
  const epParam = searchParams.get("ep");
  const episodeIdParam = searchParams.get("episode") || "";
  const { selectedEpisode, setSelectedEpisode, anime } = useAnimeStore();

  const { data: isSourceAvailable } = useGetSourceAvailable();
  const { data: allEpisodesData } = useGetAllEpisodes(animeIdParam);

  // Match episode number from ?ep= parameter if present
  const targetEpByNumber = epParam && allEpisodesData?.episodes
    ? allEpisodesData.episodes.find((e) => e.number === Number(epParam))
    : null;

  // Resolve active episode ID prioritizing ?ep= parameter
  const activeEpisodeId =
    targetEpByNumber?.episodeId ||
    selectedEpisode ||
    episodeIdParam ||
    allEpisodesData?.episodes?.[0]?.episodeId ||
    "";

  // Sync selectedEpisode in store with ?ep= parameter if provided
  useEffect(() => {
    if (targetEpByNumber?.episodeId && selectedEpisode !== targetEpByNumber.episodeId) {
      setSelectedEpisode(targetEpByNumber.episodeId);
    }
  }, [targetEpByNumber?.episodeId, selectedEpisode, setSelectedEpisode]);

  const isPrimaryDisabled = isSourceAvailable === false;

  const [useFallback, setUseFallback] = useState<boolean>(false);

  const { data: episodeData, isLoading: isLoadingData } =
    useGetEpisodeData(activeEpisodeId, !isPrimaryDisabled && !useFallback);

  const [autoSkip, setAutoSkip] = useState<boolean>(true);
  const [preferredCategory, setPreferredCategory] = useState<"sub" | "dub">("sub");

  const [anirakuFallbackData, setAnirakuFallbackData] = useState<IEpisodeSource | null>(null);
  const [anirakuFallbackLoading, setAnirakuFallbackLoading] = useState(false);
  const [anirakuFallbackError, setAnirakuFallbackError] = useState("");
  const [anirakuFallbackProvider, setAnirakuFallbackProvider] = useState("Aniraku");
  const [anirakuRetryKey, setAnirakuRetryKey] = useState(0);

  useEffect(() => {
    setUseFallback(false);
  }, [activeEpisodeId]);

  useEffect(() => {
    const storedSkip = localStorage.getItem("autoSkip");
    if (storedSkip !== null) setAutoSkip(storedSkip === "true");

    const storedCategory = localStorage.getItem("preferredCategory");
    if (storedCategory === "sub" || storedCategory === "dub") {
      setPreferredCategory(storedCategory);
    }
  }, []);

  function onHandleAutoSkipChange(value: boolean) {
    setAutoSkip(value);
    localStorage.setItem("autoSkip", JSON.stringify(value));
  }

  // Extract dynamic providers from EpisodeResponse
  const rawProviders = allEpisodesData?.rawResponse?.providers || {};
  const providerNames = Object.keys(rawProviders);

  // Extract current episode number from activeEpisodeId
  const currentEpNumber =
    allEpisodesData?.episodes?.find((e) => e.episodeId === activeEpisodeId)?.number || 1;

  // Check sub/dub availability for this episode
  const hasSub = providerNames.some(
    (p) => (rawProviders[p]?.episodes?.sub?.length || 0) > 0,
  );
  const hasDub = providerNames.some(
    (p) => (rawProviders[p]?.episodes?.dub?.length || 0) > 0,
  );

  const handleCategoryChange = (cat: "sub" | "dub") => {
    setPreferredCategory(cat);
    localStorage.setItem("preferredCategory", cat);

    // Switch active episode to the first available server of that category for current episode
    if (providerNames.length > 0) {
      for (const pName of providerNames) {
        const pData = rawProviders[pName]?.episodes?.[cat] || [];
        const targetEp = pData.find((ep: any) => ep.number === currentEpNumber) || pData[0];
        if (targetEp?.id) {
          setSelectedEpisode(targetEp.id);
          break;
        }
      }
    }
  };

  // Synchronize activeEpisodeId category with preferredCategory ("sub" or "dub")
  useEffect(() => {
    if (!providerNames.length || !allEpisodesData?.rawResponse?.providers) return;

    const cleanParts = activeEpisodeId.replace(/^\//, "").split("/");
    const activeCat = cleanParts[3] === "dub" ? "dub" : "sub";

    // If active episode category does not match preferredCategory, switch to preferredCategory if available
    if (activeCat !== preferredCategory) {
      for (const pName of providerNames) {
        const pData = rawProviders[pName]?.episodes?.[preferredCategory] || [];
        const targetEp = pData.find((ep: any) => ep.number === currentEpNumber);
        if (targetEp?.id) {
          setSelectedEpisode(targetEp.id);
          break;
        }
      }
    }
  }, [
    currentEpNumber,
    preferredCategory,
    providerNames,
    rawProviders,
    activeEpisodeId,
    setSelectedEpisode,
    allEpisodesData,
  ]);

  const isFallbackActive =
    isSourceAvailable === false ||
    useFallback ||
    (!isLoadingData && (!episodeData || !episodeData.sources?.length));

  const handleProviderSelect = (pName: string, category: "sub" | "dub") => {
    setPreferredCategory(category);
    localStorage.setItem("preferredCategory", category);

    const pData = rawProviders[pName]?.episodes?.[category] || [];
    const targetEp = pData.find((ep: any) => ep.number === currentEpNumber) || pData[0];
    if (targetEp?.id) {
      setSelectedEpisode(targetEp.id);
    }
  };

  // Cleanly extract active provider and category regardless of leading slash e.g. "watch/kiwi/178005/sub/slug"
  const cleanParts = activeEpisodeId.replace(/^\//, "").split("/");
  const currentProviderName = cleanParts[1] || providerNames[0] || "kiwi";
  const activeCategory = cleanParts[3] === "dub" ? "dub" : preferredCategory;

  useEffect(() => {
    if (!isFallbackActive) {
      setAnirakuFallbackData(null);
      setAnirakuFallbackError("");
      setAnirakuFallbackLoading(false);
      return;
    }

    const animeId = Number(animeIdParam);
    const episode = Number(currentEpNumber);
    if (!Number.isInteger(animeId) || animeId <= 0 || !Number.isInteger(episode) || episode <= 0) {
      setAnirakuFallbackLoading(false);
      setAnirakuFallbackError("This episode is missing a valid AniList ID or episode number.");
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;
    setAnirakuFallbackData(null);
    setAnirakuFallbackError("");
    setAnirakuFallbackLoading(true);

    const params = new URLSearchParams({
      animeId: String(animeId),
      episode: String(episode),
      lang: activeCategory,
    });

    fetch("/api/v1/servers?" + params.toString(), {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Stream discovery returned HTTP " + response.status + ".");
        }
        return Array.isArray(payload) ? payload : [];
      })
      .then((servers: any[]) => {
        const candidates = servers.flatMap((server) =>
          (Array.isArray(server?.sources) ? server.sources : []).map((source: any) => ({
            server,
            source,
          })),
        );

        const selected = candidates.find(({ source }) => {
          const type = String(source?.type || "").toLowerCase();
          const verdict = String(source?.verification || "").toLowerCase();
          return (
            typeof source?.url === "string" &&
            source.url.startsWith("https://") &&
            (type === "hls" || type === "m3u8") &&
            verdict !== "dead" &&
            verdict !== "embed"
          );
        });

        if (!selected) {
          throw new Error("Aniraku did not return a direct HLS stream for this episode. No third-party redirect player was loaded.");
        }

        const subtitles = (Array.isArray(selected.source.subtitles) ? selected.source.subtitles : [])
          .filter((track: any) => typeof track?.url === "string" && track.url.startsWith("https://"))
          .map((track: any) => ({
            lang: track.label || track.lang || "Subtitle",
            url: track.url,
          }));

        const episodeData: IEpisodeSource = {
          headers: {
            Referer: selected.server?.headers?.Referer || selected.server?.headers?.referer || "",
          },
          subtitles,
          intro: { start: 0, end: 0 },
          outro: { start: 0, end: 0 },
          sources: [{ url: selected.source.url, type: "m3u8" }],
          anilistID: animeId,
          malID: 0,
        };

        if (!isCurrent) return;
        setAnirakuFallbackProvider(selected.server?.name || selected.server?.provider || "Aniraku");
        setAnirakuFallbackData(episodeData);
        setAnirakuFallbackLoading(false);
      })
      .catch((error) => {
        if (!isCurrent || controller.signal.aborted) return;
        setAnirakuFallbackError(error instanceof Error ? error.message : "Could not find a direct stream.");
        setAnirakuFallbackLoading(false);
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [isFallbackActive, animeIdParam, currentEpNumber, activeCategory, anirakuRetryKey]);


  if (!activeEpisodeId || isLoadingData) {
    return (
      <div className="h-auto aspect-video lg:max-h-[calc(100vh-150px)] min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] w-full animate-pulse bg-slate-800 rounded-xl"></div>
    );
  }

  // When the legacy stream fails, discover a direct HLS source and use AnimeTeal's native player.
  if (isFallbackActive) {
    const fallbackAnimeId = animeIdParam || anime?.anime?.info?.id || "0";
    const playerInfo = {
      id: fallbackAnimeId,
      title: anime?.anime?.info?.name || "Anime",
      image: anime?.anime?.info?.poster || "",
    };

    if (anirakuFallbackLoading) {
      return (
        <div className="flex aspect-video min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] w-full items-center justify-center rounded-xl border border-slate-800 bg-black text-sm text-slate-300">
          Finding a direct stream for Episode {currentEpNumber}…
        </div>
      );
    }

    if (!anirakuFallbackData) {
      return (
        <div className="flex aspect-video min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] w-full flex-col items-center justify-center gap-4 rounded-xl border border-slate-800 bg-black p-6 text-center">
          <Tv className="h-8 w-8 text-cyan-400" />
          <div className="max-w-xl space-y-2">
            <h3 className="text-lg font-bold text-white">No direct stream available</h3>
            <p className="text-sm leading-relaxed text-slate-400">
              {anirakuFallbackError || "AnimeTeal could not find a playable HLS source for this episode."}
            </p>
            <p className="text-xs text-slate-500">
              Third-party redirect embeds are intentionally not loaded. Try discovering sources again.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setAnirakuRetryKey((value) => value + 1)}
            className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          >
            Retry source search
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 w-full">
        <AnimeTealPlayer
          key={anirakuFallbackData.sources[0]?.url}
          episodeInfo={anirakuFallbackData}
          serversData={{
            episodeId: activeEpisodeId,
            episodeNo: String(currentEpNumber),
            sub: activeCategory === "sub" ? [{ serverId: 1, serverName: anirakuFallbackProvider }] : [],
            dub: activeCategory === "dub" ? [{ serverId: 1, serverName: anirakuFallbackProvider }] : [],
            raw: [],
          }}
          animeInfo={playerInfo}
          subOrDub={activeCategory}
          autoSkip={autoSkip}
          onError={() => {
            setAnirakuFallbackData(null);
            setAnirakuFallbackError("The direct stream failed to start. Try searching for another source.");
          }}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold tracking-wider text-slate-400">CATEGORY:</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={!hasSub}
              onClick={() => handleCategoryChange("sub")}
              className={
                "h-8 rounded-xl px-4 text-xs font-semibold " +
                (activeCategory === "sub"
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white")
              }
            >
              <Captions className="mr-1.5 h-3.5 w-3.5" /> SUB
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!hasDub}
              onClick={() => handleCategoryChange("dub")}
              className={
                "h-8 rounded-xl px-4 text-xs font-semibold " +
                (activeCategory === "dub"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white")
              }
            >
              <Mic className="mr-1.5 h-3.5 w-3.5" /> DUB
            </Button>
          </div>
          <span className="text-xs text-slate-500">
            Direct HLS · {anirakuFallbackProvider} · AnimeTeal native player
          </span>
        </div>
        <Alert variant="default" className="rounded-xl border-emerald-900/60 bg-emerald-950/20 text-emerald-300">
          <AlertCircle className="h-4 w-4 text-emerald-400" />
          <AlertTitle className="font-bold">AnimeTeal native playback</AlertTitle>
          <AlertDescription className="mt-1 text-xs text-emerald-300/80">
            This episode is playing as a direct stream inside AnimeTeal. No third-party ad-click iframe is loaded.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <AnimeTealPlayer
        key={episodeData.sources?.[0]?.url}
        episodeInfo={episodeData}
        serversData={{
          episodeId: activeEpisodeId,
          episodeNo: String(currentEpNumber),
          sub: providerNames.map((p, idx) => ({ serverId: idx + 1, serverName: p })),
          dub: [],
          raw: [],
        }}
        animeInfo={{
          id: anime?.anime?.info?.id || "0",
          title: anime?.anime?.info?.name || "Anime",
          image: anime?.anime?.info?.poster || "",
        }}
        subOrDub={activeCategory}
        autoSkip={autoSkip}
        onError={() => setUseFallback(true)}
      />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full p-5 bg-slate-900/80 backdrop-blur-md rounded-b-2xl border-t border-white/10 shadow-lg">
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-3">
            <Captions className="text-cyan-400 h-4 w-4 shrink-0" />
            <p className="font-bold text-xs text-slate-300 tracking-wider">SERVERS (SUB):</p>
            {providerNames.map((pName) => {
              const hasSub = (rawProviders[pName]?.episodes?.sub || []).length > 0;
              if (!hasSub) return null;
              const isActive =
                currentProviderName.toLowerCase() === pName.toLowerCase() &&
                activeCategory === "sub";

              return (
                <Button
                  size="sm"
                  key={`sub-${pName}`}
                  className={`uppercase font-bold text-xs px-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400/50 scale-105"
                      : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  onClick={() => handleProviderSelect(pName, "sub")}
                >
                  {pName}
                </Button>
              );
            })}
          </div>

          {providerNames.some((p) => (rawProviders[p]?.episodes?.dub || []).length > 0) && (
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Mic className="text-emerald-400 h-4 w-4 shrink-0" />
              <p className="font-bold text-xs text-slate-300 tracking-wider">SERVERS (DUB):</p>
              {providerNames.map((pName) => {
                const hasDub = (rawProviders[pName]?.episodes?.dub || []).length > 0;
                if (!hasDub) return null;
                const isActive =
                  currentProviderName.toLowerCase() === pName.toLowerCase() &&
                  activeCategory === "dub";

                return (
                  <Button
                    size="sm"
                    key={`dub-${pName}`}
                    className={`uppercase font-bold text-xs px-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/50 scale-105"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                    onClick={() => handleProviderSelect(pName, "dub")}
                  >
                    {pName}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm shrink-0 self-start md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUseFallback(true)}
            className="h-8 px-3 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-gray-200 flex items-center gap-1.5"
          >
            <Tv className="h-3.5 w-3.5 text-yellow-400" /> Switch to Fallback Player
          </Button>
          <div className="flex flex-row items-center space-x-2">
            <Switch
              checked={autoSkip}
              onCheckedChange={(e) => onHandleAutoSkipChange(e)}
              id="auto-skip"
            />
            <p>Auto Skip</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerSection;
