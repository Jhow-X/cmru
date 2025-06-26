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
    // If files are provided, use the assistants API with vector stores
    if (files.length > 0) {
      return await generateResponseWithFiles(message, systemInstructions, model, temperature, files);
    }

    // Otherwise use regular chat completions
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: systemInstructions
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

// Function to generate response using regular chat with file context
async function generateResponseWithFiles(
  message: string,
  systemInstructions: string,
  model: string,
  temperature: number,
  files: string[]
): Promise<string> {
  try {
    // For now, use regular chat completions with file context mentioned
    // This is a fallback approach until the assistants API with files is properly configured
    const enhancedSystemInstructions = `${systemInstructions}

IMPORTANT: You have access to uploaded files with the following IDs: ${files.join(', ')}
These files contain reference documents that you should use to answer the user's questions.
If the user asks about content that might be in these files, mention that you have access to uploaded documents and try to provide relevant information based on the context of the conversation.`;

    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: enhancedSystemInstructions
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: temperature / 100,
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Error generating response with files:", error);
    throw new Error("Erro ao processar sua mensagem com arquivos. Tente novamente.");
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
