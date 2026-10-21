# Contributing to Velora

Thank you for your interest in contributing to **Velora**! We welcome contributions from developers, quantitative analysts, and financial researchers across the globe. Together, we are building a modern, open-source financial intelligence platform and market research engine.

This document outlines our development workflow, coding standards, pull request expectations, and community guidelines.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Issues & Bugs](#reporting-issues--bugs)
  - [Suggesting Features & Enhancements](#suggesting-features--enhancements)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Workflow](#development-workflow)
  - [Prerequisites](#prerequisites)
  - [Branching Conventions](#branching-conventions)
  - [Local Environment Setup](#local-environment-setup)
  - [Quality & Verification Commands](#quality--verification-commands)
- [Coding Guidelines & Architectural Standards](#coding-guidelines--architectural-standards)
- [Maintainer & Community](#maintainer--community)

---

## Code of Conduct

We are dedicated to providing a welcoming, inclusive, and harassment-free experience for everyone, regardless of background, identity, or level of experience.

- **Be respectful and constructive**: Value diverse viewpoints, offer thoughtful feedback, and approach collaboration with empathy.
- **Uphold integrity**: Ensure accurate data sourcing, transparent methodologies, and secure handling of financial intelligence feeds.
- **Zero tolerance for harassment**: Hostile, demeaning, or abusive behavior will not be tolerated in issues, pull requests, or community discussions.

---

## How to Contribute

### Reporting Issues & Bugs

Before creating a new issue, search existing [GitHub Issues](https://github.com/anishdubey27/velora/issues) to verify if the problem has already been reported.

When filing a bug report, include:
1. **Clear title**: Concise description of the issue.
2. **Environment details**: Operating system, browser, Node.js version, and deployment type (local dev, Docker, or live deployment).
3. **Steps to reproduce**: Exact steps to trigger the bug.
4. **Expected vs. actual behavior**: What you anticipated vs. what occurred.
5. **Logs & Screenshots**: Relevant terminal outputs, browser console errors, or network payloads (ensure no API keys are visible).

### Suggesting Features & Enhancements

We welcome suggestions for new data connectors, financial skill prompts, visual charts, or architectural optimizations:
- Open a GitHub Issue using the `enhancement` tag.
- Outline the user persona, use case, proposed implementation, and potential dependencies.

---

## Development Workflow

### Prerequisites

Ensure you have the following installed locally:
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher
- **Git**: `v2.40+`
- **Docker & Docker Compose** *(optional, for containerized workflows)*

### Branching Conventions

We follow a structured branching convention. Create a dedicated branch off `main` for each feature or bug fix:

| Branch Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New features, analysis skills, or integrations | `feat/sec-10k-transcript-parser` |
| `fix/` | Bug fixes and reliability patches | `fix/mobile-touch-drawer-freeze` |
| `perf/` | Latency, bundle size, or query optimizations | `perf/memoize-heatmap-aggregations` |
| `docs/` | Documentation improvements | `docs/update-docker-quickstart` |
| `test/` | Unit, integration, or benchmark tests | `test/add-vix-endpoint-contract-tests` |
| `refactor/` | Code structure improvements without behavior change | `refactor/streamline-supabase-client` |
| `ci/` | GitHub Actions workflow modifications | `ci/add-automated-pr-linter` |

```bash
# Example: create a new feature branch
git checkout -b feat/tavily-deep-research
```

### Local Environment Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/velora.git
   cd velora
   ```

2. **Configure environment variables**:
   Copy the provided `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Populate the required credentials (such as Supabase, Finnhub, and NVIDIA NIM keys) in `.env.local`.

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Launch the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:9999](http://localhost:9999) (or your configured port) in your browser.

### Quality & Verification Commands

Before committing or opening a pull request, run all verification scripts locally:

```bash
# 1. Run ESLint checks
npm run lint

# 2. Verify TypeScript types and production build
npm run build
```

---

## Submitting Pull Requests

1. **Commit Messages**: Write meaningful, conventional commit messages:
   - `feat(skills): add super-investor 13F filing synthesis`
   - `fix(sw): implement network-first caching for HTML navigation`
   - `docs(readme): add architecture diagram and benchmark notes`
2. **Atomic Commits**: Keep pull requests focused on a single responsibility. Large, multi-faceted changes should be split into smaller, reviewable PRs.
3. **PR Description**: Include:
   - A summary of changes introduced.
   - Reference to the corresponding issue (e.g., `Resolves #42`).
   - Screenshots or GIFs for UI/UX modifications.
   - Confirmation that `npm run lint` and `npm run build` pass without warnings.
4. **CI Compliance**: All PRs must pass the GitHub Actions CI pipeline (`.github/workflows/ci.yml`) before merging.

---

## Coding Guidelines & Architectural Standards

1. **Strict TypeScript**: Avoid `any`. Define explicit interfaces and return types for financial data structures and API payloads.
2. **Next.js App Router Paradigms**:
   - Prefer Server Components for data fetching where feasible.
   - Explicitly annotate client-interactive modules with `'use client'`.
   - Keep client bundle sizes minimal by avoiding large client-side imports.
3. **Data Integrity & Zero Mock Fallbacks**:
   - Velora is an authentic market intelligence platform. Do not inject artificial, hardcoded, or random fallback numbers when third-party APIs fail.
   - Handle API outages with transparent error states, skeleton loaders, or clear fallback banners.
4. **Resilient Network & Service Worker Policies**:
   - Ensure service workers never intercept or cache dynamic financial `/api/*` endpoints.
   - Navigation requests must always follow a Network-First strategy to prevent client-side chunk mismatch crashes.
5. **Security & Secrets Hygiene**:
   - Never commit sensitive API credentials, private keys, or `.env.local` files to Git.
   - Run security checks locally to prevent dependency vulnerabilities.

---

## Maintainer & Community

Velora is maintained by **Anish Dubey** ([@AnishDubey27](https://github.com/AnishDubey27)).

For major RFCs, partnerships, or vulnerability disclosures, please open an issue or connect directly through GitHub.
