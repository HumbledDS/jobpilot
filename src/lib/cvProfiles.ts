// Positionnements de CV : un même parcours (cf. CV_BabacarGueye.pdf) raconté
// sous 4 angles métier. Data Engineer = référence (70 % des candidatures) ;
// Quant, Commercial Tech et Gestion de patrimoine = variantes stratégiques.

export type CvExperience = {
  company: string;
  role: string;
  period: string;
  bullets: string[];
  stack?: string;
};

export type CvProfile = {
  id: string;
  tab: string; // libellé d'onglet court
  share: string; // part des candidatures
  title: string; // titre professionnel (haut du CV)
  angle: string; // positionnement en une ligne
  summary: string; // résumé de profil
  skills: string[]; // compétences clés attendues
  ats: string[]; // mots-clés ATS à faire ressortir
  experiences: CvExperience[];
  education: string[];
  targets: string[]; // entreprises ciblées
  salary: string;
};

// Coordonnées communes à toutes les versions (cf. CV de référence).
export const CV_CONTACT = {
  name: "Babacar Gueye",
  phone: "06 79 81 97 72",
  email: "babacar.work2024@gmail.com",
  location: "Île-de-France · Mobilité nationale",
  linkedin: "linkedin.com/in/babacargueye1",
  github: "github.com/humbledDS",
  experience: "3 ans d'expérience",
  languages: "Français (courant) · Anglais (courant) · Espagnol (notions)",
  interests: "Tech & IA · Finance · Permis B",
};

// Formation (constante — reformulée par angle quand c'est utile).
const EDU_BASE = [
  "Université de Montpellier — Spécialisation Big Data, Data Science & Analyse des risques (Mention Très Bien) · 2023",
  "Université de Caen — Master 2 Statistiques Appliquées & Analyse Décisionnelle · 2023",
  "Université de Caen — Licence 3 Mathématiques Appliquées + Licence 3 Informatique · 2021",
];

