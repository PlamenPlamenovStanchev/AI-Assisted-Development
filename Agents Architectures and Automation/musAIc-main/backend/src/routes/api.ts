import { Router } from 'express';
import requireUser from '../middleware/requireUser.js';
import { spotifyFetch } from '../services/spotify.js';
import type { MeResponse, ApiError, RecentlyPlayedResponse } from '../types/api.js';
import type { SpotifyUserProfile, SpotifyRecentlyPlayedResponse } from '../types/spotify.js';

const router = Router();

router.get('/me', requireUser, async (req, res) => {
  const userId = res.locals.userId;
  if (typeof userId !== 'string') {
    res.status(401).json({ error: 'Unauthorized' } satisfies ApiError);
    return;
  }
  const profile = await spotifyFetch<SpotifyUserProfile>(userId, '/me');

  res.json({
    clerkUserId: userId,
    spotify: {
      id: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      country: profile.country,
      product: profile.product,
      imageUrl: profile.images?.[0]?.url ?? null,
      profileUrl: profile.external_urls?.spotify ?? null,
    },
  } satisfies MeResponse);
});

router.get('/recently-played', requireUser, async (req, res) => {
  const userId = res.locals.userId;
  if (typeof userId !== 'string') {
    res.status(401).json({ error: 'Unauthorized' } satisfies ApiError);
    return;
  }

  const activity = await spotifyFetch<SpotifyRecentlyPlayedResponse>(
    userId,
    '/me/player/recently-played?limit=50',
  );
  const items = activity.items
    .map(({ track, played_at }) => ({
      trackId: track.id,
      name: track.name,
      artists: track.artists.map(({ name }) => name),
      albumCoverUrl: track.album.images[0]?.url ?? null,
      durationMs: track.duration_ms,
      playedAt: played_at,
    }))
    .sort((first, second) => Date.parse(second.playedAt) - Date.parse(first.playedAt));

  res.json({ items } satisfies RecentlyPlayedResponse);
});

export default router;
