# Robô de Vendas - Networking VIP

Plataforma SaaS de agentes de I.A para WhatsApp. Usuários criam agentes, adicionam base de conhecimento, conectam um número de WhatsApp via QR Code e o agente responde automaticamente às mensagens usando OpenAI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080, served at /api)
- `pnpm --filter @workspace/robo-de-vendas run dev` — frontend React/Vite
- `pnpm run typecheck` — typecheck completo
- `pnpm run typecheck:libs` — rebuild declarações das libs (necessário após mudar schema)
- `pnpm --filter @workspace/db run push` — aplicar mudanças de schema no banco (dev only)
- `pnpm --filter @workspace/api-server run typecheck` — verificar erros no backend

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind (sem framework CSS, tudo inline styles)
- API: Express 5 + pino (logger)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Auth: JWT (SESSION_SECRET), 30 dias de validade
- WhatsApp: `@whiskeysockets/baileys` (multi-device)
- AI: OpenAI GPT-4o-mini
- Validação: Zod (zod/v4)

## Where things live

- `artifacts/robo-de-vendas/` — frontend React + landing page + app
- `artifacts/api-server/` — Express backend
- `lib/db/src/schema/` — schema Drizzle (fonte da verdade do banco)
- `artifacts/api-server/src/lib/whatsapp-manager.ts` — gestão de sessões Baileys
- `artifacts/api-server/src/routes/` — rotas da API
- `artifacts/robo-de-vendas/src/lib/api.ts` — cliente axios com todos os métodos da API
- `artifacts/robo-de-vendas/src/contexts/auth.tsx` — contexto de autenticação

## Architecture decisions

- JWT armazenado em localStorage (simples, sem cookies httpOnly por ser MVP)
- Sessões Baileys em `/tmp/wa-session-{agentId}` (perdidas no restart, mas reconecta automaticamente via `reconnectPersisted()`)
- Chave OpenAI salva por usuário na coluna `openai_api_key` da tabela `users` — frontend usa `PUT /auth/profile`, backend lê do DB com fallback para `process.env.OPENAI_API_KEY`
- Inline styles em todos componentes do app (sem Tailwind no JSX do app, apenas na landing)
- Cascade delete: agent → knowledge, whatsapp_sessions → conversations → messages (FK com onDelete cascade)

## Product

- **Landing page** (`/`) — marketing com preços todos GRÁTIS
- **Auth** (`/login`, `/register`) — cadastro/login com JWT
- **Dashboard** (`/app`) — visão geral dos agentes e conversas
- **Agentes** (`/app/agents`, `/app/agents/:id`) — CRUD de agentes, base de conhecimento, conexão WhatsApp
- **Conversas** (`/app/conversations`, `/app/conversations/:id`) — histórico e envio manual de mensagens
- **Configurações** (`/app/settings`) — chave OpenAI por usuário, info da conta

## User preferences

- Paleta de cores: preto (#000000), branco (#ffffff) e roxo (#8b5cf6 / #7c3aed)
- CSS variables em `--accent: #8b5cf6` e `--bg: #000000`
- Idioma: português brasileiro em tudo
- Tudo gratuito (sem planos pagos)

## Gotchas

- Baileys e protobufjs precisam estar em `onlyBuiltDependencies` no `pnpm-workspace.yaml` — sem isso o servidor não inicia
- Após mudar `lib/db/src/schema/`, rodar `pnpm run typecheck:libs` antes de `pnpm --filter @workspace/api-server run typecheck`
- Rotas do Express montadas em `/api` — o frontend usa `BASE_URL + "api"` como base
- Sessões WhatsApp ficam em memória: reiniciar o servidor reconecta as sessões com status "connected" no banco automaticamente
- `@types/qrcode` deve estar em devDependencies do `api-server`

## Pointers

- Ver `pnpm-workspace` skill para estrutura do workspace, TypeScript e referências de pacotes
