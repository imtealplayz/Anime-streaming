export interface IEpisodes {
  totalEpisodes: number;
  episodes: Episode[];
}

export interface Episode {
  title: string;
  image?: string;
  episodeId: string;
  number: number;
  isFiller: boolean;
  hasSub?: boolean;
  hasDub?: boolean;
}

export interface IEpisodeSource {
  headers: {
    Referer: string;
  };
  // Optional full provider headers used by Aniraku's media proxy for raw
  // subtitle URLs. Existing legacy sources continue to use headers.Referer.
  requestHeaders?: Record<string, string>;
  subtitles: Track[];
  intro: Intro;
  outro: Outro;
  sources: Source[];
  anilistID: number;
  malID: number;
}

export interface IEpisodeServers {
  episodeId: string;
  episodeNo: string;
  sub: {
    serverId: number;
    serverName: string;
  }[];
  dub: {
    serverId: number;
    serverName: string;
  }[];
  raw: {
    serverId: number;
    serverName: string;
  }[];
}

export interface Track {
  lang: string;
  url: string;
  label?: string;
}

export interface Intro {
  start: number;
  end: number;
}

export interface Outro {
  start: number;
  end: number;
}

export interface Source {
  url: string;
  type: string;
}
