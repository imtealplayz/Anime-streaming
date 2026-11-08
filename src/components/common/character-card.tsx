import React from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { CharactersVoiceActor } from "@/types/anime-details";

type Props = {
  className?: string;
  character: CharactersVoiceActor;
};

const CharacterCard = ({ ...props }: Props) => {
  return (
    <div
      className={cn([
        "rounded-2xl overflow-hidden relative cursor-pointer group glass-panel border border-white/10 hover:border-cyan-500/40 transition-all duration-300 shadow-md",
        "h-[15.625rem] min-w-[10.625rem] max-w-[12.625rem] md:h-[18.75rem] md:max-w-[12.5rem]",
        props.className,
      ])}
    >
      <Image
        src={props.character.character.poster}
        alt="image"
        height={100}
        width={100}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        unoptimized
      />

      <div className="absolute inset-0 m-auto h-full w-full bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
      <div className="absolute bottom-0 flex flex-col gap-0.5 px-4 pb-3 z-10">
        <h5 className="line-clamp-2 text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
          {props.character.character.name}
        </h5>
        <p className="line-clamp-1 text-xs text-slate-400">
          {props.character.character.cast}
        </p>
      </div>
    </div>
  );
};

export default CharacterCard;
