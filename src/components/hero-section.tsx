"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";
import Container from "./container";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  History,
  Play,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { MediaList } from "@/types/miruro-api";

type IHeroSectionProps = {
  spotlightAnime: MediaList[];
  isDataLoading: boolean;
};

const HeroSection = ({ spotlightAnime, isDataLoading }: IHeroSectionProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const featured = spotlightAnime?.[current] || spotlightAnime?.[0];

  useEffect(() => {
    if (!api) return;
    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on("select", updateCurrent);
  }, [api]);

  if (isDataLoading) return <HeroLoadingSkeleton />;
  if (!spotlightAnime?.length) return <FallbackHero />;

  return (
    <div className="relative">
      <section className="relative isolate h-[650px] min-h-[620px] max-h-[760px] overflow-hidden bg-[#07090e] sm:h-[680px] lg:h-[710px]">
        <Carousel
          className="h-full w-full"
          setApi={setApi}
          opts={{ loop: spotlightAnime.length > 1, align: "start" }}
        >
          <CarouselContent className="ml-0 h-full">
            {spotlightAnime.slice(0, 6).map((anime, index) => (
              <CarouselItem
                key={anime.id || index}
                className="h-full pl-0"
              >
                <HeroCanvasItem anime={anime} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="absolute bottom-6 right-4 z-30 flex items-center gap-3 sm:bottom-8 sm:right-8 lg:right-12">
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-2 backdrop-blur-xl sm:flex">
            {spotlightAnime.slice(0, 6).map((anime, index) => (
              <button
                key={anime.id || index}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={"Show spotlight " + (index + 1)}
                aria-current={current === index ? "true" : undefined}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (current === index
                    ? "w-7 bg-teal-300"
                    : "w-1.5 bg-white/35 hover:bg-white/70")
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => api?.scrollPrev()}
            aria-label="Previous spotlight"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-white backdrop-blur-lg transition hover:border-teal-300/60 hover:bg-teal-500/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => api?.scrollNext()}
            aria-label="Next spotlight"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-white backdrop-blur-lg transition hover:border-teal-300/60 hover:bg-teal-500/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      <Container className="relative z-20 -mt-1 pb-8 sm:pb-10">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <FeatureTile
            icon={<Sparkles className="h-5 w-5" />}
            title="Discover your next favourite"
            description="Spotlights, trending picks and seasonal anime."
          />
          <FeatureTile
            icon={<History className="h-5 w-5" />}
            title="Pick up where you left off"
            description="Your continue-watching history stays on this device."
          />
          <FeatureTile
            icon={<Clapperboard className="h-5 w-5" />}
            title="Keep the episodes coming"
            description="Find recently updated series in one place."
          />
        </div>
      </Container>
    </div>
  );
};

const HeroCanvasItem = ({ anime }: { anime: MediaList }) => {
  const background =
    anime.bannerImage ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    "";
  const title =
    anime.title?.english ||
    anime.title?.romaji ||
    anime.title?.native ||
    "Featured anime";
  const secondaryTitle =
    anime.title?.english &&
    anime.title?.romaji &&
    anime.title.english !== anime.title.romaji
      ? anime.title.romaji
      : null;
  const watchHref =
    ROUTES.WATCH + "?anime=" + encodeURIComponent(String(anime.id)) + "&ep=1";
  const detailsHref = ROUTES.ANIME_DETAILS + "/" + anime.id;

  return (
    <div
      className="relative flex h-full min-h-[620px] items-center overflow-hidden bg-[#080d13] bg-cover bg-center"
      style={background ? { backgroundImage: "url(" + background + ")" } : undefined}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/90 to-[#07090e]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/25 to-[#07090e]/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_42%,rgba(20,184,166,0.18),transparent_42%)]" />

      <Container className="relative z-10 grid h-full w-full grid-cols-1 items-center gap-8 pb-24 pt-24 md:grid-cols-[minmax(0,1fr)_270px] md:pb-28 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-300/20 bg-teal-300/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-200 sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_12px_rgba(94,234,212,0.85)]" />
            Your anime destination
          </div>

          <h1 className="max-w-3xl text-[2.55rem] font-black leading-[1.04] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
            Your next
            <span className="block bg-gradient-to-r from-teal-200 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              anime obsession
            </span>
            starts here.
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-200/85 sm:text-base sm:leading-8">
            Discover new worlds, find your next favourite series, and keep
            watching without losing your place. Welcome to AnimeTeal.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-200/80 sm:text-sm">
            {anime.format && <MetaPill>{anime.format}</MetaPill>}
            {anime.seasonYear && (
              <MetaPill>
                {anime.season ? anime.season + " " : ""}
                {anime.seasonYear}
              </MetaPill>
            )}
            {anime.averageScore ? (
              <MetaPill>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {anime.averageScore}%
              </MetaPill>
            ) : null}
            {anime.genres?.slice(0, 2).map((genre) => (
              <MetaPill key={genre}>{genre}</MetaPill>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <Link
              href={watchHref}
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-teal-300 px-6 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-teal-950/30 transition hover:-translate-y-0.5 hover:bg-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Play className="h-4 w-4 fill-current" />
              Watch featured anime
            </Link>
            <Link
              href={ROUTES.SEARCH}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-6 py-3 text-sm font-bold text-white backdrop-blur-lg transition hover:border-teal-200/50 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
            >
              <Search className="h-4 w-4" />
              Explore anime
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-5 text-xs text-slate-300/70">
            No account required for local continue-watching history.
          </p>
        </div>

        <div className="hidden md:flex md:justify-end">
          <div className="w-full max-w-[300px] rounded-3xl border border-white/15 bg-slate-950/55 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-200">
                In the spotlight
              </span>
              <span className="rounded-full border border-teal-300/20 bg-teal-300/10 px-2 py-1 text-[10px] font-semibold text-teal-100">
                Featured
              </span>
            </div>
            <div className="mb-3 h-1 w-12 rounded-full bg-teal-300" />
            <h2 className="line-clamp-3 text-2xl font-extrabold leading-tight text-white lg:text-3xl">
              {title}
            </h2>
            {secondaryTitle && (
              <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                {secondaryTitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {anime.status && (
                <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-200">
                  {anime.status.replaceAll("_", " ")}
                </span>
              )}
              {anime.episodes && (
                <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-slate-200">
                  {anime.episodes} episodes
                </span>
              )}
            </div>
            <Link
              href={detailsHref}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition hover:border-teal-200/50 hover:bg-teal-300/10"
            >
              View anime details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
};

const MetaPill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 backdrop-blur-md">
    {children}
  </span>
);

const FeatureTile = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#0c121b]/90 p-4 shadow-lg shadow-black/10 sm:p-5">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-300/15 bg-teal-300/10 text-teal-200">
      {icon}
    </div>
    <div className="min-w-0">
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  </div>
);

const FallbackHero = () => (
  <section className="relative flex min-h-[620px] items-center overflow-hidden bg-[#07090e] pt-20">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_35%,rgba(20,184,166,0.2),transparent_45%)]" />
    <Container className="relative z-10 py-20">
      <div className="max-w-3xl">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-teal-200">
          AnimeTeal · Discover · Watch · Enjoy
        </p>
        <h1 className="text-5xl font-black leading-tight text-white sm:text-6xl">
          Your next
          <span className="block text-teal-200">anime obsession</span>
          starts here.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
          Explore anime, browse what is trending, and find something worth
          staying up for.
        </p>
        <Link
          href={ROUTES.SEARCH}
          className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-300 px-6 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-teal-200"
        >
          <Search className="h-4 w-4" />
          Explore anime
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Container>
  </section>
);

const HeroLoadingSkeleton = () => (
  <section className="flex min-h-[620px] items-center bg-[#07090e] pt-20">
    <Container className="w-full py-20">
      <div className="max-w-2xl space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-full bg-slate-800" />
        <div className="h-14 w-4/5 animate-pulse rounded-xl bg-slate-800 sm:h-16" />
        <div className="h-5 w-3/5 animate-pulse rounded-lg bg-slate-800/80" />
        <div className="h-5 w-2/5 animate-pulse rounded-lg bg-slate-800/70" />
        <div className="flex gap-3 pt-4">
          <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-12 w-36 animate-pulse rounded-xl bg-slate-800/70" />
        </div>
      </div>
    </Container>
  </section>
);

export default HeroSection;
