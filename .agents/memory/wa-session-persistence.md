---
name: WhatsApp session persistence
description: Where Baileys credentials are stored and why /tmp cannot be used.
---

Sessions must be stored at `/home/runner/.wa-sessions/{agentId}/` (outside the git repo).

**Why:** `/tmp` is wiped on every container restart. When creds are lost, Baileys generates a new QR instead of reconnecting silently — the agent "disappears" for the user.

**How to apply:** `useMultiFileAuthState(path.join(process.env.HOME ?? "/home/runner", ".wa-sessions", String(agentId)))`. On `isLoggedOut`, delete the directory so next connect shows a fresh QR. `reconnectPersisted()` checks `creds.json` existence before attempting silent reconnect.

A watchdog interval (every 3 min) compares DB `status=connected` rows against the in-memory sessions map and reconnects any dropped socket that still has `creds.json` on disk.
