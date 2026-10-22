import { useEffect, useState } from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import type { ListeningActivityItem, RecentlyPlayedResponse } from '../../../backend/src/types/api';
import ListeningTrack from './ListeningTrack';

function groupByDay(items: ListeningActivityItem[]) {
  const groups = new Map<string, { date: Date; tracks: ListeningActivityItem[] }>();
  const sorted = [...items].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
  for (const track of sorted) {
    const date = new Date(track.playedAt);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const group = groups.get(key);
    if (group) group.tracks.push(track);
    else groups.set(key, { date, tracks: [track] });
  }
  return [...groups.entries()];
}

export default function RecentListeningActivity() {
  const [items, setItems] = useState<ListeningActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/recently-played', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Please try again later.');
        const body: RecentlyPlayedResponse = await response.json();
        return body.items;
      })
      .then((tracks) => { if (!controller.signal.aborted) setItems(tracks); })
      .catch(() => { if (!controller.signal.aborted) setError('Could not load your recent listening activity. Please try again later.'); });
    return () => controller.abort();
  }, []);

  return <Box component="section" aria-label="Recent listening activity" data-cy="recent-listening-activity">
    <Typography variant="overline" color="secondary.main">Your listening diary</Typography>
    <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.4rem' }, mb: 1 }}>Recently played</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>The songs that have been keeping you company, most recent first.</Typography>
    {error ? <Alert severity="error">{error}</Alert> : items === null ? <Paper role="status" sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>Loading your recent listening activity…</Paper> : items.length === 0 ? <Paper sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}><Typography>No recent listening activity yet.</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Listen to a few songs on Spotify, then come back to see your story.</Typography></Paper> : <Stack spacing={3}>
      {groupByDay(items).map(([day, group]) => <Box component="section" key={day} aria-label={group.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
        <Typography component="h3" sx={{ fontSize: '1rem', fontWeight: 650, mb: 1.5 }}>{group.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Typography>
        <Stack component="ol" sx={{ m: 0, p: 0, listStyle: 'none', gap: 1 }}>
          {group.tracks.map((track, index) => <Box component="li" key={`${track.trackId}-${track.playedAt}-${index}`}><ListeningTrack track={track} /></Box>)}
        </Stack>
      </Box>)}
    </Stack>}
  </Box>;
}
