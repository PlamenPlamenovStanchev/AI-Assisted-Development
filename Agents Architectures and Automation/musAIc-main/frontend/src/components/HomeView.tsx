import type { ReactNode } from 'react';
import { Box, Chip, Container, Divider, Paper, Stack, Typography } from '@mui/material';

interface HomeViewProps {
  accountAction: ReactNode;
  welcomeAction?: ReactNode;
  profile?: ReactNode;
  activity?: ReactNode;
}

const features = [
  { number: '01', title: 'A little more you', description: 'Your Spotify profile, with the details that make it yours.', color: '#F3DCCC' },
  { number: '02', title: 'Room to reflect', description: 'Music marks moments. Let musAIc be a home for your listening story.', color: '#E2E9DA' },
  { number: '03', title: 'Start with a connection', description: 'Sign in with Spotify to bring your profile into musAIc.', color: '#F4E6BE' },
];

export default function HomeView({ accountAction, welcomeAction, profile, activity }: HomeViewProps) {
  return (
    <Container maxWidth="lg" data-cy="home" sx={{ py: { xs: 3, md: 5 } }}>
      <Box component="header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Box aria-hidden="true" sx={{ bgcolor: 'primary.main', color: '#fff', borderRadius: '50%', width: 42, height: 42, display: 'grid', placeItems: 'center', fontSize: 26 }}>♪</Box>
          <Typography variant="h6" sx={{ fontWeight: 750 }}>musAIc</Typography>
        </Stack>
        {accountAction}
      </Box>
      <Box component="main">
        {activity && <Box sx={{ mt: 5 }}>{activity}</Box>}
        <Paper component="section" aria-label="Welcome to musAIc" sx={{ mt: 5, p: { xs: 3, md: 7 }, bgcolor: '#F3E7D8', overflow: 'hidden' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 1fr' }, alignItems: 'center', gap: 4 }}>
            <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
              <Chip label="Your music. Your moments." variant="outlined" color="secondary" />
              <Typography variant="h1" sx={{ fontSize: { xs: '2.8rem', md: '4.6rem' }, lineHeight: 1.06, letterSpacing: '-0.04em' }}>Every song has<br />a little story.</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: '1.1rem', maxWidth: 430, lineHeight: 1.8 }}>Welcome to musAIc, your personal music diary. A cozy place to explore and reflect on your Spotify listening habits.</Typography>
              {welcomeAction}
              <Typography variant="body2" color="text.secondary">Made for the music that stays with you.</Typography>
            </Stack>
            <Box aria-hidden="true" sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
              <Box sx={{ width: { xs: 210, md: 290 }, aspectRatio: '1', borderRadius: '50%', background: 'repeating-radial-gradient(circle, #342C28 0px, #342C28 4px, #493F38 5px, #342C28 7px)', boxShadow: '16px 20px 0 #DFC5AD', display: 'grid', placeItems: 'center', transform: 'rotate(-12deg)' }}>
                <Box sx={{ width: '38%', aspectRatio: '1', borderRadius: '50%', bgcolor: '#C77454', display: 'grid', placeItems: 'center', border: '10px solid #E6AA83' }}>
                  <Typography sx={{ color: '#FFFCF7', fontSize: 44 }}>♪</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
        {profile && <Box sx={{ mt: 4 }}>{profile}</Box>}
        <Typography variant="h2" sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, mt: 5, mb: 3 }}>A home for your listening story</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {features.map((feature) => <Paper key={feature.number} sx={{ p: 3, border: '1px solid', borderColor: 'divider' }}>
            <Chip label={feature.number} size="small" sx={{ bgcolor: feature.color, mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 650 }}>{feature.title}</Typography>
            <Typography color="text.secondary" sx={{ lineHeight: 1.7 }}>{feature.description}</Typography>
          </Paper>)}
        </Box>
      </Box>
      <Divider sx={{ mt: 5, mb: 3 }} />
      <Typography component="footer" variant="body2" color="text.secondary">musAIc · A little music, a little reflection.</Typography>
    </Container>
  );
}
