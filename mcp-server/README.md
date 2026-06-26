# JobPilot MCP server

Serveur **MCP** (Model Context Protocol) qui expose les données de marché de JobPilot
à n'importe quel client compatible (Claude Desktop, Claude Code, etc.).

C'est le **projet #4** de la roadmap : il prouve la maîtrise de MCP / API / intégration IA.

## Outils exposés
| Tool | Description |
|---|---|
| `search_jobs` | Recherche d'offres par mot-clé + score minimum |
| `top_matches` | Meilleures offres pour le profil |
| `market_skills` | Tendances : compétences les plus demandées |
| `market_roles` | Familles de métiers : volume + salaire moyen |

## Lancer
```bash
cd mcp-server
npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node index.mjs
```

## Connexion à Claude Desktop / Claude Code
Ajouter dans la config MCP du client :
```json
{
  "mcpServers": {
    "jobpilot": {
      "command": "node",
      "args": ["C:/Users/gueye/Desktop/jobpilot/mcp-server/index.mjs"],
      "env": {
        "SUPABASE_URL": "https://jmwsolvidehnfduvvnad.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "<clé service role>"
      }
    }
  }
}
```
Ensuite, demande au LLM : « quelles sont mes meilleures offres ? » ou « quelles compétences monter selon le marché ? ».

> Évolution possible : transport HTTP/SSE pour l'héberger, + outils d'écriture (créer une candidature, programmer un post).
