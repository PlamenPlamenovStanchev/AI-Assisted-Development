import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { ListeningActivityItem } from '../../../backend/src/types/api';

function formatDuration(durationMs: number) {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function ListeningTrack({ track }: { track: ListeningActivityItem }) {
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const hasCover = track.albumCoverUrl && failedCover !== track.albumCoverUrl;
  const listenedAt = new Date(track.playedAt);

  return <Box component="article" data-cy="listening-track" sx={{ display: 'grid', gridTemplateColumns: { xs: '72px minmax(0, 1fr)', sm: '88px minmax(0, 1fr) auto auto' }, alignItems: 'center', columnGap: { xs: 1.5, sm: 2.5 }, rowGap: 1, p: { xs: 2, sm: 2.5 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
    <Box sx={{ gridRow: { xs: '1 / 3', sm: 'auto' }, width: { xs: 72, sm: 88 }, aspectRatio: hasCover ? undefined : '1', bgcolor: '#E2E9DA', color: 'secondary.main', display: 'grid', placeItems: 'center', fontSize: 30 }}>
      {hasCover ? <Box component="img" src={track.albumCoverUrl ?? undefined} alt={`Album cover for ${track.name}`} onError={() => setFailedCover(track.albumCoverUrl)} sx={{ display: 'block', width: '100%', height: 'auto' }} /> : <Box component="span" role="img" aria-label="Album cover unavailable">♪</Box>}
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h4" data-cy="track-name" sx={{ fontWeight: 650, fontSize: '1rem', overflowWrap: 'anywhere', lineHeight: 1.5 }}>{track.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere', mt: 0.25 }}>{track.artists.join(', ') || 'Unknown artist'}</Typography>
    </Box>
    <Typography variant="body2" color="text.secondary" aria-label={`Duration: ${formatDuration(track.durationMs)}`} sx={{ gridColumn: { xs: 2, sm: 'auto' }, fontVariantNumeric: 'tabular-nums' }}>{formatDuration(track.durationMs)}</Typography>
    <Typography component="time" dateTime={track.playedAt} title={listenedAt.toLocaleString()} variant="body2" color="text.secondary" sx={{ gridColumn: { xs: 2, sm: 'auto' }, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', textAlign: { sm: 'right' } }}>
      Listened at {listenedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </Typography>
  </Box>;
}
