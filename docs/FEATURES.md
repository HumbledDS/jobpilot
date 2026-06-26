# Feature roadmap — JobPilot

Statuts : ⬜ à faire · 🟦 en cours · ✅ fait

## Phase 0 — Fondations ✅
- ✅ Scaffold Next.js 15 + TS + Tailwind
- ✅ Schéma Supabase (tables `jp_*` + RLS) appliqué
- ✅ Clients Supabase (browser / server / middleware)
- ⬜ Auth (login email magic link) + page protégée
- ⬜ Types TypeScript générés depuis la base

## Phase 1 — Le cœur (MVP utilisable)
- ⬜ **Dashboard** : compteurs (candidatures par statut), prochaines actions, funnel
- ⬜ **Kanban candidatures** : drag & drop entre statuts, fiche candidature
- ⬜ **Saisie manuelle** d'une offre + création candidature en 1 clic
- ⬜ **Contacts** : ajout recruteur lié à une entreprise / candidature
- ⬜ **Timeline** (`jp_activities`) : relances, emails, entretiens

## Phase 2 — Ingestion automatique d'offres
- ⬜ Connecteur **France Travail** (OAuth client_credentials)
- ⬜ Connecteur **Adzuna**
- ⬜ Route `/api/ingest` (idempotente) + **Vercel Cron** quotidien
- ⬜ **Jobs board** : recherche, filtres (techno, salaire ≥ 50 k€, localisation IDF, télétravail)
- ⬜ Recherches sauvegardées (`jp_saved_searches`)
- ⬜ "Postuler" : transforme une offre en candidature

## Phase 3 — Documents (versioning CV & lettres)
- ⬜ **CV versions** : upload/stocke (Supabase Storage), tag par rôle cible, version active
- ⬜ **Lettres de motivation** : éditeur + versions + ton
- ⬜ Lier la bonne version de CV/lettre à chaque candidature
- ⬜ (option) Génération assistée de lettre par offre

## Phase 4 — Stats & pilotage
- ⬜ Taux de réponse / d'entretien, délais moyens, stats par source & par techno
- ⬜ Objectif de cadence hebdo (ex : 10 candidatures qualifiées/semaine) + suivi
- ⬜ Export CSV

## Phase 5 — Skill-up & MCP
- ⬜ **Tracker des 10 projets** (`jp_skill_projects`) : statut, repo, URL déployée
- ⬜ **Serveur MCP** au-dessus de la base (recherche d'offres / candidatures via LLM) → projet portfolio #4

## Idées backlog
- Rappels de relance (email via Resend / cron)
- Détection de doublons d'offres multi-sources
- Scoring de matching offre ↔ profil
- Mode "Forward Deployed" : générer un mini-POC adapté à l'entreprise ciblée