export const CV_PROFILES: CvProfile[] = [
  // ── 1. DATA ENGINEER (référence) ──────────────────────────────────────
  {
    id: "data",
    tab: "Data Engineer",
    share: "70 %",
    title: "Data Engineer — Databricks · PySpark · Snowflake · AWS / Azure",
    angle: "Le CV socle. Objectif : décrocher rapidement un CDI Data / Cloud / MLOps à 55–65 k€.",
    summary:
      "Data Engineer spécialisé dans la conception de plateformes de données cloud et de pipelines ELT industrialisés. Databricks, PySpark, Snowflake, dbt et Airflow pour des architectures Lakehouse sur AWS, Azure et GCP. Infrastructure as code (Terraform), CI/CD et bonnes pratiques de qualité, sécurité et gouvernance des données.",
    skills: [
      "Databricks", "PySpark", "Snowflake", "dbt", "Airflow", "Python", "SQL",
      "AWS", "Azure", "GCP", "Terraform", "Docker", "GitHub Actions", "Delta Lake",
    ],
    ats: [
      "Data Engineer", "Data Platform", "ELT", "ETL", "Lakehouse", "Spark",
      "Data Warehouse", "Airflow", "dbt", "Snowflake", "Databricks", "CI/CD",
      "Infrastructure as Code", "Data Quality", "Cloud",
    ],
    experiences: [
      {
        company: "Jedy Formation",
        role: "Formateur AI, Machine Learning & Data Engineering · Référent technique",
        period: "09/2025 – 07/2026",
        bullets: [
          "Conception et animation de formations sur Databricks, PySpark, Snowflake, Airflow, dbt et les architectures Lakehouse.",
          "Accompagnement de projets industriels : modélisation dimensionnelle, pipelines ETL/ELT, orchestration, CI/CD et déploiement.",
          "AdTech & Programmatique : Data Clean Rooms, SQL analytique, analyse de performance des campagnes.",
          "Référent technique : validation d'architectures, revues de code, qualité des pipelines, encadrement et soutenances de Master 2.",
        ],
        stack: "Databricks · PySpark · Snowflake · dbt · Airflow · Python · SQL · AWS · Terraform",
      },
      {
        company: "tailored-cv.com (Freelance)",
        role: "Data Engineer · plateforme IA de CV sur mesure",
        period: "01/2026 – 05/2026",
        bullets: [
          "Développement d'un pipeline ELT industrialisé compatible BigQuery et Databricks Lakehouse, transformations dbt et orchestration Airflow.",
          "Conception d'un framework mutualisant les modèles dbt entre BigQuery et Databricks.",
          "Tests de qualité de données (dbt tests), validation des flux et réconciliation automatisée.",
        ],
        stack: "dbt · Airflow · BigQuery · Terraform · Python · GCP · GitHub Actions",
      },
      {
        company: "Collablib (Freelance)",
        role: "Data Engineer · SaaS de mise en relation créateurs & marques",
        period: "05/2025 – Aujourd'hui",
        bullets: [
          "Conception du modèle de données PostgreSQL et architecture orientée événements pour le suivi des interactions.",
          "Pipelines de scoring des créateurs et d'analyse des performances de campagnes.",
          "Data warehouse analytique (schéma en étoile) pour le reporting métier ; déploiements via Docker, GitHub Actions, Vercel.",
        ],
        stack: "Next.js · TypeScript · Supabase (PostgreSQL) · Python · Docker · GitHub Actions · Vercel",
      },
      {
        company: "Freelance",
        role: "Data & AI Engineer · pré due-diligence financière automatisée",
        period: "10/2024 – 05/2025",
        bullets: [
          "Architecture Data Lake AWS (S3, Glue Catalog, Lambda) pour centraliser les données financières.",
          "Pipelines Spark d'enrichissement et de traitement, orchestrés avec Airflow.",
          "Moteur de scoring financier alimentant une interface temps réel ; –60 % de temps d'analyse via l'automatisation.",
        ],
        stack: "Databricks · PySpark · Snowflake · dbt · Airflow · Python · SQL · AWS · Terraform",
      },
      {
        company: "Orange Business Services",
        role: "Data Scientist / Data Engineer · Stage de fin d'études",
        period: "11/2022 – 05/2023",
        bullets: [
          "Pipelines ETL AWS (S3, Glue, Redshift) pour consolider la donnée client B2B.",
          "Optimisation des traitements SQL et Spark pour réduire les temps d'exécution.",
          "Modèle prédictif de churn sur plus de 200 000 clients, alimentant les stratégies de rétention.",
        ],
        stack: "Python · SQL · AWS (S3, Glue, Redshift) · Delta Lake · PySpark · Machine Learning",
      },
    ],
    education: EDU_BASE,
    targets: [
      "Doctolib", "Back Market", "Qonto", "Alan", "Datadog", "OVHcloud",
      "Decathlon Digital", "Michelin", "Société Générale", "BNP Paribas", "Capgemini (produit)",
    ],
    salary: "55–65 k€ à l'embauche · CDI",
  },

  // ── 2. QUANT FINANCE ──────────────────────────────────────────────────
  {
    id: "quant",
    tab: "Quant Finance",
    share: "20 %",
    title: "Quantitative Developer — Python · Statistics · Machine Learning · Financial Data",
    angle:
      "Banques d'investissement, sociétés de trading, négoce de matières premières. Même parcours, angle quantitatif. Une seule offre peut représenter un saut de rémunération majeur.",
    summary:
      "Développeur quantitatif issu d'un Master 2 de statistiques appliquées (probabilités, séries temporelles, optimisation). Conception de modèles statistiques et d'algorithmes de scoring sur données financières à grande échelle. Python scientifique (NumPy, Pandas, SciPy, Scikit-Learn), SQL performant et pipelines analytiques industrialisés.",
    skills: [
      "Python", "NumPy", "Pandas", "SciPy", "Scikit-Learn", "Statistics",
      "Probability", "Linear Algebra", "Optimization", "Time Series",
      "Machine Learning", "SQL", "Git", "Linux", "Docker",
    ],
    ats: [
      "Quantitative Developer", "Quantitative Analyst", "Statistical Modeling",
      "Time Series", "Probability", "Optimization", "Monte Carlo", "Python",
      "Machine Learning", "Risk", "Financial Data", "Pandas", "NumPy", "SQL",
    ],
    experiences: [
      {
        company: "Jedy Formation",
        role: "Instructor · Statistics, Machine Learning & Python",
        period: "09/2025 – 07/2026",
        bullets: [
          "Taught probability, statistical modeling, time series and Python to Bac+4/Bac+5 profiles.",
          "Supervised applied quantitative projects: modeling, SQL analytics, validation and code review.",
        ],
        stack: "Python · SQL · Scikit-Learn · Statistics · Time Series",
      },
      {
        company: "Collablib (Freelance)",
        role: "Data / Quant Developer · scoring models",
        period: "05/2025 – Aujourd'hui",
        bullets: [
          "Built statistical scoring models ranking creators on multi-signal performance data.",
          "Designed an event-driven data model and star-schema warehouse for analytics.",
        ],
        stack: "Python · PostgreSQL · SQL · Pandas",
      },
      {
        company: "Freelance",
        role: "Quantitative Developer · financial scoring & due diligence",
        period: "10/2024 – 05/2025",
        bullets: [
          "Built a financial scoring engine (ratios, feature engineering) feeding a real-time analytics interface.",
          "Designed data pipelines for financial-data enrichment and processing at scale.",
          "Automated the full analytical workflow, reducing analysis time by 60 %.",
        ],
        stack: "Python · PySpark · SQL · NumPy · Pandas · AWS",
      },
      {
        company: "Projet personnel · Quantitative Research",
        role: "Backtesting & systematic strategies",
        period: "2023 – 2024",
        bullets: [
          "Built a vectorized backtesting engine (NumPy/Pandas) on equity & crypto time series.",
          "Implemented mean-reversion and momentum signals, evaluated with Sharpe, max drawdown and hit-ratio.",
          "Walk-forward validation and transaction-cost modeling to control overfitting.",
        ],
        stack: "Python · NumPy · Pandas · SciPy · Matplotlib",
      },
      {
        company: "Orange Business Services",
        role: "Data Scientist · statistical modeling",
        period: "11/2022 – 05/2023",
        bullets: [
          "Developed large-scale analytical pipelines processing millions of B2B customer events.",
          "Built a predictive churn model on 200,000+ clients (classification, feature engineering, validation).",
          "Optimized SQL & Spark queries, reducing execution time by 60 %.",
        ],
        stack: "Python · Scikit-Learn · SQL · PySpark · Machine Learning",
      },
    ],
    education: [
      "Université de Caen — Master 2 Statistiques Appliquées & Analyse Décisionnelle · 2023",
      "Université de Montpellier — Big Data, Data Science & Analyse des risques (Mention Très Bien) · 2023",
      "Université de Caen — Licence 3 Mathématiques Appliquées + Licence 3 Informatique · 2021",
    ],
    targets: [
      "Jane Street", "Citadel", "IMC", "Flow Traders", "Optiver", "BNP Paribas CIB",
      "Société Générale CIB", "Natixis", "TotalEnergies Trading", "Trafigura", "Vitol", "Gunvor",
    ],
    salary: "55–90 k€ dès l'embauche",
  },

  // ── 3. COMMERCIAL B2B TECH ─────────────────────────────────────────────
  {
    id: "sales",
    tab: "Commercial Tech",
    share: "10 %",
    title: "Solutions Engineer · Technical Sales — SaaS · Cloud · Data",
    angle:
      "Tirer parti du profil technique ET de l'expérience entrepreneuriale. Les meilleurs commerciaux tech sont ceux qui comprennent réellement les produits qu'ils vendent.",
    summary:
      "Profil hybride tech & business : fondateur de plusieurs SaaS (Collablib, Tailored-CV), ingénieur data et formateur. Comprend la technologie, sait la vulgariser, la démontrer et la vendre. À l'aise sur tout le cycle : discovery technique, démonstration produit, pricing, roadmap et acquisition.",
    skills: [
      "Solution Selling", "Technical Discovery", "Business Development", "SaaS",
      "Product", "Cloud", "Demoing", "CRM", "Negotiation", "Customer Success",
      "Lead Generation", "Public Speaking", "Go-to-Market",
    ],
    ats: [
      "Solutions Engineer", "Sales Engineer", "Technical Sales", "Account Executive",
      "Business Development", "SaaS", "Solution Selling", "Customer Discovery",
      "Pipeline", "CRM", "Cloud", "Demo", "Pre-Sales", "Go-to-Market",
    ],
    experiences: [
      {
        company: "Tailored-CV",
        role: "Fondateur · Product & Pre-Sales",
        period: "01/2026 – 05/2026",
        bullets: [
          "Lancé un produit SaaS d'IA ; propriétaire du positionnement, du pricing et du discours de valeur.",
          "Conduit la discovery technique avec les early adopters et traduit les besoins en roadmap.",
        ],
      },
      {
        company: "Jedy Formation",
        role: "Formateur · Technical Enablement",
        period: "09/2025 – 07/2026",
        bullets: [
          "Présenté et vulgarisé des sujets techniques complexes (Cloud, Data, IA) auprès de 100+ profils Bac+4/5.",
          "Fort en prise de parole, démonstration et pédagogie — compétences cœur du métier de Sales Engineer.",
        ],
      },
      {
        company: "Collablib",
        role: "Fondateur · Solutions & Business Development",
        period: "05/2025 – Aujourd'hui",
        bullets: [
          "Défini le positionnement, le pricing et le go-to-market d'un SaaS de mise en relation créateurs & marques.",
          "Mené des entretiens de discovery client et construit un entonnoir d'acquisition.",
          "Piloté la roadmap produit et réalisé les démonstrations auprès des premiers utilisateurs.",
        ],
      },
      {
        company: "Freelance · Data & AI",
        role: "Consultant · valeur métier",
        period: "10/2024 – 05/2025",
        bullets: [
          "Construit un outil réduisant de 60 % le temps d'analyse financière — vendu la valeur aux analystes utilisateurs.",
          "Traduit un besoin métier en solution technique concrète et démontrable.",
        ],
      },
      {
        company: "Tasiaa",
        role: "Fondateur · Business Development & Sales",
        period: "2023 – 2024",
        bullets: [
          "Lancé un SaaS de zéro : prospection, démonstrations et closing des premiers clients.",
          "Construit le discours de vente et l'entonnoir d'acquisition (outbound + inbound).",
          "Négocié des partenariats et itéré le pricing selon les retours terrain.",
        ],
      },
    ],
    education: EDU_BASE,
    targets: [
      "Salesforce", "HubSpot", "Datadog", "Snowflake", "MongoDB", "AWS",
      "Google Cloud", "Microsoft", "Oracle", "Databricks", "Palantir",
      "OpenAI", "Anthropic", "Mistral",
    ],
    salary: "50 k€ fixe + variable · 70–150 k€ OTE selon performance",
  },

  // ── 4. GESTION DE PATRIMOINE ──────────────────────────────────────────
  {
    id: "patrimoine",
    tab: "Gestion de patrimoine",
    share: "Complément",
    title: "Conseiller en Gestion de Patrimoine Junior",
    angle:
      "Le Master de statistiques et l'analyse du risque deviennent un atout majeur. On ne parle plus de cloud : analyse, finance, gestion du risque et relation client.",
    summary:
      "Profil quantitatif orienté conseil patrimonial : Master 2 de statistiques appliquées, analyse financière et gestion du risque, complété par une expérience concrète d'analyse financière automatisée. Rigueur analytique, sens de la relation client et pédagogie pour accompagner les décisions d'investissement.",
    skills: [
      "Analyse financière", "Gestion du risque", "Investissements", "Fiscalité",
      "Assurance-vie", "SCPI", "PEA", "ETF", "Immobilier", "Retraite",
      "Transmission", "Relation client", "Optimisation",
    ],
    ats: [
      "Conseiller en Gestion de Patrimoine", "Gestion de patrimoine", "Analyse financière",
      "Gestion du risque", "Assurance-vie", "SCPI", "PEA", "Fiscalité",
      "Investissement", "Épargne", "Relation client", "Allocation d'actifs",
    ],
    experiences: [
      {
        company: "Jedy Formation",
        role: "Formateur · accompagnement & pédagogie",
        period: "09/2025 – 07/2026",
        bullets: [
          "Vulgarisation de concepts complexes et accompagnement individualisé de profils exigeants.",
          "Relation de confiance, écoute du besoin et transmission — cœur du conseil patrimonial.",
        ],
      },
      {
        company: "Entrepreneuriat (Collablib, Tailored-CV)",
        role: "Fondateur · autonomie & développement",
        period: "2025 – 2026",
        bullets: [
          "Développement d'un portefeuille clients de zéro : prospection, relation et fidélisation.",
          "Autonomie complète, sens du résultat et gestion de bout en bout.",
        ],
      },
      {
        company: "Freelance · Analyse financière",
        role: "Analyste · pré due-diligence & scoring financier",
        period: "10/2024 – 05/2025",
        bullets: [
          "Conception d'un moteur d'analyse financière automatisée : ratios, scoring, lecture d'états financiers.",
          "Accélération de 60 % du temps d'analyse — évaluation rapide de la solidité financière.",
          "Traduction d'indicateurs quantitatifs en décision et recommandation.",
        ],
      },
      {
        company: "Projet personnel · Gestion de patrimoine",
        role: "Simulateur d'allocation patrimoniale",
        period: "2024",
        bullets: [
          "Développement d'un simulateur d'allocation (PEA, assurance-vie, SCPI, ETF) selon le profil de risque.",
          "Calcul du couple rendement/risque, projection long terme et impact fiscal.",
          "Restitution pédagogique pour appuyer la décision d'investissement.",
        ],
      },
      {
        company: "Orange Business Services",
        role: "Analyste · connaissance client & risque",
        period: "11/2022 – 05/2023",
        bullets: [
          "Analyse comportementale et modélisation du risque de départ sur un portefeuille de 200 000 clients.",
          "Contribution aux stratégies de rétention — logique de fidélisation et de suivi client.",
        ],
      },
    ],
    education: [
      "Université de Caen — Master 2 Statistiques Appliquées & Analyse Décisionnelle · 2023",
      "Université de Montpellier — Big Data, Data Science & Analyse des risques (Mention Très Bien) · 2023",
      "Université de Caen — Licence 3 Mathématiques Appliquées + Licence 3 Informatique · 2021",
    ],
    targets: [
      "BNP Paribas", "LCL", "Banque Populaire", "Caisse d'Épargne", "Crédit Agricole",
      "AXA", "Swiss Life", "Generali", "Gan Patrimoine", "UFF", "Meilleurtaux Placement",
    ],
    salary: "40–80 k€ · jusqu'à 150 k€ selon le portefeuille développé",
  },
];
