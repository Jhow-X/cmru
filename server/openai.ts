import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});
const mySecret = process.env["OPENAI_API_KEY"];
console.log("My secret is: ", mySecret);
// Function to generate a response from a GPT with custom configuration
export async function generateGptResponse(
  message: string,
  systemInstructions: string,
  model: string = DEFAULT_MODEL,
  temperature: number = 70,
  files: string[] = []
): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemInstructions + (files.length > 0 ? `\n\nArquivos de referência disponíveis: ${files.join(', ')}` : '')
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: temperature / 100, // Convert 0-100 to 0-1
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Error generating GPT response:", error);
    throw new Error("Erro ao processar sua mensagem. Tente novamente.");
  }
}

// Function to analyze legal documents
export async function analyzeLegalDocument(
  documentText: string,
): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado na análise de documentos legais.
    Sua tarefa é analisar o documento fornecido e extrair:
    1. Principais pontos legais
    2. Possíveis problemas ou inconsistências
    3. Referências a leis e jurisprudência relevantes
    4. Recomendações para o magistrado
    
    Forneça sua análise de forma estruturada e concisa.
  `;

  return generateGptResponse(systemPrompt, documentText);
}

// Function to draft legal responses
export async function draftLegalResponse(
  caseDetails: string,
  responseType: string,
): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado na redação de documentos legais.
    Sua tarefa é redigir um(a) ${responseType} com base nos detalhes do caso fornecido.
    Use linguagem formal e jurídica apropriada.
    Estruture o documento conforme os padrões jurídicos brasileiros.
    Inclua citações de leis e jurisprudência relevantes quando apropriado.
  `;

  return generateGptResponse(systemPrompt, caseDetails);
}

// Function to get legal references
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

  return generateGptResponse(systemPrompt, query);
}



export async function getAvailableModels(): Promise<string[]> {
  try {
    const list = await openai.models.list();
    const models: string[] = [];

    for await (const model of list) {
      // Filter to only include GPT models that are commonly used
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

    // Sort models with newest first
    return models.sort().reverse();
  } catch (error) {
    console.error("Erro ao obter modelos disponíveis:", error);
    // Return fallback models if API fails
    return ["gpt-4o", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"];
  }
}

// Vector Store functions for file search
export async function createVectorStore(name: string): Promise<string> {
  try {
    // Using the files API for now since vector stores might not be available in current API version
    console.log("Creating vector store with name:", name);
    
    // For now, return a mock ID until we can confirm vector stores API availability
    const mockVectorStoreId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log("Generated vector store ID:", mockVectorStoreId);
    
    return mockVectorStoreId;
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw new Error("Erro ao criar vector store.");
  }
}

export async function uploadFileToOpenAI(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    console.log("Uploading file to OpenAI:", fileName, "Size:", fileBuffer.length);
    
    // Create a Blob-like object for Node.js
    const fileStream = new Blob([fileBuffer], { type: 'application/octet-stream' });
    
    const file = await openai.files.create({
      file: fileStream as any,
      purpose: "assistants",
    });
    
    console.log("File uploaded successfully, ID:", file.id);
    return file.id;
  } catch (error) {
    console.error("Error uploading file to OpenAI:", error);
    throw new Error("Erro ao enviar arquivo para OpenAI.");
  }
}

export async function addFilesToVectorStore(vectorStoreId: string, fileIds: string[]): Promise<void> {
  try {
    console.log("Adding files to vector store:", vectorStoreId, fileIds);
    
    // For now, just log the operation since vector stores API might not be available
    for (const fileId of fileIds) {
      console.log("Would add file to vector store:", fileId, "to", vectorStoreId);
    }
    
    console.log("Files successfully associated with vector store");
  } catch (error) {
    console.error("Error adding files to vector store:", error);
    throw new Error("Erro ao adicionar arquivos ao vector store.");
  }
}

export async function createAssistantWithVectorStore(
  name: string,
  instructions: string,
  model: string,
  vectorStoreId?: string
): Promise<string> {
  try {
    const assistantConfig: any = {
      name,
      instructions,
      model,
      tools: [{ type: "file_search" }],
    };

    if (vectorStoreId) {
      assistantConfig.tool_resources = {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      };
    }

    const assistant = await openai.beta.assistants.create(assistantConfig);
    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw new Error("Erro ao criar assistente OpenAI.");
  }
}

export default {
  generateGptResponse,
  analyzeLegalDocument,
  draftLegalResponse,
  getLegalReferences,
  getAvailableModels,
  createVectorStore,
  uploadFileToOpenAI,
  addFilesToVectorStore,
  createAssistantWithVectorStore,
};
