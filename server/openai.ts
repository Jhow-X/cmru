import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Function to generate a response using Assistants API with file search
export async function generateGptResponse(
  message: string,
  systemInstructions: string,
  model: string = DEFAULT_MODEL,
  temperature: number = 70,
  files: string[] = [],
): Promise<string> {
  try {
    // If no files are provided, use basic chat completions
    if (!files || files.length === 0) {
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "system",
            content: systemInstructions,
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: temperature / 100, // Convert 0-100 to 0-1
        max_tokens: 2000,
      });

      return (
        response.choices[0].message.content ||
        "Desculpe, não consegui gerar uma resposta."
      );
    }

    // For GPTs with files, use Assistants API with file search
    return await generateResponseWithFileSearch(message, systemInstructions, model, temperature, files);
  } catch (error) {
    console.error("Error generating GPT response:", error);
    throw new Error("Erro ao processar sua mensagem. Tente novamente.");
  }
}

// Function to generate response using Assistants API with file search
async function generateResponseWithFileSearch(
  message: string,
  systemInstructions: string,
  model: string,
  temperature: number,
  files: string[],
): Promise<string> {
  try {
    // Create or retrieve assistant with file search enabled
    const assistant = await openai.beta.assistants.create({
      name: `GPT-Assistant-${Date.now()}`,
      instructions: systemInstructions,
      model: model,
      tools: [{ type: "file_search" }],
      temperature: temperature / 100,
    });

    // Upload files to OpenAI if they exist locally
    const fileObjects = [];
    for (const fileName of files) {
      try {
        const filePath = `public/uploads/${fileName}`;
        const fileStream = fs.createReadStream(filePath);
        
        const file = await openai.files.create({
          file: fileStream,
          purpose: "assistants",
        });
        
        fileObjects.push(file);
      } catch (fileError) {
        console.error(`Error uploading file ${fileName}:`, fileError);
        // Continue with other files if one fails
      }
    }

    // Create vector store and add files
    let vectorStoreId: string | undefined;
    if (fileObjects.length > 0) {
      const vectorStore = await openai.vectorStores.create({
        name: `chat-vectorstore-${Date.now()}`,
      });
      
      // Add files to vector store
      for (const file of fileObjects) {
        await openai.vectorStores.files.create(vectorStore.id, {
          file_id: file.id,
        });
      }
      
      vectorStoreId = vectorStore.id;
      
      // Update assistant with vector store
      await openai.beta.assistants.update(assistant.id, {
        tool_resources: {
          file_search: { vector_store_ids: [vectorStoreId] },
        },
      });
    }

    // Create thread
    const thread = await openai.beta.threads.create();

    // Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // Poll for completion (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      if (attempts >= maxAttempts) {
        throw new Error("Timeout aguardando resposta do assistente");
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status === "completed") {
      // Get messages from thread
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === "assistant");
      
      if (assistantMessage && assistantMessage.content[0].type === "text") {
        // Cleanup: delete assistant and vector store
        try {
          await openai.beta.assistants.del(assistant.id);
          if (vectorStoreId) {
            await openai.vectorStores.del(vectorStoreId);
          }
        } catch (cleanupError) {
          console.error("Error during cleanup:", cleanupError);
        }
        
        return assistantMessage.content[0].text.value;
      }
    } else if (runStatus.status === "failed") {
      throw new Error(`Assistente falhou: ${runStatus.last_error?.message || "Erro desconhecido"}`);
    }

    throw new Error("Não foi possível obter resposta do assistente");
  } catch (error) {
    console.error("Error in generateResponseWithFileSearch:", error);
    throw new Error("Erro ao processar mensagem com arquivos. Tente novamente.");
  }
}

// Function to create a vector store with files
export async function createVectorStore(
  name: string,
  filePaths: string[],
): Promise<string> {
  try {
    // Convert file paths to readable streams
    const fileStreams = filePaths.map((path) => fs.createReadStream(path));

    // Create a vector store and upload the files
    const vectorStore = await openai.vectorStores.create({
      name,
    });

    await openai.vectorStores.fileBatches.uploadAndPoll(
      vectorStore.id,
      { files: fileStreams },
    );

    return vectorStore.id; // Return the ID of the created vector store
  } catch (error) {
    console.error("Erro ao criar o vector store:", error);
    throw new Error("Houve um erro ao criar o armazenamento vetorial.");
  }
}

// Function to attach vector store to an assistant
export async function attachVectorStoreToAssistant(
  assistantId: string,
  vectorStoreId: string,
): Promise<void> {
  try {
    await openai.beta.assistants.update(assistantId, {
      tool_resources: {
        file_search: { vector_store_ids: [vectorStoreId] },
      },
    });
    console.log(`Vector store ${vectorStoreId} attached to assistant ${assistantId}`);
  } catch (error) {
    console.error("Erro ao vincular o vector store ao assistente:", error);
    throw new Error("Não foi possível vincular o vector store ao assistente.");
  }
}

// Function to create a new assistant with file search enabled
export async function createAssistantWithFileSearch(
  name: string,
  systemInstructions: string,
): Promise<string> {
  try {
    const assistant = await openai.beta.assistants.create({
      name,
      instructions: systemInstructions,
      model: DEFAULT_MODEL,
      tools: [{ type: "file_search" }],
    });

    return assistant.id; // Return the ID of the created assistant
  } catch (error) {
    console.error("Erro ao criar o assistente:", error);
    throw new Error("Não foi possível criar o assistente.");
  }
}

// Function to create a thread and attach files
export async function createThreadWithFiles(
  assistantId: string,
  message: string,
  filePaths: string[],
): Promise<string> {
  try {
    // Convert file paths to readable streams and upload them
    const fileAttachments = await Promise.all(
      filePaths.map(async (path) => {
        const file = await openai.files.create({
          file: fs.createReadStream(path),
          purpose: "assistants",
        });
        return { file_id: file.id, tools: [{ type: "file_search" as const }] };
      }),
    );

    // Create the thread with attachments
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: "user",
          content: message,
          attachments: fileAttachments,
        },
      ],
      tool_resources: {
        file_search: { vector_store_ids: [] }, // Attach vector stores if necessary
      },
    });

    return thread.id; // Return the ID of the created thread
  } catch (error) {
    console.error("Erro ao criar a thread com arquivos:", error);
    throw new Error("Falha ao criar a thread com os arquivos fornecidos.");
  }
}

// Function to list all vector stores
export async function listVectorStores(): Promise<string[]> {
  try {
    const vectorStores = await openai.vectorStores.list();
    const names = vectorStores.data.map((store: any) => `${store.id} - ${store.name}`);
    return names;
  } catch (error) {
    console.error("Erro ao listar vector stores:", error);
    throw new Error("Não foi possível recuperar a lista de vector stores.");
  }
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
  createVectorStore,
  attachVectorStoreToAssistant,
  createAssistantWithFileSearch,
  createThreadWithFiles,
  listVectorStores,
  getAvailableModels,
};
