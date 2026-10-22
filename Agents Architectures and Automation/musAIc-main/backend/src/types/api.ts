export interface ApiError {
  error: string;
}

export interface ListeningActivityItem {
  trackId: string;
  name: string;
  artists: string[];
  albumCoverUrl: string | null;
  durationMs: number;
  playedAt: string;
}

export interface RecentlyPlayedResponse {
  items: ListeningActivityItem[];
}

export interface MeResponse {
  clerkUserId: string;
  spotify: {
    id: string;
    displayName: string | null;
    email?: string;
    country?: string;
    product?: string;
    imageUrl: string | null;
    profileUrl: string | null;
  };
}
