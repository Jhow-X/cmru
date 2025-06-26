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

// Filtrar arquivos (imagens e documentos)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verificar o tipo MIME do arquivo
  const allowedTypes = [
    // Imagens
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documentos
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
    'text/markdown',
    'application/json',
    'text/csv'
  ];
  
  // Também verificar extensão do arquivo como fallback
  const fileExtension = file.originalname.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'docx', 'doc', 'md', 'json', 'csv'];
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension || '')) {
    // Aceitar o arquivo
    cb(null, true);
  } else {
    // Rejeitar o arquivo
    cb(new Error('Tipo de arquivo não suportado. Apenas imagens (JPEG, PNG, GIF, WEBP) e documentos (PDF, TXT, DOCX, MD, JSON, CSV) são permitidos.'));
  }
};

// Configurar o uploader com armazenamento em disco
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Configurar uploader para armazenamento em memória (para uploads de arquivos do OpenAI)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
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
        message: 'Arquivo muito grande. O tamanho máximo permitido é 5MB.'
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
export { uploadMemory };