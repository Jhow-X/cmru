import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Generate GPT response using the chat completions API
export async function generateGptResponse(
  prompt: string,
  systemInstructions: string = "Você é um assistente jurídico especializado em direito brasileiro.",
  model: string = DEFAULT_MODEL,
  temperature: number = 0.7,
  files: string[] = []
): Promise<string> {
  try {
    let context = "";
    
    // If files are provided, read them for context
    if (files && files.length > 0) {
      context = await getFileContext(files);
    }

    const messages = [
      { role: "system", content: systemInstructions },
      ...(context ? [{ role: "system", content: `Contexto adicional dos documentos:\n${context}` }] : []),
      { role: "user", content: prompt }
    ];

    const response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      temperature: temperature / 100, // Convert percentage to decimal
      max_tokens: 2000,
    });

    return response.choices[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";
  } catch (error) {
    console.error("Erro na API OpenAI:", error);
    throw new Error("Falha ao gerar resposta. Verifique sua conexão e tente novamente.");
  }
}

// Helper function to read file context
async function getFileContext(filePaths: string[]): Promise<string> {
  try {
    const contexts = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          return `=== ${filePath} ===\n${content}\n`;
        } catch (error) {
          console.warn(`Não foi possível ler o arquivo: ${filePath}`);
          return "";
        }
      })
    );
    return contexts.join('\n');
  } catch (error) {
    console.error("Erro ao ler contexto dos arquivos:", error);
    return "";
  }
}

// Analyze legal document
export async function analyzeLegalDocument(
  documentContent: string,
  analysisType: string = "general"
): Promise<string> {
  const systemPrompt = `Você é um especialista em análise jurídica. Analise o documento fornecido e forneça insights relevantes sobre:
- Aspectos legais principais
- Possíveis problemas ou inconsistências
- Recomendações práticas
- Referências legais aplicáveis`;

  const userPrompt = `Tipo de análise: ${analysisType}\n\nDocumento:\n${documentContent}`;

  return await generateGptResponse(userPrompt, systemPrompt);
}

// Draft legal response
export async function draftLegalResponse(
  caseDetails: string,
  responseType: string = "formal"
): Promise<string> {
  const systemPrompt = `Você é um assistente jurídico especializado em redigir documentos legais. 
  Crie uma resposta profissional baseada nos detalhes do caso fornecidos. 
  Use linguagem jurídica apropriada e estruture a resposta de forma clara e profissional.`;

  const userPrompt = `Tipo de resposta: ${responseType}\n\nDetalhes do caso:\n${caseDetails}`;

  return await generateGptResponse(userPrompt, systemPrompt);
}

// Get legal references
export async function getLegalReferences(query: string): Promise<string> {
  const systemPrompt = `Você é um especialista em direito brasileiro. Forneça referências legais relevantes, 
  incluindo leis, códigos, jurisprudências e doutrinas aplicáveis à consulta.`;

  return await generateGptResponse(query, systemPrompt);
}

// Get available models
export async function getAvailableModels(): Promise<string[]> {
  try {
    const models = await openai.models.list();
    return models.data
      .filter(model => model.id.includes('gpt'))
      .map(model => model.id)
      .sort();
  } catch (error) {
    console.error("Erro ao buscar modelos:", error);
    return [DEFAULT_MODEL];
  }
}

// Create vector store from files (simplified version)
export async function createVectorStoreFromFiles(filePaths: string[]): Promise<string> {
  // For now, we'll return a placeholder since the vector store API is complex
  // In a production environment, you would implement proper vector store creation
  console.log("Arquivos para vector store:", filePaths);
  return "vector-store-placeholder";
}