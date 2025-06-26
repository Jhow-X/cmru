import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Configuração de armazenamento para documentos
const documentStorage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(process.cwd(), 'uploads/documents');
    
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

// Filtrar arquivos de documento
const documentFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Verificar o tipo MIME do arquivo
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/rtf',
    'text/rtf'
  ];
  
  // Também verificar a extensão do arquivo
  const allowedExtensions = ['.pdf', '.txt', '.md', '.docx', '.doc', '.rtf'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    // Aceitar o arquivo
    cb(null, true);
  } else {
    // Rejeitar o arquivo
    cb(new Error('Tipo de arquivo não suportado. Apenas documentos (PDF, TXT, MD, DOCX, DOC, RTF) são permitidos.'));
  }
};

// Configurar o uploader para documentos
const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB para documentos
    files: 10 // Máximo 10 arquivos por vez
  }
});

// Middleware de erro para o upload de documentos
export const handleDocumentUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // Erro do Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Arquivo muito grande. O tamanho máximo permitido é 20MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Muitos arquivos. O máximo permitido é 10 arquivos por vez.'
      });
    }
    return res.status(400).json({
      error: `Erro no upload: ${err.message}`
    });
  } else if (err) {
    // Erro personalizado ou outro erro
    return res.status(400).json({
      error: err.message
    });
  }
  next();
};

export default documentUpload;