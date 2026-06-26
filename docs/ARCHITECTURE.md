# Architecture — JobPilot

## Vue d'ensemble
```
                ┌──────────────────────┐
 France Travail │  Vercel Cron (daily) │  <- ingestion planifiée
   Adzuna API ─▶│  /api/ingest         │
                └─────────┬────────────┘
                          │ upsert
                          ▼
        ┌──────────────────────────────────┐
        │  Supabase Postgres  (tables jp_*) │  RLS owner = auth.uid()
        │  jobs · applications · contacts   │
        │  companies · activities           │
        │  cv_versions · cover_letters      │
        │  skill_projects · saved_searches  │
        └─────────┬───────────────┬─────────┘
                  │               │
     Supabase Auth│               │ PostgREST / supabase-js
                  ▼               ▼
        ┌──────────────────────────────────┐
        │      Next.js 15 (App Router)      │  Vercel
        │  Dashboard · Jobs · Kanban ·      │
        │  Contacts · Documents · Skill-up  │
        └──────────────────────────────────┘
```

## Choix techniques
- **Tables `jp_` dans `public`** : cohabitation sans collision avec l'app existante
  "Tailor CV Resume" du même projet Supabase, sans toucher à la config PostgREST.
- **RLS partout** : chaque table filtre par `user_id = auth.uid()` (mono-utilisateur aujourd'hui,
  multi-utilisateur possible sans refonte).
- **Server Components + Server Actions** pour les mutations (clé service jamais exposée au client).
- **Ingestion idempotente** : `unique (user_id, source, external_id)` + upsert.

## Modèle de données (résumé)
- `jp_companies` — entreprises ciblées.
- `jp_jobs` — offres ingérées (source, salaire, url, tags, raw jsonb).
- `jp_applications` — candidatures (statut Kanban, CV/lettre liés, prochaine action).
- `jp_contacts` — interlocuteurs/recruteurs.
- `jp_activities` — timeline d'une candidature (relances, emails, entretiens).
- `jp_cv_versions` / `jp_cover_letters` — versioning des documents.
- `jp_skill_projects` — suivi des 10 projets.
- `jp_saved_searches` — recherches sauvegardées.

## Sécurité & conformité
- Sources d'offres **légales via API** uniquement (France Travail, Adzuna). Pas de scraping LinkedIn (ToS).
- Secrets côté serveur (`SUPABASE_SERVICE_ROLE_KEY`, clés API) jamais dans le bundle client.
- Endpoint d'ingestion protégé par `INGEST_CRON_SECRET`.

## Bonus positionnement
Un **serveur MCP** sera exposé au-dessus de la base (projet #4 de la roadmap) : JobPilot
devient une démo vivante de la fibre Forward Deployed / intégration API-MCP.
