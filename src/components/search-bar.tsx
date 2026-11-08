import React, { useState, useRef } from "react";
import { Input } from "./ui/input";
import { SearchIcon, SlidersHorizontal, ArrowRight } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { useSearchAnime } from "@/query/search-anime";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

const SearchBar = ({
  className,
  onAnimeClick,
}: {
  className?: string;
  onAnimeClick?: () => void;
}) => {
  const [searchValue, setSearchValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const debouncedValue = useDebounce(searchValue, 350);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const { data: searchResults, isLoading } = useSearchAnime(debouncedValue);

  const handleBlur = () => {
    setTimeout(() => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(document.activeElement)
      ) {
        setIsFocused(false);
      }
    }, 150);
  };

  const handleAnimeClick = () => {
    setSearchValue("");
    setIsFocused(false);
    if (onAnimeClick) {
      onAnimeClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue)}`);
      setIsFocused(false);
      if (onAnimeClick) {
        onAnimeClick();
      }
      setSearchValue("");
    }
  };

  return (
    <div className={cn(["relative w-full min-h-fit", className])}>
      <div className="relative flex items-center w-full">
        <SearchIcon
          suppressHydrationWarning
          className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none"
        />
        <Input
          className="w-full h-10 pl-10 pr-10 text-sm text-white bg-[#0d121d]/90 border-white/10 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-500 placeholder:text-slate-500 shadow-inner"
          placeholder="Search anime, movies, genres..."
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          value={searchValue}
          onKeyDown={handleKeyDown}
        />
        <Button
          size="icon"
          variant="ghost"
          className="absolute right-1.5 h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg"
          onClick={() => {
            router.push(ROUTES.SEARCH + '?q=""');
          }}
          title="Filter and Catalog"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isFocused && searchValue.trim() && (
        <div
          ref={resultsRef}
          className="absolute left-0 right-0 top-[115%] z-[150] max-h-[60vh] overflow-y-auto p-2.5 rounded-2xl bg-[#0b0f19]/95 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col gap-2"
        >
          {isLoading && (
            <div className="p-4 text-center text-xs text-slate-400">
              Searching anime...
            </div>
          )}

          {!isLoading && (!searchResults || searchResults.length === 0) && (
            <div className="p-4 text-center text-xs text-slate-400">
              No results found for &ldquo;{searchValue}&rdquo;
            </div>
          )}

          {searchResults?.slice(0, 8).map((anime) => (
            <Link
              key={anime.id}
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              onClick={handleAnimeClick}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-indigo-600/15 transition-all group"
            >
              <div className="h-14 w-10 relative overflow-hidden rounded-lg shrink-0 bg-slate-900 border border-white/5">
                <Image
                  src={anime.poster}
                  alt={anime.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="40px"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                  {anime.name || anime.jname}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                  {anime.type && (
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-semibold">
                      {anime.type}
                    </span>
                  )}
                  {anime.moreInfo?.slice(0, 2).map((info, idx) => (
                    <span key={idx}>• {info}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}

          {searchResults && searchResults.length > 0 && (
            <Link
              href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue)}`}
              onClick={handleAnimeClick}
              className="mt-1"
            >
              <Button className="w-full h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all flex items-center justify-center gap-1.5">
                <span>View All Results</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
