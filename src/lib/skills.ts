// Taxonomie de compétences : sert à extraire les technos d'une offre,
// à représenter le profil, et à mesurer la demande du marché.

export type SkillDef = { key: string; group: string; re: RegExp };

export const SKILLS: SkillDef[] = [
  // Langages
  { key: "Python", group: "Langage", re: /\bpython\b|pyspark|pandas/i },
  { key: "SQL", group: "Langage", re: /\bsql\b/i },
  { key: "Scala", group: "Langage", re: /\bscala\b/i },
  { key: "Java", group: "Langage", re: /\bjava\b/i },
  { key: "Go", group: "Langage", re: /\bgolang\b/i },
  { key: "R", group: "Langage", re: /\b(?:langage )?r\b(?: |,|\/)/i },
  { key: "TypeScript", group: "Langage", re: /typescript|javascript/i },

  // Data engineering
  { key: "Spark", group: "Data Eng", re: /\bspark\b|pyspark/i },
  { key: "Airflow", group: "Data Eng", re: /airflow/i },
  { key: "dbt", group: "Data Eng", re: /\bdbt\b/i },
  { key: "Kafka", group: "Data Eng", re: /kafka/i },
  { key: "Flink", group: "Data Eng", re: /flink/i },
  { key: "Streaming", group: "Data Eng", re: /streaming|temps r[ée]el|real[- ]?time/i },
  { key: "ETL/ELT", group: "Data Eng", re: /\betl\b|\belt\b/i },
  { key: "Hadoop/Hive", group: "Data Eng", re: /hadoop|hive/i },
  { key: "Data Warehouse", group: "Data Eng", re: /data ?warehouse|datawarehouse|\bdwh\b/i },
  { key: "Data Lake/Lakehouse", group: "Data Eng", re: /data ?lake|lakehouse/i },
  { key: "Data Modeling", group: "Data Eng", re: /mod[ée]lisation|data model|dimensionnel|star schema/i },

  // Plateformes data
  { key: "Snowflake", group: "Plateforme", re: /snowflake/i },
  { key: "Databricks", group: "Plateforme", re: /databricks/i },
  { key: "BigQuery", group: "Plateforme", re: /bigquery/i },
  { key: "Redshift", group: "Plateforme", re: /redshift/i },
  { key: "Synapse", group: "Plateforme", re: /synapse/i },

  // Cloud / infra
  { key: "AWS", group: "Cloud", re: /\baws\b|amazon web services/i },
  { key: "GCP", group: "Cloud", re: /\bgcp\b|google cloud/i },
  { key: "Azure", group: "Cloud", re: /azure/i },
  { key: "Docker", group: "Cloud", re: /docker|conteneur/i },
  { key: "Kubernetes", group: "Cloud", re: /kubernetes|k8s/i },
  { key: "Terraform", group: "Cloud", re: /terraform/i },
  { key: "CI/CD", group: "Cloud", re: /ci\/?cd|github actions|gitlab ci|jenkins/i },
  { key: "Linux", group: "Cloud", re: /\blinux\b/i },
  { key: "Observability", group: "Cloud", re: /grafana|prometheus|datadog|observabilit/i },

  // IA / ML
  { key: "Machine Learning", group: "IA", re: /machine learning|\bml\b|scikit|tensorflow|pytorch/i },
  { key: "MLOps", group: "IA", re: /mlops/i },
  { key: "LLM/GenAI", group: "IA", re: /\bllm\b|genai|g[ée]n[ée]rative|rag\b|langchain/i },
  { key: "NLP", group: "IA", re: /\bnlp\b|traitement.*langage/i },

  // API / archi
  { key: "API/REST", group: "API", re: /\bapi\b|rest|fastapi|graphql/i },
  { key: "MCP", group: "API", re: /\bmcp\b|model context protocol/i },
  { key: "Microservices", group: "API", re: /micro[- ]?services?/i },
  { key: "Event-driven", group: "API", re: /event[- ]driven|[ée]v[ée]nementiel/i },

  // BI / analytics
  { key: "Power BI", group: "BI", re: /power ?bi/i },
  { key: "Tableau", group: "BI", re: /tableau(?! de)/i },
  { key: "Looker", group: "BI", re: /looker/i },
  { key: "Analytics", group: "BI", re: /analytics|analyse de donn|business intelligence/i },

  // Bases
  { key: "NoSQL", group: "BDD", re: /nosql|mongodb|cassandra|dynamodb/i },
  { key: "PostgreSQL", group: "BDD", re: /postgres|postgresql/i },
];

/** Extrait l'ensemble des compétences détectées dans un texte. */
export function extractSkills(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const s of SKILLS) if (s.re.test(text)) found.add(s.key);
  return [...found];
}

// Familles de métiers (pour suggestions & tendances).
export const ROLE_FAMILIES: { key: string; re: RegExp }[] = [
  { key: "Data Engineer", re: /data engineer|ing[ée]nieur(?:e)? (?:de )?donn[ée]es|ing[ée]nieur data/i },
  { key: "Analytics Engineer", re: /analytics engineer/i },
  { key: "Data Scientist", re: /data scientist|scientifique des donn/i },
  { key: "ML / AI Engineer", re: /machine learning engineer|ml engineer|ing[ée]nieur ia|ai engineer|mlops/i },
  { key: "Data Analyst", re: /data analyst|analyste (?:de )?donn/i },
  { key: "BI / Décisionnel", re: /\bbi\b|business intelligence|d[ée]cisionnel|power ?bi|consultant.*data/i },
  { key: "Cloud Engineer", re: /cloud engineer|ing[ée]nieur cloud/i },
  { key: "DevOps / SRE", re: /devops|\bsre\b|site reliability/i },
  { key: "Data Platform", re: /data platform|plateforme (?:de )?donn|platform engineer/i },
  { key: "Data Architect", re: /architect.*data|data architect|architecte (?:de )?donn[ée]es|architecte (?:big data|databricks|snowflake|cloud)/i },
  { key: "Solutions / FDE", re: /solutions? engineer|forward deployed|avant[- ]vente|presales/i },
  { key: "Lead / Head of Data", re: /lead data|head of data|data manager|responsable data|manager.*data/i },
];

export function roleFamily(title: string): string {
  for (const f of ROLE_FAMILIES) if (f.re.test(title)) return f.key;
  return "Autre";
}
