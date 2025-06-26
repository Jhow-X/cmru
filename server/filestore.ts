import OpenAI from "openai";
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FileUploadResult {
  fileId: string;
  filename: string;
  size: number;
}

export interface VectorStoreResult {
  vectorStoreId: string;
  fileIds: string[];
}

export class FileStoreService {
  /**
   * Upload files to OpenAI and return file IDs
   */
  async uploadFiles(files: Express.Multer.File[]): Promise<FileUploadResult[]> {
    if (!files.length) {
      throw new Error('No files provided');
    }

    try {
      // Upload files to OpenAI
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const fileStream = await fs.readFile(file.path);
          const uploadedFile = await openai.files.create({
            file: new File([fileStream], file.originalname, { type: file.mimetype }),
            purpose: 'assistants',
          });

          return {
            fileId: uploadedFile.id,
            filename: file.originalname,
            size: file.size
          };
        })
      );

      // Cleanup local files
      await Promise.all(files.map(file => fs.unlink(file.path)));

      return uploadedFiles;
    } catch (error) {
      // Cleanup local files even if upload fails
      await Promise.all(files.map(file => fs.unlink(file.path).catch(() => {})));
      throw error;
    }
  }

  /**
   * Create a vector store with uploaded files
   */
  async createVectorStore(fileIds: string[], name: string): Promise<VectorStoreResult> {
    try {
      const vectorStore = await openai.beta.vectorStores.create({
        name: name,
        file_ids: fileIds,
      });

      return {
        vectorStoreId: vectorStore.id,
        fileIds: fileIds
      };
    } catch (error: any) {
      throw new Error(`Failed to create vector store: ${error.message}`);
    }
  }

  /**
   * Upload files and create vector store in one operation
   */
  async uploadAndCreateVectorStore(files: Express.Multer.File[], storeName: string): Promise<VectorStoreResult & { uploadedFiles: FileUploadResult[] }> {
    const uploadedFiles = await this.uploadFiles(files);
    const fileIds = uploadedFiles.map(f => f.fileId);
    const vectorStore = await this.createVectorStore(fileIds, storeName);

    return {
      ...vectorStore,
      uploadedFiles
    };
  }

  /**
   * Delete files from OpenAI
   */
  async deleteFiles(fileIds: string[]): Promise<void> {
    try {
      await Promise.all(fileIds.map(fileId => 
        openai.files.del(fileId).catch(err => 
          console.warn(`Failed to delete file ${fileId}:`, err.message)
        )
      ));
    } catch (error) {
      console.error('Error deleting files:', error);
    }
  }

  /**
   * Delete a vector store
   */
  async deleteVectorStore(vectorStoreId: string): Promise<void> {
    try {
      await openai.beta.vectorStores.del(vectorStoreId);
    } catch (error) {
      console.error(`Failed to delete vector store ${vectorStoreId}:`, error);
    }
  }
}

export const fileStoreService = new FileStoreService();