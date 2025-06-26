import OpenAI from "openai";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import csv from "csv-parser";

const DEFAULT_MODEL = "gpt-4o";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Simplified vector store creation
export async function createVectorStoreFromFiles(filePaths: string[]): Promise<string> {
  try {
    // For now, we'll use a simplified approach since the vector store API has changed
    // In production, you would implement proper vector store creation with the current API
    console.log("Files would be processed for vector store:", filePaths);
    return "vector-store-placeholder";
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw new Error("Failed to create vector store");
  }
}

// Enhanced GPT response generation with file context
export async function generateGptResponse(
  message: string,
  systemInstructions: string,
  model: string = DEFAULT_MODEL,
  temperature: number = 70,
  files: string[] = []
): Promise<string> {
  try {
    let contextContent = "";
    
    // If files are provided, read their content for context
    if (files.length > 0) {
      contextContent = await readFilesContent(files);
    }

    const systemPrompt = systemInstructions + 
      (contextContent ? `\n\nContexto adicional dos documentos:\n${contextContent}` : "");

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: temperature / 100,
      max_tokens: 1000, // Reduced to ensure we stay within token limits
    });

    return response.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Erro ao gerar resposta:", error);
    throw new Error("Erro ao processar sua mensagem. Tente novamente.");
  }
}

// Helper function to read and parse different document types
async function readFilesContent(filePaths: string[]): Promise<string> {
  try {
    const maxTokensPerFile = 5000; // Limit per file to prevent token overflow
    const maxCharsPerFile = maxTokensPerFile * 3; // Rough estimate: 1 token ≈ 3 chars
    
    const contents = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const fileName = path.basename(filePath);
          const ext = path.extname(filePath).toLowerCase();
          let content = "";
          
          console.log(`Processando arquivo: ${fileName} (${ext})`);
          
          // Parse different file types
          switch (ext) {
            case '.pdf':
              // For PDF files, provide metadata and note about content
              try {
                const pdfBuffer = await fs.promises.readFile(filePath);
                const stats = await fs.promises.stat(filePath);
                content = `[Documento PDF: ${fileName}]
Tamanho: ${(pdfBuffer.length / 1024).toFixed(2)} KB
Data de modificação: ${stats.mtime.toLocaleDateString('pt-BR')}

Este é um arquivo PDF que foi enviado como contexto. 
O usuário pode fazer perguntas sobre o conteúdo deste documento.
Nome do arquivo: ${fileName}`;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                content = `[PDF File: ${fileName}]\n[Error accessing PDF: ${errorMessage}]`;
              }
              break;
              
            case '.docx':
              try {
                const docxResult = await mammoth.extractRawText({ path: filePath });
                content = docxResult.value || `[Documento Word: ${fileName}]\n[Conteúdo não pôde ser extraído]`;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                content = `[Documento Word: ${fileName}]\n[Erro ao processar: ${errorMessage}]`;
              }
              break;
              
            case '.doc':
              // For .doc files, provide file info since binary reading isn't reliable
              try {
                const stats = await fs.promises.stat(filePath);
                content = `[Documento Word Antigo: ${fileName}]
Tamanho: ${(stats.size / 1024).toFixed(2)} KB
Data de modificação: ${stats.mtime.toLocaleDateString('pt-BR')}

Este é um arquivo .doc (formato antigo do Word) que foi enviado como contexto.
Para melhor processamento, recomenda-se converter para .docx ou .txt`;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                content = `[Documento Word: ${fileName}]\n[Erro ao acessar: ${errorMessage}]`;
              }
              break;
              
            case '.csv':
              try {
                const csvData: any[] = [];
                await new Promise((resolve, reject) => {
                  fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => csvData.push(row))
                    .on('end', resolve)
                    .on('error', reject);
                });
                content = `[Arquivo CSV: ${fileName}]\n${JSON.stringify(csvData.slice(0, 50), null, 2)}${csvData.length > 50 ? '\n... (dados truncados, mostrando apenas 50 primeiras linhas)' : ''}`;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                content = `[CSV File: ${fileName}]\n[Erro ao processar: ${errorMessage}]`;
              }
              break;
              
            case '.json':
              try {
                const jsonContent = await fs.promises.readFile(filePath, 'utf-8');
                const jsonData = JSON.parse(jsonContent);
                content = `[Arquivo JSON: ${fileName}]\n${JSON.stringify(jsonData, null, 2)}`;
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                // If JSON parsing fails, try to read as plain text
                try {
                  content = await fs.promises.readFile(filePath, 'utf-8');
                } catch {
                  content = `[JSON File: ${fileName}]\n[Erro ao processar: ${errorMessage}]`;
                }
              }
              break;
              
            case '.txt':
            default:
              try {
                content = await fs.promises.readFile(filePath, 'utf-8');
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                content = `[Arquivo de texto: ${fileName}]\n[Erro ao ler: ${errorMessage}]`;
              }
              break;
          }
          
          // Truncate content if it's too large
          if (content.length > maxCharsPerFile) {
            content = content.substring(0, maxCharsPerFile) + 
              `\n\n[... Conteúdo truncado para evitar excesso de tokens. Arquivo original tem ${content.length} caracteres ...]`;
          }
          
          console.log(`Conteúdo extraído do ${fileName}: ${content.length} caracteres`);
          return `=== ${fileName} ===\n${content}\n`;
        } catch (error) {
          console.warn(`Could not read file: ${filePath}`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          return `=== ${path.basename(filePath)} ===\n[Erro ao processar arquivo: ${errorMessage}]\n`;
        }
      })
    );
    
    let result = contents.join('\n');
    
    // Final safety check - if combined content is still too large, truncate further
    const maxTotalChars = 15000; // Conservative limit for all files combined
    if (result.length > maxTotalChars) {
      result = result.substring(0, maxTotalChars) + 
        '\n\n[... Contexto truncado para respeitar limites de tokens da API ...]';
    }
    
    console.log(`Conteúdo total preparado: ${result.length} caracteres`);
    return result;
  } catch (error) {
    console.error("Error reading files:", error);
    return "";
  }
}

