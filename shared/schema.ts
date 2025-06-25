import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define user roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'magistrate', 'user']);

// Define category group enum
export const categoryGroupEnum = pgEnum('category_group', ['direito_privado', 'direito_publico', 'direito_processual', 'gestao']);

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default('user'),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

// GPT table
export const gpts = pgTable("gpts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  name: text("name").notNull(),
  systemInstructions: text("system_instructions").notNull(),
  model: text("model").notNull().default("gpt-4"),
  temperature: integer("temperature").default(70), // Store as integer (0-100)
  creatorName: text("creator_name"),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  rating: integer("rating").default(0),
  views: integer("views").default(0),
  isFeatured: boolean("is_featured").default(false),
  isNew: boolean("is_new").default(false),
  gptUrl: text("gpt_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

// Favorites table for users' favorite GPTs
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gptId: integer("gpt_id").notNull().references(() => gpts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage logs table
export const usageLogs = pgTable("usage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gptId: integer("gpt_id").notNull().references(() => gpts.id),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Categories for GPTs
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  group: categoryGroupEnum("group").notNull().default('direito_processual'),
});

// Create insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGptSchema = createInsertSchema(gpts).omit({
  id: true,
  createdAt: true,
  views: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertUsageLogSchema = createInsertSchema(usageLogs).omit({
  id: true,
  timestamp: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

// Create login schema
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário ou email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Infer types from schemas
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Gpt = typeof gpts.$inferSelect;
export type InsertGpt = z.infer<typeof insertGptSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type UsageLog = typeof usageLogs.$inferSelect;
export type InsertUsageLog = z.infer<typeof insertUsageLogSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
