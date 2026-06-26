# 10 projets end-to-end — montée en compétence (AWS · Azure · GCP)

Chaque projet : **déployé en vrai**, repo propre, README avec captures, et il *mérite*
un morceau du titre Forward Deployed / Cloud / Architect. Suivi dans JobPilot (`jp_skill_projects`).

| # | Projet | Cloud | Compétence prouvée | Sert le titre |
|---|---|---|---|---|
| 1 | **JobPilot** (cette plateforme) | Vercel + Supabase | Full-stack, APIs, ingestion data, MCP | FDE / Solutions |
| 2 | **Pipeline batch France Travail -> Lakehouse** | AWS (S3, Glue, Athena) | ETL, data lake, Terraform | Data / Platform |
| 3 | **Streaming temps réel** (events -> Kafka -> dashboard) | GCP (Pub/Sub, Dataflow, BigQuery) | Streaming, event-driven | Data Eng |
| 4 | **Serveur MCP "JobMarket"** (outils/API exposés à un LLM) | Cloud Run / Vercel | MCP, API design, intégration IA | FDE / moderne |
| 5 | **Modern Data Stack** (ELT dbt + Snowflake + orchestration) | Azure + Snowflake | dbt, modélisation, ELT | Analytics Eng |
| 6 | **Infra as Code multi-cloud** (modules Terraform réutilisables) | AWS + GCP | Terraform, DevOps, cloud archi | Cloud Architect |
| 7 | **Microservice API-first** (FastAPI + CI/CD + monitoring) | AWS (ECS/Lambda) | API, conteneurs, observabilité | FDE / Platform |
| 8 | **Data quality & contracts** (Great Expectations + alerting) | GCP | Qualité data, fiabilité | Data Platform |
| 9 | **FinOps dashboard** (billing multi-cloud -> viz) | Azure | FinOps, monitoring coûts | Architect |
| 10 | **Capstone** : assistant data conversationnel (MCP + RAG léger) | au choix | Intégration data + IA via API/MCP | FDE / IA |

## Ordre conseillé
**1 (en cours) -> 4 (MCP, différenciant) -> 2 -> 3 -> 6**, avec la **cert AWS Solutions Architect Associate (SAA)** en parallèle.
Les 4 premiers suffisent déjà à transformer le GitHub.

## Règle d'or
Pas de "beau README sans exécution". Chaque projet doit avoir : commits réels étalés,
URL live, tests, captures. C'est ce qui rend le profil **défendable** en entretien.
