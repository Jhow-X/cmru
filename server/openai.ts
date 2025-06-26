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

// Vector Store Integration Functions

// Create an assistant with file search enabled
export async function createAssistantWithFileSearch(
  name: string,
  instructions: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  try {
    const assistant = await openai.beta.assistants.create({
      name: name,
      instructions: instructions,
      model: model,
      tools: [{ type: "file_search" }],
    });
    return assistant.id;
  } catch (error) {
    console.error("Error creating assistant:", error);
    throw new Error("Erro ao criar assistente");
  }
}

// Create a vector store and upload files
export async function createVectorStoreWithFiles(
  name: string,
  files: Express.Multer.File[]
): Promise<string> {
  try {
    // Create vector store
    const vectorStore = await openai.vectorStores.create({
      name: name,
    });

    // Upload files to vector store if any files provided
    if (files && files.length > 0) {
      // Convert files to OpenAI File objects
      const uploadedFiles = [];
      for (const file of files) {
        const openaiFile = await openai.files.create({
          file: new File([file.buffer], file.originalname, { type: file.mimetype }),
          purpose: "assistants",
        });
        uploadedFiles.push(openaiFile);
      }

      // Add files to vector store
      await openai.vectorStores.fileBatches.create(vectorStore.id, {
        file_ids: uploadedFiles.map(f => f.id)
      });
    }

    return vectorStore.id;
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw new Error("Erro ao criar base de conhecimento");
  }
}

// Update assistant to use vector store
export async function updateAssistantWithVectorStore(
  assistantId: string,
  vectorStoreId: string
): Promise<void> {
  try {
    await openai.beta.assistants.update(assistantId, {
      tool_resources: { 
        file_search: { 
          vector_store_ids: [vectorStoreId] 
        } 
      },
    });
  } catch (error) {
    console.error("Error updating assistant:", error);
    throw new Error("Erro ao atualizar assistente");
  }
}

// Create thread with file attachments
export async function createThreadWithAttachments(
  message: string,
  files: Express.Multer.File[] = []
): Promise<string> {
  try {
    let attachments: any[] = [];
    
    if (files && files.length > 0) {
      // Upload files for thread attachments
      for (const file of files) {
        const uploadedFile = await openai.files.create({
          file: new File([file.buffer], file.originalname, { type: file.mimetype }),
          purpose: "assistants",
        });
        
        attachments.push({
          file_id: uploadedFile.id,
          tools: [{ type: "file_search" }]
        });
      }
    }

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: message,
          attachments: attachments
        },
      ],
    });

    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw new Error("Erro ao criar conversa");
  }
}

// Generate response using assistant with vector store
export async function generateAssistantResponse(
  assistantId: string,
  threadId: string,
  message: string
): Promise<string> {
  try {
    // Add message to thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.content[0].type === 'text') {
        return lastMessage.content[0].text.value;
      }
    }

    throw new Error("Assistente não conseguiu processar a mensagem");
  } catch (error) {
    console.error("Error generating assistant response:", error);
    throw new Error("Erro ao processar mensagem com assistente");
  }
}

export default {
  generateGptResponse,
  analyzeLegalDocument,
  draftLegalResponse,
  getLegalReferences,
  getAvailableModels,
  createAssistantWithFileSearch,
  createVectorStoreWithFiles,
  updateAssistantWithVectorStore,
  createThreadWithAttachments,
  generateAssistantResponse,
};
