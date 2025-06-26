import { 
  users, type User, type InsertUser,
  gpts, type Gpt, type InsertGpt,
  favorites, type Favorite, type InsertFavorite,
  usageLogs, type UsageLog, type InsertUsageLog,
  categories, type Category, type InsertCategory,
  chatMessages, type ChatMessage, type InsertChatMessage
} from "@shared/schema";
import session from "express-session";
import { eq, desc, and, count, sql, isNotNull, inArray } from "drizzle-orm";
import { db } from "./db";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

// Hash password function
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

type SessionStoreType = ReturnType<typeof createMemoryStore>;

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // GPT operations
  getGpt(id: number): Promise<Gpt | undefined>;
  getAllGpts(): Promise<Gpt[]>;
  getFeaturedGpts(): Promise<Gpt[]>;
  getNewGpts(): Promise<Gpt[]>;
  getPopularGpts(): Promise<Gpt[]>;
  getGptsByCategory(category: string): Promise<Gpt[]>;
  getGptsByCreator(userId: number): Promise<Gpt[]>;
  createGpt(gpt: InsertGpt): Promise<Gpt>;
  updateGpt(id: number, gpt: Partial<InsertGpt>): Promise<Gpt | undefined>;
  deleteGpt(id: number): Promise<boolean>;
  incrementGptViews(id: number): Promise<void>;
  
  // Favorite operations
  getFavorite(userId: number, gptId: number): Promise<Favorite | undefined>;
  getUserFavorites(userId: number): Promise<Gpt[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, gptId: number): Promise<boolean>;
  
  // Usage logs operations
  createUsageLog(log: InsertUsageLog): Promise<UsageLog>;
  getUserUsageLogs(userId: number): Promise<UsageLog[]>;
  getGptUsageLogs(gptId: number): Promise<UsageLog[]>;
  
  // Category operations
  getCategory(id: number): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  getCategoriesWithGpts(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Chat message operations
  getChatMessages(userId: number, gptId: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(userId: number, gptId: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Usando MemoryStore temporariamente para facilitar o desenvolvimento
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize admin user and categories
    this.initializeDatabase();
  }
  
  private async initializeDatabase() {
    try {
      // Check if we have any users
      const result = await db.execute(sql`SELECT COUNT(*) FROM users`);
      const count = parseInt(result.rows[0]?.count?.toString() || '0');
      
      // If no users, create admin
      if (count === 0) {
        console.log("Initializing database with admin user");
        
        // Create admin
        await this.createUser({
          username: "admin",
          email: "admin@jusgpt.com",
          name: "Administrador",
          password: await hashPassword("admin123"),
          role: "admin",
        });
        
        // Create categories
        const initialCategories: InsertCategory[] = [
          { name: "Direito Civil", icon: "ri-scales-3-line" },
          { name: "Direito Penal", icon: "ri-government-line" },
          { name: "Trabalhista", icon: "ri-user-settings-line" },
          { name: "Administrativo", icon: "ri-building-4-line" },
          { name: "Tributário", icon: "ri-hand-coin-line" }
        ];
        
        for (const cat of initialCategories) {
          await this.createCategory(cat);
        }
        
        console.log("Database initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Converte o username para minúsculas para fazer busca case-insensitive
    const lowerUsername = username.toLowerCase();
    
    // Busca todos os usuários e filtra manualmente para case-insensitive
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => u.username.toLowerCase() === lowerUsername);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Converte o email para minúsculas para fazer busca case-insensitive
    const lowerEmail = email.toLowerCase();
    
    // Busca todos os usuários e filtra manualmente para case-insensitive
    const allUsers = await db.select().from(users);
    const user = allUsers.find(u => u.email.toLowerCase() === lowerEmail);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // GPT operations
  async getGpt(id: number): Promise<Gpt | undefined> {
    const [gpt] = await db.select().from(gpts).where(eq(gpts.id, id));
    return gpt;
  }

  async getAllGpts(): Promise<Gpt[]> {
    return await db.select().from(gpts);
  }

  async getFeaturedGpts(): Promise<Gpt[]> {
    return await db.select().from(gpts).where(eq(gpts.isFeatured, true));
  }

  async getNewGpts(): Promise<Gpt[]> {
    return await db.select().from(gpts).orderBy(desc(gpts.createdAt)).limit(10);
  }

  async getPopularGpts(): Promise<Gpt[]> {
    return await db.select().from(gpts).orderBy(desc(gpts.views)).limit(10);
  }

  async getGptsByCategory(category: string): Promise<Gpt[]> {
    // Trata a busca de forma case-insensitive
    try {
      const result = await db.query.gpts.findMany({
        where: (gpt, { sql }) => sql`LOWER(${gpt.category}) = LOWER(${category})`
      });
      console.log(`GPTs encontrados para categoria ${category}:`, result);
      return result;
    } catch (error) {
      console.error(`Erro ao buscar GPTs para categoria ${category}:`, error);
      throw error;
    }
  }
  
  async getGptsByCreator(userId: number): Promise<Gpt[]> {
    return await db.select().from(gpts).where(eq(gpts.createdBy, userId));
  }

  async createGpt(insertGpt: InsertGpt): Promise<Gpt> {
    const [gpt] = await db.insert(gpts).values(insertGpt).returning();
    return gpt;
  }

  async updateGpt(id: number, gptData: Partial<InsertGpt>): Promise<Gpt | undefined> {
    const [updatedGpt] = await db
      .update(gpts)
      .set(gptData)
      .where(eq(gpts.id, id))
      .returning();
    return updatedGpt;
  }

  async deleteGpt(id: number): Promise<boolean> {
    try {
      // First check if GPT exists
      const [existingGpt] = await db.select().from(gpts).where(eq(gpts.id, id));
      if (!existingGpt) {
        return false;
      }

      // Delete related records first to maintain referential integrity
      await db.delete(favorites).where(eq(favorites.gptId, id));
      await db.delete(usageLogs).where(eq(usageLogs.gptId, id)); 
      await db.delete(chatMessages).where(eq(chatMessages.gptId, id));
      
      // Delete the GPT
      await db.delete(gpts).where(eq(gpts.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir GPT:", error);
      return false;
    }
  }

  async incrementGptViews(id: number): Promise<void> {
    // Buscar o GPT atual para obter suas views
    const [gpt] = await db.select().from(gpts).where(eq(gpts.id, id));
    if (gpt) {
      // Incrementar views manualmente
      const viewCount = gpt.views || 0;
      await db
        .update(gpts)
        .set({ views: viewCount + 1 })
        .where(eq(gpts.id, id));
    }
  }

  // Favorite operations
  async getFavorite(userId: number, gptId: number): Promise<Favorite | undefined> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.gptId, gptId)));
    return favorite;
  }

  async getUserFavorites(userId: number): Promise<Gpt[]> {
    const favGpts = await db
      .select({
        gpt: gpts
      })
      .from(favorites)
      .innerJoin(gpts, eq(favorites.gptId, gpts.id))
      .where(eq(favorites.userId, userId));
    
    return favGpts.map(row => row.gpt);
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values(insertFavorite).returning();
    return favorite;
  }

  async removeFavorite(userId: number, gptId: number): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.gptId, gptId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Usage logs operations
  async createUsageLog(insertLog: InsertUsageLog): Promise<UsageLog> {
    const [log] = await db.insert(usageLogs).values(insertLog).returning();
    return log;
  }

  async getUserUsageLogs(userId: number): Promise<UsageLog[]> {
    return await db.select().from(usageLogs).where(eq(usageLogs.userId, userId));
  }

  async getGptUsageLogs(gptId: number): Promise<UsageLog[]> {
    return await db.select().from(usageLogs).where(eq(usageLogs.gptId, gptId));
  }

  // Category operations
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.group, categories.name);
  }
  
  async getCategoriesWithGpts(): Promise<Category[]> {
    try {
      console.log("Executando getCategoriesWithGpts...");
      
      // Usar SQL bruto para simplicidade e garantir que funcione
      const result = await db.execute(sql`
        WITH gpt_categories AS (
          SELECT DISTINCT category FROM gpts WHERE category IS NOT NULL
        )
        SELECT * FROM categories 
        WHERE name IN (SELECT category FROM gpt_categories)
        ORDER BY "group", name
      `);
      
      console.log("Categorias com GPTs encontradas:", result.rows);
      
      // Converter o resultado para o formato Category[]
      return result.rows.map(row => ({
        id: Number(row.id),
        name: String(row.name),
        icon: String(row.icon),
        group: String(row.group) as "direito_privado" | "direito_publico" | "direito_processual" | "gestao"
      }));
    } catch (error) {
      console.error("Erro em getCategoriesWithGpts:", error);
      throw error;
    }
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  // Chat message operations
  async getChatMessages(userId: number, gptId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.gptId, gptId)))
      .orderBy(chatMessages.timestamp);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    return message;
  }

  async clearChatMessages(userId: number, gptId: number): Promise<boolean> {
    const result = await db
      .delete(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.gptId, gptId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();