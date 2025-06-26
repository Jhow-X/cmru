import OpenAI from "openai";
import fs from "fs";
import path from "path";

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

// Helper function to read and truncate file contents to manage token limits
async function readFilesContent(filePaths: string[]): Promise<string> {
  try {
    const maxTokensPerFile = 5000; // Limit per file to prevent token overflow
    const maxCharsPerFile = maxTokensPerFile * 3; // Rough estimate: 1 token ≈ 3 chars
    
    const contents = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          let content = await fs.promises.readFile(filePath, 'utf-8');
          const fileName = path.basename(filePath);
          
          // Truncate content if it's too large
          if (content.length > maxCharsPerFile) {
            content = content.substring(0, maxCharsPerFile) + 
              `\n\n[... Conteúdo truncado para evitar excesso de tokens. Arquivo original tem ${content.length} caracteres ...]`;
          }
          
          return `=== ${fileName} ===\n${content}\n`;
        } catch (error) {
          console.warn(`Could not read file: ${filePath}`, error);
          return `=== ${path.basename(filePath)} ===\n[Arquivo não pôde ser lido]\n`;
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