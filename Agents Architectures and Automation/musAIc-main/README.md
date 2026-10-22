# musAIc

A personal music diary with Spotify sign-in, profile details, and recent listening history grouped by day.

## Structure

- `backend/`: Express + TypeScript API, port 3030.
- `frontend/`: React + TypeScript + Vite, port 8080.

## Setup

Requires Node.js 22+ and a [Clerk](https://clerk.com) application with Spotify sign-in enabled.

1. Run `npm install` in both `backend/` and `frontend/`.
2. Create `.env.local` in each folder using its `.env.example`.
3. Add `user-read-recently-played` to the Clerk Spotify connection's OAuth scopes.
   Existing users may need to reconnect Spotify.
4. Run `npm run dev` in each folder, in separate terminals.
5. Open [localhost:8080](http://localhost:8080) and sign in with Spotify.
