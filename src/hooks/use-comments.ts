import { pb } from "@/lib/pocketbase";
import { IComment } from "@/types/comment";
import { useQuery, useInfiniteQuery } from "react-query";

export const GET_COMMENTS_KEY = "GET_COMMENTS";
export const GET_RECENT_COMMENTS_KEY = "GET_RECENT_COMMENTS";

type GetCommentsParams = {
  animeId: string;
  episodeNumber?: number;
  page?: number;
  perPage?: number;
};

export const useGetComments = ({
  animeId,
  episodeNumber,
  page = 1,
  perPage = 30,
}: GetCommentsParams) => {
  return useQuery({
    queryKey: [GET_COMMENTS_KEY, { animeId, episodeNumber, page, perPage }],
    queryFn: async () => {
      try {
        const filters = [];
        if (animeId) filters.push(`animeId = "${animeId}"`);
        if (episodeNumber !== undefined && episodeNumber !== null) {
          filters.push(`episodeNumber = ${episodeNumber}`);
        }

        const res = await pb
          .collection<IComment>("comments")
          .getList(page, perPage, {
            filter: filters.join(" && "),
            expand: "user",
            sort: "-created",
            requestKey: null,
          });

        return {
          comments: res.items,
          totalItems: res.totalItems,
          totalPages: res.totalPages,
        };
      } catch {
        return {
          comments: [],
          totalItems: 0,
          totalPages: 1,
        };
      }
    },
    enabled: !!animeId,
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useGetInfiniteComments = ({
  animeId,
  episodeNumber,
  perPage = 10,
}: {
  animeId: string;
  episodeNumber?: number;
  perPage?: number;
}) => {
  return useInfiniteQuery({
    queryKey: [GET_COMMENTS_KEY, { animeId, episodeNumber, perPage }],
    queryFn: async ({ pageParam = 1 }) => {
      const filters = [];
      if (animeId) filters.push(`animeId = "${animeId}"`);
      if (episodeNumber !== undefined && episodeNumber !== null && episodeNumber > 0) {
        filters.push(`episodeNumber = ${episodeNumber}`);
      }

      const filterString = filters.join(" && ");

      try {
        const res = await pb
          .collection<IComment>("comments")
          .getList(pageParam, perPage, {
            filter: filterString,
            expand: "user",
            sort: "-created",
            requestKey: null,
          });

        return {
          comments: res.items,
          totalItems: res.totalItems,
          totalPages: res.totalPages,
          page: pageParam,
        };
      } catch {
        try {
          const res = await pb
            .collection<IComment>("comments")
            .getList(pageParam, perPage, {
              filter: filterString,
              sort: "-created",
              requestKey: null,
            });

          return {
            comments: res.items,
            totalItems: res.totalItems,
            totalPages: res.totalPages,
            page: pageParam,
          };
        } catch {
          return {
            comments: [],
            totalItems: 0,
            totalPages: 1,
            page: pageParam,
          };
        }
      }
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!animeId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useGetRecentComments = (limit: number = 10) => {
  return useQuery({
    queryKey: [GET_RECENT_COMMENTS_KEY, limit],
    queryFn: async () => {
      try {
        const res = await pb
          .collection<IComment>("comments")
          .getList(1, limit, {
            expand: "user",
            sort: "-created",
            requestKey: null,
          });

        return res.items;
      } catch {
        // PocketBase is optional; return empty array gracefully when offline
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
