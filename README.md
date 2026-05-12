# Velora

**AI-powered finance research platform** — a mobile-first web app that delivers real-time market intelligence, AI-driven analysis skills, portfolio tracking, and curated headlines. Inspired by [Barebone.ai](https://barebone.ai), rebuilt as a responsive web experience under the name **Velora**.

## Features

### 🔬 Research
- AI chat interface powered by **NVIDIA NIM** (Gemma, Mistral, LLaMA, Nemotron)
- **Smart Skills** — contextual analysis prompts ranked by today's market headlines
- Skills include: company analysis, buy/sell timing, earnings breakdowns, macro watch, stock comparisons, sentiment scanning, and news-to-trade ideas

### 📊 Dashboard
- **Fear & Greed Index** — live from CNN Business (crypto fallback via Alternative.me)
- **VIX** — sourced from FRED / Finnhub
- **Market Indicators** — S&P 500 (Finnhub) and Bitcoin (Coinbase Exchange)
- **Market Summary & Trends** — derived dynamically from live news keywords
- **Early Signals** — analyst price targets and recommendations from Finnhub
- **Upcoming Events** — economic calendar and earnings schedule from Finnhub

### 📰 Headlines
- Real-time financial news via **MarketAux API**
- Filterable by region: United States, India, Crypto
- Importance filters: All / Important / Critical
- Clickable links to original sources

### 💼 Portfolio
- Authenticated via **Supabase** (email/password)
- Holdings stored in Supabase Postgres with full CRUD
- **Live quotes** from Finnhub for real-time portfolio valuation
- Animated portfolio value reveal with pie chart allocation
- **Portfolio Pulse** — computed Volatility, Sharpe Ratio, Beta, and AI Risk Score
- Ticker autocomplete from a curated local index
- Swipeable card UI (holdings ↔ pulse metrics)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion |
| Charts | Recharts |
| Auth & DB | Supabase (Auth + Postgres) |
| AI | NVIDIA NIM API |
| News | MarketAux API |
| Market Data | Finnhub, Coinbase Exchange, CNN, FRED |
| Search | Brave Search API |
| PWA | Service Worker + Web App Manifest |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NVIDIA NIM (AI)
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_DEFAULT_MODEL=google/gemma-3n-e4b-it  # optional, defaults to first allowed model

# MarketAux (News)
MARKETAUX_API_KEY=your_marketaux_api_key

# Finnhub (Market Data)
FINNHUB_API_KEY=your_finnhub_api_key

# Brave Search
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on desktop or a mobile browser.

### 4. Supabase setup

Create a `holdings` table in your Supabase project:

```sql
create table holdings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  symbol text not null,
  name text not null,
  shares numeric not null,
  purchase_price numeric not null,
  created_at timestamptz default now()
);

alter table holdings enable row level security;

create policy "Users manage own holdings"
  on holdings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## API Routes

| Route | Source | Purpose |
|---|---|---|
| `GET /api/news` | MarketAux | Financial news by region |
| `GET /api/fear-greed` | CNN / Alternative.me | Fear & Greed Index |
| `GET /api/vix` | FRED / Finnhub | VIX volatility index |
| `GET /api/portfolio` | Finnhub | Live stock quotes |
| `GET /api/skills` | MarketAux (headlines) | Dynamically ranked skill cards |
| `GET /api/dashboard/indicators` | Finnhub / Coinbase | S&P 500 + Bitcoin prices |
| `GET /api/dashboard/signals` | Finnhub | Analyst targets & recommendations |
| `GET /api/dashboard/events` | Finnhub | Economic & earnings calendar |
| `POST /api/ai` | NVIDIA NIM | AI chat completions |

## License

Private — All rights reserved.
