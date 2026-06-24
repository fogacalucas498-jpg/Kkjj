import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PUBLIC_FIELDS = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  avatar: usersTable.avatar,
  dashboardName: usersTable.dashboardName,
};

router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "Nome, email e senha são obrigatórios" }); return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" }); return;
  }
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Email inválido" }); return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email já cadastrado" }); return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name: name.trim(), email: email.toLowerCase(), passwordHash }).returning();
  const token = signToken(user!.id);
  res.status(201).json({
    token,
    user: { id: user!.id, name: user!.name, email: user!.email, avatar: user!.avatar, dashboardName: user!.dashboardName },
  });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Email ou senha incorretos" }); return;
  }
  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, dashboardName: user.dashboardName },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select(PUBLIC_FIELDS).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(user);
});

router.put("/auth/profile", requireAuth, async (req: AuthRequest, res) => {
  const { name, email, currentPassword, openaiApiKey, avatar, dashboardName } = req.body;
  const updates: Record<string, unknown> = {};

  if (name?.trim()) updates["name"] = name.trim();
  if (openaiApiKey !== undefined) updates["openaiApiKey"] = openaiApiKey?.trim() || null;

  if (dashboardName !== undefined) {
    updates["dashboardName"] = dashboardName?.trim() || null;
  }

  if (avatar !== undefined) {
    if (avatar !== null && avatar !== "") {
      if (typeof avatar !== "string" || !avatar.startsWith("data:image/")) {
        res.status(400).json({ error: "Formato de imagem inválido" }); return;
      }
      if (Buffer.byteLength(avatar, "utf8") > 1.5 * 1024 * 1024) {
        res.status(400).json({ error: "Imagem muito grande. Máximo 1.5 MB." }); return;
      }
    }
    updates["avatar"] = avatar || null;
  }

  if (email?.trim()) {
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Email inválido" }); return;
    }
    if (!currentPassword) {
      res.status(400).json({ error: "Informe sua senha atual para alterar o email" }); return;
    }
    const [current] = await db.select({ passwordHash: usersTable.passwordHash })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!current || !(await bcrypt.compare(currentPassword, current.passwordHash))) {
      res.status(401).json({ error: "Senha atual incorreta" }); return;
    }
    const duplicate = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.email, email.toLowerCase()), ne(usersTable.id, req.userId!))).limit(1);
    if (duplicate.length > 0) {
      res.status(409).json({ error: "Este email já está em uso por outra conta" }); return;
    }
    updates["email"] = email.toLowerCase();
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" }); return;
  }

  const [user] = await db.update(usersTable).set(updates as any)
    .where(eq(usersTable.id, req.userId!)).returning();
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar, dashboardName: user.dashboardName });
});

router.put("/auth/password", requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" }); return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres" }); return;
  }
  if (currentPassword === newPassword) {
    res.status(400).json({ error: "A nova senha deve ser diferente da atual" }); return;
  }
  const [user] = await db.select({ passwordHash: usersTable.passwordHash })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Senha atual incorreta" }); return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, req.userId!));
  res.json({ ok: true, message: "Senha alterada com sucesso" });
});

router.get("/auth/settings", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({ openaiApiKey: usersTable.openaiApiKey, createdAt: usersTable.createdAt })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json({ hasOpenaiKey: !!user.openaiApiKey, memberSince: user.createdAt });
});

export default router;
