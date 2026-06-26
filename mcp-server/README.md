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

## Version hébergée (HTTP) — recommandée

Le serveur est aussi exposé en **Streamable HTTP** dans l'app Next.js, donc **appelable à distance** (pas besoin de lancer le stdio en local).

- **URL** : `https://jobpilot-sand.vercel.app/api/mcp`
- **Auth** : en-tête `Authorization: Bearer <MCP_TOKEN>`
- Code : [`src/app/api/mcp/route.ts`](../src/app/api/mcp/route.ts) (adaptateur `mcp-handler`).

Connexion via un client qui supporte les serveurs MCP distants (Authorization Bearer). Exemple de test :
```bash
curl -X POST https://jobpilot-sand.vercel.app/api/mcp \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"top_matches","arguments":{"limit":3}}}'
```

> Évolution possible : OAuth au lieu d'un token statique, + outils d'écriture (créer une candidature, programmer un post).
