import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from '@mui/material';
import type { MeResponse, ApiError } from '../../../backend/src/types/api';

export default function SpotifyProfile() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch('/api/me')
      .then(async (res) => {
        if (!res.ok) {
          const body: ApiError = await res.json();
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const body: MeResponse = await res.json();
        return body;
      })
      .then((body) => !ignore && setMe(body))
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Unknown error');
      });
    return () => { ignore = true; };
  }, []);

  if (error) return <Alert severity="error">Could not load your Spotify profile: {error}</Alert>;
  if (!me) return <Paper role="status" sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}><Typography>Loading your Spotify profile…</Typography></Paper>;

  const { spotify } = me;
  const name = spotify.displayName || 'Music lover';
  const details = [
    ['Display name', name], ['Email', spotify.email || 'Not shared'],
    ['Country / region', spotify.country || 'Not shared'], ['Spotify plan', spotify.product || 'Not shared'],
    ['Spotify user ID', spotify.id],
  ];

  return <>
    <Paper component="section" aria-label="Spotify profile" sx={{ p: 3, border: '1px solid', borderColor: 'divider', width: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Avatar src={spotify.imageUrl ?? undefined} alt={name} sx={{ width: 60, height: 60, bgcolor: '#E2E9DA', color: 'secondary.main' }}>{name.charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">Your listening corner</Typography>
            <Typography variant="h2" sx={{ fontSize: '1.7rem', overflowWrap: 'anywhere' }}>{name}</Typography>
            <Chip size="small" label="Spotify connected" color="secondary" variant="outlined" sx={{ mt: 1 }} />
          </Box>
        </Stack>
        <Button variant="contained" onClick={() => setOpen(true)} aria-haspopup="dialog">My profile</Button>
      </Stack>
    </Paper>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="profile-title" aria-describedby="profile-description" transitionDuration={0}>
      <DialogTitle id="profile-title" sx={{ pb: 1 }}>My profile</DialogTitle>
      <DialogContent>
        <Typography id="profile-description" color="text.secondary" sx={{ mb: 3 }}>A little about you, straight from your Spotify account.</Typography>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar src={spotify.imageUrl ?? undefined} alt={name} sx={{ bgcolor: '#E2E9DA', color: 'secondary.main', width: 56, height: 56 }}>{name.charAt(0).toUpperCase()}</Avatar>
          <Typography variant="h2" sx={{ fontSize: '1.7rem', overflowWrap: 'anywhere' }}>{name}</Typography>
        </Stack>
        <Box component="dl" sx={{ m: 0 }}>
          {details.map(([label, value]) => <Box key={label} sx={{ py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.6fr' }, gap: 0.5 }}>
            <Typography component="dt" color="text.secondary">{label}</Typography>
            <Typography component="dd" sx={{ m: 0, fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
          </Box>)}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>These details are managed in Spotify. Some information may not be shared with musAIc.</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1, flexWrap: 'wrap', gap: 1 }}>
        {spotify.profileUrl && <Button href={spotify.profileUrl} target="_blank" rel="noreferrer" color="secondary" variant="outlined">Open in Spotify</Button>}
        <Button variant="contained" onClick={() => setOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  </>;
}
