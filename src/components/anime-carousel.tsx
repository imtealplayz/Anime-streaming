"use client";

import React from "react";
import AnimeCard from "./anime-card";
import { IAnime } from "@/types/anime";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";
import Button from "./common/custom-button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import BlurFade from "./ui/blur-fade";
import { ROUTES } from "@/constants/routes";

type Props = {
  anime: IAnime[];
  title: string;
  className?: string;
};

const AnimeCarousel = (props: Props) => {
  const [api, setApi] = React.useState<CarouselApi>();

  return (
    <div className={cn(["flex flex-col gap-5", props.className])}>
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
          <h5 className="text-xl md:text-2xl font-bold text-white tracking-wide">{props.title}</h5>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              api?.scrollPrev();
            }}
            className="rounded-full glass-panel border border-white/10 h-9 w-9 p-0 hover:border-cyan-400/50 hover:text-cyan-400 transition flex items-center justify-center text-slate-300"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
          </Button>
          <Button
            onClick={() => api?.scrollNext()}
            className="rounded-full glass-panel border border-white/10 h-9 w-9 p-0 hover:border-cyan-400/50 hover:text-cyan-400 transition flex items-center justify-center text-slate-300"
          >
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>
        </div>
      </div>
      <Carousel className="w-full" setApi={setApi} opts={{}}>
        <CarouselContent className="w-full">
          {props.anime?.map((ani, idx) => (
            <BlurFade key={idx} delay={idx * 0.05} inView>
              <CarouselItem
                key={idx}
                className="lg:basis-[1/5] basis-[1/2] sm:basis-[1/3] md:basis-[1/4] xl:basis-[1/6] 2xl:basis-[1/7]"
              >
                <AnimeCard
                  key={idx}
                  title={ani.name}
                  format={ani.type}
                  href={`${ROUTES.ANIME_DETAILS}/${ani.id}`}
                  poster={ani.poster}
                  className="self-center justify-self-center min-w-[12rem]"
                />
              </CarouselItem>
            </BlurFade>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};

export default AnimeCarousel;