// Legal document analysis
export async function analyzeLegalDocument(documentText: string): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado na análise de documentos legais.
    Sua tarefa é analisar o documento fornecido e extrair:
    1. Principais pontos legais
    2. Possíveis problemas ou inconsistências
    3. Referências a leis e jurisprudência relevantes
    4. Recomendações para o magistrado

    Forneça sua análise de forma estruturada e concisa.
  `;
  return generateGptResponse(documentText, systemPrompt);
}

// Legal response drafting
export async function draftLegalResponse(caseDetails: string, responseType: string): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado na redação de documentos legais.
    Sua tarefa é redigir um(a) ${responseType} com base nos detalhes do caso fornecido.
    Use linguagem formal e jurídica apropriada.
    Estruture o documento conforme os padrões jurídicos brasileiros.
    Inclua citações de leis e jurisprudência relevantes quando apropriado.
  `;
  return generateGptResponse(caseDetails, systemPrompt);
}

// Legal references lookup
export async function getLegalReferences(query: string): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado em pesquisa legal.
    Sua tarefa é fornecer referências legais relevantes para a consulta fornecida, incluindo:
    1. Leis e códigos aplicáveis
    2. Jurisprudência relevante
    3. Doutrinas e entendimentos predominantes
    4. Súmulas e orientações de tribunais superiores

    Forneça sua resposta de forma estruturada e com citações precisas.
  `;
  return generateGptResponse(query, systemPrompt);
}

// Get available OpenAI models
export async function getAvailableModels(): Promise<string[]> {
  try {
    const list = await openai.models.list();
    const models: string[] = [];

    for await (const model of list) {
      if (
        model.id.includes("gpt") &&
        !model.id.includes("instruct") &&
        !model.id.includes("babbage") &&
        !model.id.includes("ada") &&
        !model.id.includes("davinci")
      ) {
        models.push(model.id);
      }
    }

    return models.sort().reverse();
  } catch (error) {
    console.error("Erro ao obter modelos disponíveis:", error);
    return ["gpt-4o", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"];
  }
}

export default {
  generateGptResponse,
  analyzeLegalDocument,
  draftLegalResponse,
  getLegalReferences,
  getAvailableModels,
  createVectorStoreFromFiles,
};