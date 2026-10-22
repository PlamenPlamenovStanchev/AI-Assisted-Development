import { Show, SignInButton, UserButton } from '@clerk/react';
import { Button, Stack, Typography } from '@mui/material';
import HomeView from '../components/HomeView';
import SpotifyProfile from '../components/SpotifyProfile';
import RecentListeningActivity from '../components/RecentListeningActivity';

export default function Home() {
  return <HomeView
    accountAction={<>
      <Show when="signed-out"><SignInButton mode="modal"><Button variant="outlined" size="small">Sign in</Button></SignInButton></Show>
      <Show when="signed-in"><Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}><Typography variant="body2">Your account</Typography><UserButton /></Stack></Show>
    </>}
    welcomeAction={<Show when="signed-out"><SignInButton mode="modal"><Button variant="contained" size="large">Sign in with Spotify</Button></SignInButton></Show>}
    profile={<Show when="signed-in"><SpotifyProfile /></Show>}
    activity={<Show when="signed-in"><RecentListeningActivity /></Show>}
  />;
}
