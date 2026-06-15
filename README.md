# Mobilidade Urbana (Transporte.PRO)

Plataforma de mobilidade urbana — backend com **core-node** (Node.js/TypeScript), **geo-go** (Go) e banco **PostgreSQL/PostGIS** (Supabase).

## Estrutura

```
├── guia.txt                 # Especificação funcional
├── infra/postgres/          # Migrations SQL (001–007)
├── scripts/db-check.js      # list | migrate (requer PG_DSN)
├── services/core-node/      # API principal
└── services/geo-go/         # Match engine + geolocalização
```

## Setup rápido

1. Copie `.env.example` para `.env` e preencha as variáveis.
2. Migrations: `PG_DSN=... node scripts/db-check.js migrate`
3. Core-node: `cd services/core-node && npm install && npm run build && npm start`
4. Docker: `docker compose up -d`

## APIs principais (core-node)

- `POST /api/v1/users/register` · `POST /api/v1/users/login`
- `GET /api/v1/categories`
- `POST /api/v1/pricing/quote`
- `POST /api/v1/rides` · `GET /api/v1/rides/:id`
- `POST /api/v1/rides/:id/accept|arrive|complete|cancel|match`

## Segurança

**Nunca commite `.env`** — credenciais ficam apenas localmente ou no Supabase dashboard.
