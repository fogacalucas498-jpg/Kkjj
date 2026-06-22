import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { whatsappSessionsTable } from "./whatsapp";

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => whatsappSessionsTable.id, { onDelete: "cascade" }),
  contactPhone: text("contact_phone").notNull(),
  contactName: text("contact_name"),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
