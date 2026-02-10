# SilverTrack

## Overview

SilverTrack is a live silver price tracking web application. It scrapes silver (XAG) prices from external APIs every 5 minutes, stores them in a PostgreSQL database, and displays a real-time dashboard with price charts and metrics. The primary display value is the silver price in Indian Rupees (INR) per gram, with USD pricing also tracked.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a single-repo layout with three main directories:
- **`client/`** — React frontend (SPA)
- **`server/`** — Express backend (API + scraper)
- **`shared/`** — Code shared between frontend and backend (database schema, API route definitions)

### Frontend
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query with automatic polling (`refetchInterval`) to keep data fresh
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (silver/platinum inspired palette)
- **Charts**: Recharts (AreaChart) for the price trend line
- **Animations**: Framer Motion for smooth transitions
- **Date Formatting**: date-fns
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express.js running on Node with TypeScript (via tsx)
- **Price Scraping**: Server-side scheduled task using `axios` to fetch data from `goldprice.org` APIs every 5 minutes. It pulls XAG (silver) prices in both USD and INR, converts from troy ounce to grams, and stores results.
- **API Endpoints**:
  - `GET /api/prices` — Returns latest 12 price records (for chart)
  - `GET /api/prices/latest` — Returns the single most recent price
- **Development**: Vite dev server is used as middleware for HMR during development
- **Production**: Client is built to `dist/public/`, server is bundled with esbuild to `dist/index.cjs`

### Database
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation
- **Schema** (in `shared/schema.ts`):
  - `silver_prices` table:
    - `id` — serial primary key
    - `price_usd` — decimal, silver price in USD per gram
    - `price_inr` — decimal, silver price in INR per gram
    - `timestamp` — timestamp, defaults to now
- **Migrations**: Use `drizzle-kit push` (`npm run db:push`) to sync schema to database
- **Connection**: Uses `pg.Pool` from the `pg` package

### Shared Code
- `shared/schema.ts` — Drizzle table definitions and Zod insert schemas
- `shared/routes.ts` — API route contracts (paths, methods, Zod response schemas) used by both frontend and backend for type safety

### Build & Deploy
- `npm run dev` — Starts development server with Vite HMR
- `npm run build` — Builds client with Vite, bundles server with esbuild
- `npm run start` — Runs production build
- `npm run db:push` — Pushes Drizzle schema to PostgreSQL

## External Dependencies

### Database
- **PostgreSQL** — Required. Connection string must be set in `DATABASE_URL` environment variable. Uses `connect-pg-simple` for session store capability and `pg` for the connection pool.

### External APIs
- **goldprice.org** — Two endpoints are used for price data:
  - `https://data-asg.goldprice.org/dbXRates/USD` — Silver price (XAG) in USD per troy ounce
  - `https://data-asg.goldprice.org/dbXRates/INR` — Silver price (XAG) in INR per troy ounce
  - Requests include browser-like User-Agent and Referer headers to avoid blocking

### Key NPM Packages
- **recharts** — Chart rendering
- **framer-motion** — Animations
- **date-fns** — Date formatting
- **axios** — HTTP client for scraping
- **drizzle-orm / drizzle-kit / drizzle-zod** — Database ORM and schema management
- **zod** — Runtime type validation
- **shadcn/ui ecosystem** — Radix UI primitives, class-variance-authority, tailwind-merge, clsx
- **wouter** — Client-side routing
- **@tanstack/react-query** — Server state management with polling