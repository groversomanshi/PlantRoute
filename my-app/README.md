# PlantRoute — AI-powered sustainable travel

Build travel itineraries with carbon impact. Pick a destination on the map, describe what you love, and get a full trip with emissions for every item.

## Setup

1. **Clone and install**
   ```bash
   cd my-app
   npm install
   ```

2. **Environment variables**  
   Copy `.env.example` to `.env.local` and fill in:

   - **NEXT_PUBLIC_MAPBOX_TOKEN** — [Mapbox](https://www.mapbox.com/) token for the world map. If omitted, the app falls back to Leaflet + OpenStreetMap.
   - **AMADEUS_API_KEY** / **AMADEUS_API_SECRET** — [Amadeus](https://developers.amadeus.com/) API credentials for activities, hotels, and flights. If omitted, mock data is used.
   - **GEMINI_API_KEY** — [Google AI](https://ai.google.dev/) for parsing free-text preferences. If omitted, a keyword-based fallback is used.
   - **SUPERMEMORY_API_KEY** — [Supermemory](https://supermemory.ai/) for saving/retrieving user preferences and trip history. Required for profile and save-preferences flows.
   - **MODAL_TOKEN** — Optional. If set, carbon calculation is done via Modal; otherwise a local TypeScript carbon predictor runs.
   - **NEXTAUTH_SECRET** — Run `openssl rand -base64 32` to generate.
   - **GOOGLE_CLIENT_ID** / **GOOGLE_CLIENT_SECRET** — [Google OAuth](https://console.cloud.google.com/) for sign-in.
   - **UPSTASH_REDIS_REST_URL** / **UPSTASH_REDIS_REST_TOKEN** — Optional; for production rate limiting. If omitted, in-memory rate limiting is used (single instance only).
   - **RATE_LIMIT_ENABLED** — Set to `true` to enable rate limiting (default).

3. **Run locally**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Modal (optional)**  
   To run the Python carbon predictor on Modal:
   ```bash
   pip install modal
   modal token set
   modal deploy modal/carbon_predictor.py
   ```
   Set `MODAL_TOKEN` and, if needed, `MODAL_CARBON_URL` to your Modal function URL.

## Deploy

- **Vercel**: Connect the repo and set env vars in the dashboard. Ensure server-side keys (Amadeus, Gemini, Supermemory, NextAuth, etc.) are not exposed to the client.
- **Security**: All `/api/*` routes send `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers. API keys are read in route handlers only (no `NEXT_PUBLIC_` for secrets).

## Project structure

- `src/app` — App Router pages (map, itinerary detail, profile, sign-in).
- `src/app/api` — API routes: parse preferences, carbon, Amadeus (activities/hotels/flights), Supermemory (save/retrieve).
- `src/components` — Map (WorldMap, CityModal), Itinerary (builder, cards), UI (CarbonBadge, RegretModal, etc.).
- `src/lib` — Utilities: carbon (local predictor), haversine, itinerary-builder, interest-scorer, Amadeus/Gemini/Supermemory wrappers, validation, rate limiting.
- `src/types` — Shared TypeScript types.
- `modal` — Modal Python app for carbon prediction (optional).

## Features

- **Map** — Zoomable world map (Mapbox or Leaflet). Click a city to see top activities and start building an itinerary.
- **Itinerary builder** — Four steps: dates → preferences (free text, parsed by AI) → build → choose one of three options (best match, low carbon, premium).
- **Carbon** — Every item has a CO₂e value; green/amber/red badges; “Find a lower-carbon version” with side-by-side comparison.
- **Profile** — Save preferences and view past trips (requires sign-in with Google).
