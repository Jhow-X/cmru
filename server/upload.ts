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

// Filtrar arquivos (apenas imagens)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verificar o tipo MIME do arquivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    // Aceitar o arquivo
    cb(null, true);
  } else {
    // Rejeitar o arquivo
    cb(new Error('Tipo de arquivo não suportado. Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas.'));
  }
};

// Document file filter for GPT files
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed document types for GPT file processing
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/json'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Apenas documentos (PDF, DOC, DOCX, TXT, MD, CSV, JSON) são permitidos.'));
  }
};

// Memory storage for file processing (files will be sent to OpenAI, not stored locally)
const memoryStorage = multer.memoryStorage();

// Configurar o uploader para imagens
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Configurar o uploader para documentos (GPT files)
export const documentUpload = multer({
  storage: storage, // Use disk storage for file uploads
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for documents
    files: 10 // Maximum 10 files per upload
  }
});

// Middleware de erro para o upload
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Erro do Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Arquivo muito grande. O tamanho máximo permitido é 50MB para documentos.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Muitos arquivos. O máximo permitido é 10 arquivos por upload.'
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