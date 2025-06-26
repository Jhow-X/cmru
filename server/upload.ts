import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    
    // Garantir que o diretório de uploads exista
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Gerar um nome de arquivo único baseado em timestamp e hash
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const hash = crypto.randomBytes(8).toString('hex');
    
    // Pegar a extensão do arquivo original
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Criar nome final do arquivo
    const filename = `${timestamp}-${hash}${extension}`;
    
    cb(null, filename);
  }
});

// Filtrar arquivos (imagens e documentos para Vector Store)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Log do tipo de arquivo para debug
  console.log(`File upload attempt: ${file.originalname}, MIME type: ${file.mimetype}`);
  
  // Verificar o tipo MIME do arquivo e extensão como fallback
  const allowedTypes = [
    // Imagens (para avatares/thumbnails)
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documentos (para Vector Store)
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json',
    'text/markdown',
    // Tipos alternativos que podem aparecer
    'application/x-pdf',
    'text/x-markdown'
  ];
  
  // Verificar extensão como fallback
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx', '.json', '.md'];
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    console.log(`File accepted: ${file.originalname}`);
    cb(null, true);
  } else {
    console.log(`File rejected: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${fileExtension}`);
    cb(new Error('Tipo de arquivo não suportado. Permitidos: imagens (JPEG, PNG, GIF, WEBP) e documentos (PDF, TXT, DOC, DOCX, JSON, MD).'));
  }
};

// Configurar o uploader
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para documentos
  }
});

// Middleware de erro para o upload
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Erro do Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Arquivo muito grande. O tamanho máximo permitido é 10MB.'
      });
    }
    return res.status(400).json({
      message: `Erro no upload: ${err.message}`
    });
  } else if (err) {
    // Erro personalizado ou outro erro
    return res.status(400).json({
      message: err.message
    });
  }
  next();
};

export default upload;