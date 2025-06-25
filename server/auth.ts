import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare global {
  namespace Express {
    // Estendendo a interface User para incluir as propriedades usadas no sistema
    interface User {
      id: number;
      username: string;
      email: string;
      name: string;
      role: string;
      password: string;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "jusgpt-session-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Converter o input para minúsculas para tornar a busca case-insensitive
        const lowerInput = username.toLowerCase();
        
        // Verificar se o input parece um email (contém @)
        const isEmail = lowerInput.includes('@');
        
        // Buscar o usuário baseado no tipo de input (email ou username)
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(lowerInput);
        } else {
          // Buscar pelo nome de usuário, mas com uma busca case-insensitive especial
          const allUsers = await storage.getAllUsers();
          user = allUsers.find(u => u.username.toLowerCase() === lowerInput);
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Usuário ou senha inválidos" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já está em uso" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const userResponse = { ...user };
      delete userResponse.password;
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Falha na autenticação" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Erro ao destruir sessão:", sessionErr);
        }
        res.clearCookie("connect.sid");
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    // Remove password from response
    const userResponse = { ...req.user };
    delete userResponse.password;
    
    res.json(userResponse);
  });
  
  // Rota para autenticação com Google
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { token, email, name, photoURL } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-mail não fornecido" });
      }
      
      // Verificar se o usuário já existe pelo email
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Se o usuário não existir, criar um novo
        const username = email.split('@')[0]; // Criar um username a partir do email
        user = await storage.createUser({
          username: username,
          name: name || username,
          email: email,
          password: await hashPassword(Math.random().toString(36).substring(2, 15)), // Senha aleatória
          role: "user", // Papel padrão para novos usuários
          avatar: photoURL || null
        });
      }
      
      // Fazer login do usuário
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login após autenticação com Google" });
        }
        
        // Remove password from response
        const userResponse = { ...user };
        delete userResponse.password;
        
        return res.status(200).json(userResponse);
      });
    } catch (error) {
      console.error("Erro na autenticação com Google:", error);
      res.status(500).json({ message: "Erro na autenticação com Google" });
    }
  });
}
