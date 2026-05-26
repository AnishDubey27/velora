# Velora

**AI-powered finance research platform** — a web app that delivers real-time market intelligence, AI-driven analysis skills, portfolio tracking, and curated headlines.
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

## DevOps & Production Infrastructure

Velora is engineered for enterprise-grade stability, automated delivery, and low-footprint operations. The entire infrastructure is designed to run efficiently on resource-constrained environments (such as a 1GB RAM VM).

### Architecture & Pipeline Overview

```mermaid
graph TD
    Developer[Developer] -->|git push| GitHub[GitHub Repository]
    
    subgraph CI/CD (GitHub Actions)
        GitHub --> Workflow[Production Pipeline]
        Workflow --> Scan[Trivy Security Scan]
        Scan -->|No Criticals| Build[Multi-Stage Build & Cache]
        Build --> Push[Push to GHCR]
    end
    
    subgraph Target Host (Always-Free 1GB VM)
        GHCR[GitHub Container Registry] -->|Polls & Pulls| Watchtower[Watchtower Container]
        Watchtower -->|Auto-Recreate| Velora[Velora Standalone App]
        Velora -->|700MB Hard Limit| VM[Docker Runtime]
    end
    
    Push -->|latest tag| GHCR
```

### Core DevOps Features

1. **GitOps & Continuous Delivery (CD)**
   - **GitHub Actions Integration**: Commits to `main` trigger a full pipeline run.
   - **GitHub Container Registry (GHCR)**: Images are automatically compiled and published to `ghcr.io/anishdubey27/velora:latest` with built-in caching (`type=gha`) for ultra-fast build times.
   - **Instant SSH Deployment**: The pipeline securely connects to the Oracle Cloud VPS via SSH and immediately triggers a zero-downtime rolling update via Docker Compose, completely eliminating polling delays.

2. **Automated Security Guardrails**
   - **Trivy Vulnerability Scanning**: Integrated directly into the CI/CD workflow. The pipeline runs a security scan against the container image's OS packages and libraries and **blocks/fails** if any `CRITICAL` vulnerability is detected.

3. **Ultra-Lean Containerization**
   - **Multi-Stage builds**: Implements a 3-stage `Dockerfile` (`deps` -> `builder` -> `runner`) utilizing a slim `node:22-alpine` base.
   - **Next.js Standalone Mode**: Configured to export Next.js in `standalone` output mode. This strips away `node_modules` and files that are not strictly necessary for production, reducing the runtime bundle to a fraction of its normal size.
   - **Security Hardening**: The runner image drops root privileges, executing the application under a custom system user and group (`nextjs:nodejs`).

4. **Resource & Memory Optimization**
   - **Hard Limits**: Enforced `memory: 700M` limitation at the orchestrator layer (Docker Compose) to guarantee the host VM's kernel remains stable.
   - **Dynamic Runtime Config**: A custom runtime helper (`lib/env.ts`) bypasses Next.js 15's static compiler env-inlining, allowing secrets and host-specific parameters to be injected purely at container start via the environment.

---

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

### 5. Production Deployment (Docker Compose)

1. **Configure Environment File**:
   Create a `.env` file in the root directory:
   ```env
   # Database & Auth
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   
   # Secrets & APIs
   NVIDIA_API_KEY=your_nvidia_api_key
   MARKETAUX_API_KEY=your_marketaux_api_key
   FINNHUB_API_KEY=your_finnhub_api_key
   BRAVE_SEARCH_API_KEY=your_brave_search_api_key
   ```

2. **Run the stack**:
   ```bash
   docker compose up -d
   ```
   This will pull the pre-built image from GHCR and apply the 700MB memory restriction. Future updates will be pushed automatically via GitHub Actions SSH deployment!

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
