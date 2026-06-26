# JobPilot 🛫 — Career Control Center

**JobPilot** is a personal control center to run a modern tech job search end-to-end:
ingest job offers from legal APIs, track applications through a pipeline, manage
recruiter contacts, version CVs & cover letters, and measure the whole funnel — plus a
skill-up tracker to grow toward Forward Deployed / Cloud Architect roles.

> Built as a real, deployed product (not a tutorial): it doubles as a portfolio piece
> demonstrating full-stack + data + cloud-native engineering.

## Stack
- **Next.js 15** (App Router, TypeScript, Tailwind)
- **Supabase** (Postgres + Auth + Row Level Security) — tables prefixed `jp_`
- **Vercel** (hosting + Cron for scheduled ingestion)
- Job sources via **legal APIs**: France Travail (ex-Pôle Emploi) & Adzuna — *no LinkedIn scraping*

## Core modules
| Module | What it does |
|---|---|
| 📥 Offers ingestion | Pull data/cloud/AI offers (IDF, ≥ 50 k€) from France Travail & Adzuna into Postgres |
| 🔎 Jobs board | Browse / search / filter ingested offers, save searches |
| 🗂️ Applications (Kanban) | À postuler → Postulé → Relance → Entretien → Offre / Refus |
| 👤 Contacts | Recruiters & interlocutors per company / application |
| 🧾 Documents | Version CVs & cover letters, link the right version to each application |
| 📊 Dashboard | Funnel, response rate, per-source stats, weekly cadence |
| 🚀 Skill-up | Track the 10 end-to-end projects (repo + live URL + status) |

## Getting started
```bash
npm install
cp .env.example .env.local   # fill Supabase + API keys
npm run dev                  # http://localhost:3000
```

## Database
Schema lives in [`supabase/migrations/0001_jobpilot_init.sql`](supabase/migrations/0001_jobpilot_init.sql).
All `jp_*` tables are RLS-protected (owner = `auth.uid()`).

## Docs
- [Architecture](docs/ARCHITECTURE.md)
- [Feature roadmap](docs/FEATURES.md)
- [10 end-to-end projects](docs/ROADMAP.md)

---
Made by [Babacar Gueye](https://www.linkedin.com/in/babacargueye1/) · [GitHub](https://github.com/humbledDS)
