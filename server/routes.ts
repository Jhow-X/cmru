import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import openai from "./openai";
import { 
  insertGptSchema, 
  insertFavoriteSchema, 
  insertUsageLogSchema,
  insertCategorySchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import path from "path";
import upload, { handleUploadError } from "./upload";

// Auth middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Não autorizado" });
}

// Admin middleware to check if user is an admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Acesso negado. Apenas administradores podem acessar este recurso." });
}

// Magistrate middleware to check if user is a magistrate
function isMagistrate(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user?.role === 'magistrate' || req.user?.role === 'admin')) {
    return next();
  }
  res.status(403).json({ message: "Acesso negado. Apenas magistrados podem acessar este recurso." });
}

// Função para converter nome do grupo enum para nome para exibição
function groupNameMapping(groupName: string): string {
  const mapping: Record<string, string> = {
    'direito_privado': 'Direito Privado',
    'direito_publico': 'Direito Público',
    'direito_processual': 'Direito Processual',
    'gestao': 'Gestão'
  };
  
  return mapping[groupName] || groupName;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Servir arquivos estáticos da pasta uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
  
  // API Routes
  
  // Rota para upload de imagens
  app.post('/api/upload/image', isAuthenticated, upload.single('image'), handleUploadError, (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }
    
    // Construir URL para a imagem enviada
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Responder com a URL da imagem
    res.status(200).json({ 
      url: imageUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      message: 'Imagem enviada com sucesso'
    });
  });
  
  // User routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords before sending response
      const sanitizedUsers = users.map(user => {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
      });
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  // Get a single user by ID
  app.get("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remove password before sending response
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });
  
  // Update user
  app.put("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Validate update data
      const updateData = req.body;
      
      // Update user
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remove password before sending response
      const { password, ...sanitizedUser } = updatedUser;
      res.json(sanitizedUser);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });
  
  // Delete user
  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Check if trying to delete self
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Não é possível excluir seu próprio usuário" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.status(200).json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });
  
  // Redefinir senha (apenas administradores)
  app.post("/api/users/:id/reset-password", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      // Validar body da requisição
      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ 
          message: "Senha inválida. A senha deve ter pelo menos 6 caracteres."
        });
      }
      
      // Obter usuário
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Hash da nova senha
      const hashedPassword = await hashPassword(newPassword);
      
      // Atualizar senha
      const updatedUser = await storage.updateUser(userId, { 
        password: hashedPassword 
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Falha ao atualizar senha" });
      }
      
      res.status(200).json({ 
        message: "Senha redefinida com sucesso",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role
        }
      });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });
  
  // GPT routes
  app.get("/api/gpts", isAuthenticated, async (req, res) => {
    try {
      const gpts = await storage.getAllGpts();
      res.json(gpts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar GPTs" });
    }
  });
  
  app.get("/api/gpts/featured", isAuthenticated, async (req, res) => {
    try {
      const gpts = await storage.getFeaturedGpts();
      res.json(gpts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar GPTs em destaque" });
    }
  });
  
  app.get("/api/gpts/new", isAuthenticated, async (req, res) => {
    try {
      const gpts = await storage.getNewGpts();
      res.json(gpts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar GPTs novos" });
    }
  });
  
  app.get("/api/gpts/popular", isAuthenticated, async (req, res) => {
    try {
      const gpts = await storage.getPopularGpts();
      res.json(gpts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar GPTs populares" });
    }
  });
  
  // Rota para obter todos os GPTs (para busca)
  app.get("/api/gpts", isAuthenticated, async (req, res) => {
    try {
      const gpts = await storage.getAllGpts();
      res.json(gpts);
    } catch (error) {
      console.error("Erro ao buscar todos os GPTs:", error);
      res.status(500).json({ message: "Erro ao buscar todos os GPTs" });
    }
  });
  
  // A ordem das rotas IMPORTA!
  // Rotas mais específicas devem vir antes das mais genéricas
  // Get GPTs created by the current user
  app.get("/api/gpts/my", isAuthenticated, async (req, res) => {
    try {
      console.log("Buscando GPTs do usuário:", req.user!.id);
      const gpts = await storage.getGptsByCreator(req.user!.id);
      console.log("GPTs encontrados:", gpts);
      res.json(gpts);
    } catch (error) {
      console.error("Erro ao buscar GPTs do usuário:", error);
      res.status(500).json({ message: "Erro ao buscar seus GPTs", error: String(error) });
    }
  });
  
  // A rota com parâmetro :category deve vir antes da rota com parâmetro :id
  app.get("/api/gpts/category/:category", isAuthenticated, async (req, res) => {
    try {
      const gpts = await storage.getGptsByCategory(req.params.category);
      res.json(gpts);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar GPTs por categoria" });
    }
  });
  
  // Esta rota deve ser a ÚLTIMA para que não capture as rotas especiais como /my, /popular, etc.
  app.get("/api/gpts/:id", isAuthenticated, async (req, res) => {
    try {
      const gptId = parseInt(req.params.id);
      if (isNaN(gptId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const gpt = await storage.getGpt(gptId);
      if (!gpt) {
        return res.status(404).json({ message: "GPT não encontrado" });
      }
      
      // Increment view count
      await storage.incrementGptViews(gptId);
      
      res.json(gpt);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar GPT" });
    }
  });
  
  app.post("/api/gpts", isMagistrate, async (req, res) => {
    try {
      const gptData = insertGptSchema.parse(req.body);
      
      // Set the current user as creator
      const gpt = await storage.createGpt({
        ...gptData,
        createdBy: req.user!.id
      });
      
      res.status(201).json(gpt);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao criar GPT" });
    }
  });
  
  app.put("/api/gpts/:id", isMagistrate, async (req, res) => {
    try {
      const gptId = parseInt(req.params.id);
      if (isNaN(gptId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const gpt = await storage.getGpt(gptId);
      if (!gpt) {
        return res.status(404).json({ message: "GPT não encontrado" });
      }
      
      // Check if user is admin or the creator of the GPT
      if (req.user!.role !== 'admin' && gpt.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar este GPT" });
      }
      
      const gptData = insertGptSchema.partial().parse(req.body);
      const updatedGpt = await storage.updateGpt(gptId, gptData);
      
      res.json(updatedGpt);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao atualizar GPT" });
    }
  });
  
  app.delete("/api/gpts/:id", isMagistrate, async (req, res) => {
    try {
      const gptId = parseInt(req.params.id);
      if (isNaN(gptId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const gpt = await storage.getGpt(gptId);
      if (!gpt) {
        return res.status(404).json({ message: "GPT não encontrado" });
      }
      
      // Check if user is admin or the creator of the GPT
      if (req.user!.role !== 'admin' && gpt.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este GPT" });
      }
      
      const success = await storage.deleteGpt(gptId);
      if (!success) {
        return res.status(500).json({ message: "Falha ao excluir GPT" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir GPT" });
    }
  });
  
  // Favorite routes
  app.get("/api/favorites", isAuthenticated, async (req, res) => {
    try {
      const favorites = await storage.getUserFavorites(req.user!.id);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar favoritos" });
    }
  });
  
  app.post("/api/favorites", isAuthenticated, async (req, res) => {
    try {
      // Verificar se gptId está presente no corpo da requisição
      if (!req.body || req.body.gptId === undefined) {
        return res.status(400).json({ message: "gptId é obrigatório" });
      }
      
      // Converter para número se for string
      const gptId = typeof req.body.gptId === 'string' 
        ? parseInt(req.body.gptId, 10) 
        : req.body.gptId;
      
      if (isNaN(gptId)) {
        return res.status(400).json({ message: "gptId deve ser um número válido" });
      }
      
      // Check if GPT exists
      const gpt = await storage.getGpt(gptId);
      if (!gpt) {
        return res.status(404).json({ message: "GPT não encontrado" });
      }
      
      // Check if already favorited
      const existing = await storage.getFavorite(req.user!.id, gptId);
      if (existing) {
        return res.status(400).json({ message: "GPT já está nos favoritos" });
      }
      
      const favorite = await storage.addFavorite({
        userId: req.user!.id,
        gptId
      });
      
      res.status(201).json(favorite);
    } catch (error) {
      console.error("Erro ao adicionar favorito:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao adicionar favorito" });
    }
  });
  
  app.delete("/api/favorites/:gptId", isAuthenticated, async (req, res) => {
    try {
      const gptId = parseInt(req.params.gptId);
      if (isNaN(gptId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const success = await storage.removeFavorite(req.user!.id, gptId);
      if (!success) {
        return res.status(404).json({ message: "Favorito não encontrado" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao remover favorito:", error);
      res.status(500).json({ message: "Erro ao remover favorito" });
    }
  });
  
  // Categories routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      // Opção para filtrar apenas categorias com GPTs
      const onlyWithGpts = req.query.onlyWithGpts === 'true';
      const grouped = req.query.grouped === 'true';
      console.log("Requisição para /api/categories com onlyWithGpts =", onlyWithGpts, ", grouped =", grouped);
      
      let categoriesList;
      if (onlyWithGpts) {
        // Obter apenas categorias que têm GPTs
        categoriesList = await storage.getCategoriesWithGpts();
      } else {
        // Obter todas as categorias
        categoriesList = await storage.getAllCategories();
      }
      
      if (grouped) {
        // Agrupar categorias por grupo
        const groupedCategories = categoriesList.reduce((acc: Record<string, any>, category) => {
          const groupName = category.group as string;
          if (!acc[groupName]) {
            acc[groupName] = {
              name: groupNameMapping(groupName),
              categories: []
            };
          }
          acc[groupName].categories.push(category);
          return acc;
        }, {});
        
        res.json(groupedCategories);
      } else {
        res.json(categoriesList);
      }
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      res.status(500).json({ 
        message: "Erro ao buscar categorias", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Rota para obter GPTs por categoria
  app.get("/api/category/gpts", isAuthenticated, async (req, res) => {
    try {
      const categoryName = req.query.categoryName as string;
      if (!categoryName) {
        return res.status(400).json({ message: "Nome da categoria é obrigatório" });
      }
      
      // Formatar o nome da categoria adequadamente (primeira letra maiúscula)
      const formattedCategoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
      console.log(`Buscando GPTs para categoria ${categoryName} (formatada: ${formattedCategoryName})`);
      
      const gpts = await storage.getGptsByCategory(formattedCategoryName);
      console.log(`GPTs encontrados para categoria ${formattedCategoryName}:`, gpts);
      res.json(gpts);
    } catch (error) {
      console.error("Erro ao obter GPTs por categoria:", error);
      res.status(500).json({ message: "Erro ao obter GPTs por categoria" });
    }
  });

  app.post("/api/categories", isAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });
  
  // Increment GPT view count (for external redirect)
  app.post("/api/gpts/:id/view", isAuthenticated, async (req, res) => {
    try {
      const gptId = parseInt(req.params.id);
      if (isNaN(gptId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Check if GPT exists
      const gpt = await storage.getGpt(gptId);
      if (!gpt) {
        return res.status(404).json({ message: "GPT não encontrado" });
      }
      
      // Increment view count
      await storage.incrementGptViews(gptId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error incrementing GPT views:", error);
      res.status(500).json({ message: "Erro ao registrar visualização" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
