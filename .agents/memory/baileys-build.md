---
name: Baileys build approval
description: How to allow @whiskeysockets/baileys and protobufjs postinstall scripts in pnpm monorepo
---

Add both packages to `onlyBuiltDependencies` in `pnpm-workspace.yaml`:

```yaml
onlyBuiltDependencies:
  - '@whiskeysockets/baileys'
  - protobufjs
```

Then run `pnpm install` to trigger postinstall scripts.

**Why:** pnpm blocks postinstall scripts by default for security. Baileys needs its engine requirements check; protobufjs compiles native bindings. Without this, the API server crashes with "Cannot find package 'protobufjs'".

**How to apply:** Any time Baileys is added to a new workspace package or pnpm-workspace.yaml is reset.
