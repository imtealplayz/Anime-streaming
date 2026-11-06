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

type FallbackLanguagePool = {
  episodeData: IEpisodeSource;
  provider: string;
};

type FallbackLanguagePools = {
  sub: FallbackLanguagePool | null;
  dub: FallbackLanguagePool | null;
};

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

  const isFallbackActive =
    isSourceAvailable === false ||
    useFallback ||
    (!isLoadingData && (!episodeData || !episodeData.sources?.length));

  const [autoSkip, setAutoSkip] = useState<boolean>(true);
  const [preferredCategory, setPreferredCategory] = useState<"sub" | "dub">("sub");

  const [anirakuFallbackPools, setAnirakuFallbackPools] =
    useState<FallbackLanguagePools>({ sub: null, dub: null });
  const [anirakuFallbackLoading, setAnirakuFallbackLoading] = useState(false);
  const [anirakuFallbackError, setAnirakuFallbackError] = useState("");
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

  // In fallback mode, language availability comes from Aniraku's actual
  // per-language server discovery, not the legacy provider metadata.
  const hasSub = isFallbackActive
    ? Boolean(anirakuFallbackPools.sub)
    : providerNames.some((p) => (rawProviders[p]?.episodes?.sub?.length || 0) > 0);
  const hasDub = isFallbackActive
    ? Boolean(anirakuFallbackPools.dub)
    : providerNames.some((p) => (rawProviders[p]?.episodes?.dub?.length || 0) > 0);

  const handleCategoryChange = (cat: "sub" | "dub") => {
    setPreferredCategory(cat);
    localStorage.setItem("preferredCategory", cat);

    // In fallback mode, switching language selects the already-discovered
    // Aniraku pool and must not change the legacy episode ID.
    if (isFallbackActive) return;

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
    if (isFallbackActive || !providerNames.length || !allEpisodesData?.rawResponse?.providers) return;

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
    isFallbackActive,
  ]);

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
  const cleanParts = activeEpisodeId.replace(/^\\//, "").split("/");
  const currentProviderName = cleanParts[1] || providerNames[0] || "kiwi";
  const activeCategory = isFallbackActive
    ? preferredCategory
    : cleanParts[3] === "dub"
      ? "dub"
      : preferredCategory;

  const activeFallbackPool = anirakuFallbackPools[activeCategory];
  const anirakuFallbackData = activeFallbackPool?.episodeData ?? null;
  const anirakuFallbackProvider = activeFallbackPool?.provider ?? "Aniraku";

  useEffect(() => {
    if (!isFallbackActive) {
      setAnirakuFallbackPools({ sub: null, dub: null });
      setAnirakuFallbackError("");
      setAnirakuFallbackLoading(false);
      return;
    }

    const animeId = Number(animeIdParam);
    const episode = Number(currentEpNumber);
    if (!Number.isInteger(animeId) || animeId <= 0 || !Number.isInteger(episode) || episode <= 0) {
      setAnirakuFallbackPools({ sub: null, dub: null });
      setAnirakuFallbackLoading(false);
      setAnirakuFallbackError("This episode is missing a valid AniList ID or episode number.");
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;
    setAnirakuFallbackPools({ sub: null, dub: null });
    setAnirakuFallbackError("");
    setAnirakuFallbackLoading(true);

    const discoverLanguage = async (lang: "sub" | "dub") => {
      try {
        const params = new URLSearchParams({
          animeId: String(animeId),
          episode: String(episode),
          lang,
        });
        const response = await fetch("/api/v1/servers?" + params.toString(), {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const rawBody = await response.text();
        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          throw new Error(`Aniraku returned a non-JSON response for ${lang.toUpperCase()}.`);
        }

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              `${lang.toUpperCase()} source discovery returned HTTP ${response.status}.`,
          );
        }
        if (!Array.isArray(payload)) {
          throw new Error(`Aniraku returned an invalid ${lang.toUpperCase()} server list.`);
        }

        const candidates = payload.flatMap((server: any) =>
          (Array.isArray(server?.sources) ? server.sources : []).map((source: any) => ({
            server,
            source,
          })),
        );

        const playableCandidates = candidates.filter(({ source }: any) => {
          const type = String(source?.type || "").toLowerCase();
          const verdict = String(source?.verification || "").toLowerCase();
          return (
            typeof source?.url === "string" &&
            /^https?:\\/\\//i.test(source.url) &&
            (type === "hls" || type === "m3u8") &&
            verdict !== "dead" &&
            verdict !== "embed"
          );
        });

        // Prefer a playable source that also supplies captions, while
        // preserving provider order when no captioned source exists.
        const selected =
          playableCandidates.find(
            ({ source }: any) =>
              Array.isArray(source?.subtitles) && source.subtitles.length > 0,
          ) || playableCandidates[0];

        if (!selected) {
          return {
            pool: null as FallbackLanguagePool | null,
            error: `No direct HLS ${lang.toUpperCase()} source was returned for this episode.`,
          };
        }

        const subtitles = (
          Array.isArray(selected.source.subtitles) ? selected.source.subtitles : []
        )
          .filter(
            (track: any) =>
              typeof track?.url === "string" && /^https?:\\/\\//i.test(track.url),
          )
          .map((track: any) => ({
            lang: String(track.lang || track.label || "Unknown"),
            label: String(track.label || track.lang || "Subtitle"),
            url: track.url,
          }));

        const providerHeaders = selected.server?.headers &&
          typeof selected.server.headers === "object"
          ? Object.fromEntries(
              Object.entries(selected.server.headers).filter(
                ([, value]) => typeof value === "string",
              ),
            ) as Record<string, string>
          : {};
        const referer = providerHeaders.Referer || providerHeaders.referer || "";

        const episodeData: IEpisodeSource = {
          headers: { Referer: referer },
          requestHeaders: providerHeaders,
          subtitles,
          intro: { start: 0, end: 0 },
          outro: { start: 0, end: 0 },
          sources: [{ url: selected.source.url, type: "m3u8" }],
          anilistID: animeId,
          malID: 0,
        };

        return {
          pool: {
            episodeData,
            provider: selected.server?.name || selected.server?.provider || "Aniraku",
          } as FallbackLanguagePool,
          error: null as string | null,
        };
      } catch (error) {
        if (controller.signal.aborted) throw error;
        return {
          pool: null as FallbackLanguagePool | null,
          error: error instanceof Error
            ? error.message
            : `Could not discover ${lang.toUpperCase()} sources.`,
        };
      }
    };

    Promise.all([discoverLanguage("sub"), discoverLanguage("dub")]).then(
      ([subResult, dubResult]) => {
        if (!isCurrent || controller.signal.aborted) return;

        setAnirakuFallbackPools({
          sub: subResult.pool,
          dub: dubResult.pool,
        });

        const errors = [
          !subResult.pool ? subResult.error : null,
          !dubResult.pool ? dubResult.error : null,
        ].filter(Boolean);
        setAnirakuFallbackError(
          !subResult.pool && !dubResult.pool ? errors.join(" ") : "",
        );
        setAnirakuFallbackLoading(false);
      },
    );

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [isFallbackActive, animeIdParam, currentEpNumber, anirakuRetryKey]);

  // If the saved language is unavailable for this episode but the other
  // language has a playable pool, switch automatically.
  useEffect(() => {
    if (!isFallbackActive || anirakuFallbackLoading) return;
    const otherCategory = preferredCategory === "sub" ? "dub" : "sub";
    if (
      !anirakuFallbackPools[preferredCategory] &&
      anirakuFallbackPools[otherCategory]
    ) {
      setPreferredCategory(otherCategory);
      localStorage.setItem("preferredCategory", otherCategory);
    }
  }, [
    isFallbackActive,
    anirakuFallbackLoading,
    anirakuFallbackPools,
    preferredCategory,
  ]);


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
          key={`${activeCategory}-${anirakuFallbackData.sources[0]?.url}`}
          episodeInfo={anirakuFallbackData}
          serversData={{
            episodeId: activeEpisodeId,
            episodeNo: String(currentEpNumber),
            sub: anirakuFallbackPools.sub
              ? [{ serverId: 1, serverName: anirakuFallbackPools.sub.provider }]
              : [],
            dub: anirakuFallbackPools.dub
              ? [{ serverId: 1, serverName: anirakuFallbackPools.dub.provider }]
              : [],
            raw: [],
          }}
          animeInfo={playerInfo}
          subOrDub={activeCategory}
          autoSkip={autoSkip}
          onError={() => {
            setAnirakuFallbackPools((current) => ({
              ...current,
              [activeCategory]: null,
            }));
            setAnirakuFallbackError(
              `The direct ${activeCategory.toUpperCase()} stream failed to start. Try the other language or retry source search.`,
            );
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
