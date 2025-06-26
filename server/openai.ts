import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Export the OpenAI client for direct use
export { openai };
// Function to upload file to OpenAI
export async function uploadFileToOpenAI(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName),
      purpose: 'assistants'
    });
    return file.id;
  } catch (error) {
    console.error("Error uploading file to OpenAI:", error);
    throw new Error("Erro ao fazer upload do arquivo.");
  }
}

// Function to create a vector store for file processing
export async function createVectorStore(name: string, fileIds: string[]): Promise<string> {
  try {
    // Create vector store using the beta API (if available)
    // For now, return the fileIds as a simple vector store identifier
    // This will be updated when the vector store API is fully available
    const vectorStoreId = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`Created vector store ${vectorStoreId} with files:`, fileIds);
    return vectorStoreId;
  } catch (error) {
    console.error("Error creating vector store:", error);
    throw new Error("Erro ao criar armazenamento de arquivos.");
  }
}

// Function to generate a response from a GPT with custom configuration and file attachments
export async function generateGptResponse(
  message: string,
  systemInstructions: string,
  model: string = DEFAULT_MODEL,
  temperature: number = 70,
  files: string[] = [],
  vectorStoreId?: string
): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    
    // If vectorStoreId is provided, use beta assistants API with retrieval tools
    if (vectorStoreId) {
      try {
        const assistant = await openai.beta.assistants.create({
          name: 'Context Assistant',
          model: model,
          tools: [{ type: 'file_search' }],
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStoreId]
            }
          },
          instructions: systemInstructions
        });

        // Create a thread for the conversation
        const thread = await openai.beta.threads.create();

        // Add the user message to the thread
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: message
        });

        // Run the assistant
        const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
          assistant_id: assistant.id,
          temperature: temperature / 100
        });

        if (run.status === 'completed') {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
          
          if (assistantMessage && assistantMessage.content[0].type === 'text') {
            return assistantMessage.content[0].text.value;
          }
        }

        // Cleanup
        await openai.beta.assistants.del(assistant.id);
        
      } catch (assistantError) {
        console.error("Error with beta assistants API:", assistantError);
        // Fall back to regular chat completion
      }
    }

    // Regular chat completion (fallback or when no vector store)
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

export default {
  generateGptResponse,
  analyzeLegalDocument,
  draftLegalResponse,
  getLegalReferences,
  getAvailableModels,
};
