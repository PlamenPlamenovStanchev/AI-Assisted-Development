import { clerkClient } from '@clerk/express';

const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Clerk stores (and refreshes) the Spotify OAuth token obtained at sign-in.
export async function getSpotifyAccessToken(userId: string): Promise<string> {
  const { data } = await clerkClient.users.getUserOauthAccessToken(userId, 'spotify');
  const token = data[0]?.token;

  if (!token) throw new HttpError(403, 'No Spotify account linked to this user');

  return token;
}

export async function spotifyFetch<T>(userId: string, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getSpotifyAccessToken(userId);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok)
    throw new HttpError(502, `Spotify API request failed with status ${response.status}`);

  return response.json();
}
