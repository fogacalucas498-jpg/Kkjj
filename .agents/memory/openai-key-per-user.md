---
name: OpenAI key per user
description: How the per-user OpenAI API key is stored and used for WhatsApp AI replies
---

Each user can store their own OpenAI API key in the `openai_api_key` column of the `users` table.

**Endpoints:**
- `PUT /api/auth/profile` — updates name and/or openaiApiKey
- `GET /api/auth/settings` — returns `{ hasOpenaiKey: boolean }` (never exposes the key itself)

**How whatsapp-manager uses it:** In `generateReply()`, it joins agent → user to get `openaiApiKey`, falling back to `process.env.OPENAI_API_KEY` if not set.

**Why:** Settings.tsx originally saved the key to localStorage only, which had no effect on the backend. The key must be persisted server-side per-user for AI replies to work.

**How to apply:** DB column `openai_api_key` was added via drizzle push. Always keep the backend fallback to `process.env.OPENAI_API_KEY` for self-hosted setups.
