import { SEARCH_ANIME } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { getAniListSearchSuggestions } from "@/lib/anilist";
import { ISuggestionAnime } from "@/types/anime";
import { SearchSuggestionsResponse } from "@/types/miruro-api";
import { useQuery } from "react-query";

const searchAnime = async (q: string): Promise<ISuggestionAnime[]> => {
  if (!q) return [];
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const res = await api.get<SearchSuggestionsResponse>("/suggestions", {
        params: { query: q },
      });

      const suggestions = res.data?.suggestions || [];
      if (suggestions.length > 0) {
        return suggestions.map((item) => ({
          id: String(item.id),
          name: item.title || item.title_romaji || "Untitled",
          jname: item.title_romaji || "",
          poster: item.poster || "",
          episodes: {
            sub: item.episodes || 0,
            dub: item.episodes || 0,
          },
          type: item.format as any,
          moreInfo: [
            item.year ? String(item.year) : "",
            item.format || "",
            item.status || "",
          ].filter(Boolean),
        }));
      }
    } catch {
      // Fallback to AniList
    }
  }

  return getAniListSearchSuggestions(q);
};

export const useSearchAnime = (query: string) => {
  return useQuery({
    queryFn: () => searchAnime(query),
    queryKey: [SEARCH_ANIME, query],
    enabled: !!query,
  });
};
