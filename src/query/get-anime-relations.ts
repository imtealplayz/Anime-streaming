import { api } from "@/lib/api";
import { getAniListAnimeRelations } from "@/lib/anilist";
import { MediaList } from "@/types/miruro-api";
import { useQuery } from "react-query";

export const GET_ANIME_RELATIONS = "GET_ANIME_RELATIONS";

const getAnimeRelations = async (anilistId: string): Promise<MediaList[]> => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const res = await api.get<{ results: MediaList[] } | MediaList[]>(
        `/anime/${anilistId}/relations`,
      );
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.results || [];
      if (list.length > 0) {
        return list.filter((item) => !item.isAdult);
      }
    } catch {
      // Fallback to AniList
    }
  }
  return getAniListAnimeRelations(anilistId);
};

export const useGetAnimeRelations = (anilistId: string) => {
  return useQuery({
    queryFn: () => getAnimeRelations(anilistId),
    queryKey: [GET_ANIME_RELATIONS, anilistId],
    enabled: !!anilistId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
};
