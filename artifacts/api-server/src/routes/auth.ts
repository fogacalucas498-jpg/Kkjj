import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middlewares/requireAuth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Email inválido" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email já cadastrado" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name: name.trim(), email: email.toLowerCase(), passwordHash }).returning();
  const token = signToken(user!.id);
  res.status(201).json({ token, user: { id: user!.id, name: user!.name, email: user!.email } });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json(user);
});

router.put("/auth/profile", requireAuth, async (req: AuthRequest, res) => {
  const { name, openaiApiKey } = req.body;
  const updates: Record<string, unknown> = {};
  if (name?.trim()) updates["name"] = name.trim();
  if (openaiApiKey !== undefined) updates["openaiApiKey"] = openaiApiKey?.trim() || null;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nenhum campo para atualizar" });
    return;
  }
  const [user] = await db.update(usersTable).set(updates as any)
    .where(eq(usersTable.id, req.userId!)).returning();
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email });
});

router.get("/auth/settings", requireAuth, async (req: AuthRequest, res) => {
  const [user] = await db.select({ openaiApiKey: usersTable.openaiApiKey })
    .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
  res.json({ hasOpenaiKey: !!user.openaiApiKey });
});

export default router;
