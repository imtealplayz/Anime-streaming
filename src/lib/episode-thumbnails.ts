const DATABASE_NAME = "animeteal-local-episode-thumbnails";
const DATABASE_VERSION = 1;
const STORE_NAME = "episode-thumbnails";

export const EPISODE_THUMBNAIL_UPDATED_EVENT =
  "animeteal:episode-thumbnail-updated";

type EpisodeThumbnailRecord = {
  key: string;
  animeId: string;
  episodeNumber: number;
  blob: Blob;
  currentTime: number;
  capturedAt: number;
};

export const getEpisodeThumbnailKey = (
  animeId: string,
  episodeNumber: number,
) => `${animeId}:${episodeNumber}`;

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Could not open thumbnail storage."));
    request.onblocked = () =>
      reject(new Error("Thumbnail storage is blocked by another tab."));
  });

export const saveEpisodeThumbnail = async (
  animeId: string,
  episodeNumber: number,
  blob: Blob,
  currentTime: number,
): Promise<void> => {
  if (!animeId || !Number.isFinite(episodeNumber) || episodeNumber < 1) return;

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const record: EpisodeThumbnailRecord = {
      key: getEpisodeThumbnailKey(animeId, episodeNumber),
      animeId,
      episodeNumber,
      blob,
      currentTime: Math.max(0, Math.round(currentTime)),
      capturedAt: Date.now(),
    };

    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Could not save episode thumbnail."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("Episode thumbnail save was aborted."));
  }).finally(() => database.close());

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(EPISODE_THUMBNAIL_UPDATED_EVENT, {
        detail: getEpisodeThumbnailKey(animeId, episodeNumber),
      }),
    );
  }
};

export const getEpisodeThumbnail = async (
  animeId: string,
  episodeNumber: number,
): Promise<Blob | null> => {
  if (!animeId || !Number.isFinite(episodeNumber) || episodeNumber < 1) {
    return null;
  }

  const database = await openDatabase();

  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction
        .objectStore(STORE_NAME)
        .get(getEpisodeThumbnailKey(animeId, episodeNumber));

      request.onsuccess = () => {
        const record = request.result as EpisodeThumbnailRecord | undefined;
        resolve(record?.blob instanceof Blob ? record.blob : null);
      };
      request.onerror = () =>
        reject(request.error || new Error("Could not read episode thumbnail."));
    });
  } finally {
    database.close();
  }
};
