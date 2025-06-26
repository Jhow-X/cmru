import OpenAI from "openai";
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FileUploadResult {
  fileId: string;
  filename: string;
  size: number;
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
          const fileStream = fs.createReadStream(file.path);
          const uploadedFile = await openai.files.create({
            file: fileStream,
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
      await Promise.all(files.map(file => 
        fs.promises.unlink(file.path).catch(() => {})
      ));

      return uploadedFiles;
    } catch (error) {
      // Cleanup local files even if upload fails
      await Promise.all(files.map(file => 
        fs.promises.unlink(file.path).catch(() => {})
      ));
      throw error;
    }
  }

  /**
   * Delete files from OpenAI
   */
  async deleteFiles(fileIds: string[]): Promise<void> {
    try {
      await Promise.all(fileIds.map(fileId => 
        openai.files.del(fileId).catch((err: any) => 
          console.warn(`Failed to delete file ${fileId}:`, err.message)
        )
      ));
    } catch (error: any) {
      console.error('Error deleting files:', error);
    }
  }
}

export const fileStoreService = new FileStoreService();