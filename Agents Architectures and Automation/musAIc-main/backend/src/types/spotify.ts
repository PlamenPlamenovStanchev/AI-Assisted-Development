export interface SpotifyUserProfile {
  id: string;
  display_name: string | null;
  email?: string;
  country?: string;
  product?: string;
  images?: { url: string }[];
  external_urls?: { spotify?: string };
}

export interface SpotifyRecentlyPlayedResponse {
  items: {
    track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { images: { url: string }[] };
      duration_ms: number;
    };
    played_at: string;
  }[];
}
