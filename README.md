# Anime Sync Circle

Live anime watch parties with synchronized playback and persistent chat rooms.

## What It Does

Anime Sync Circle lets groups watch anime together in real-time, with everyone's video perfectly synchronized. The live chat room stays available even after the watch party ends, creating a persistent space for the community around that viewing session.

## Key Features

- **Real-time synchronization** — Video playback stays in sync across all viewers, no manual coordination needed
- **Live chat** — Built on PartyKit for seamless, real-time messaging during watch parties
- **Persistent rooms** — Chat history is saved, so the community can continue discussing after the episode ends
- **Simple join flow** — Share a room code, join, sync, watch

## Tech Stack

- **Frontend**: React + TypeScript, Vite for fast development
- **Real-time**: PartyKit for WebSocket-based chat and synchronization
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase for persistent room data
- **Deployment**: Vercel

## Why This Matters

Most watch party tools solve the chat problem OR the sync problem. This bridges both, using PartyKit's durable rooms to make chat persistence a first-class feature instead of an afterthought. The architecture means chat rooms outlive individual viewing sessions.

## Local Development

```bash
pnpm install
pnpm dev
```

Then visit `http://localhost:5173`

## Deployment

Deployed at [anime-sync-circle.vercel.app](https://anime-sync-circle.vercel.app)

## What I Learned

- **PartyKit for persistence**: Using a WebSocket-backed room server to maintain chat state across client reconnections
- **Sync algorithm**: Keeping video playback within tolerance windows instead of frame-perfect sync, which is more practical and user-friendly
- **Real-time UX**: How to handle network latency gracefully in a synchronized experience