import OpenAI from "openai";
import fs from "fs";
import path from "path";

const DEFAULT_MODEL = "gpt-4o";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

/**
 * Faz upload de arquivos e cria um vector store com os arquivos.
 */
export async function createVectorStoreFromFiles(
  filePaths: string[],
): Promise<string> {
  try {
    // 1. Upload dos arquivos
    const uploadedFiles = await Promise.all(
      filePaths.map(async (filePath) => {
        const fileStream = fs.createReadStream(filePath);
        const uploaded = await openai.files.create({
          file: fileStream,
          purpose: "assistants",
        });
        console.log(
          `✅ Arquivo enviado: ${path.basename(filePath)} → ID: ${uploaded.id}`,
        );
        return uploaded.id;
      }),
    );

    // 2. Criação do vector store com os arquivos enviados
    const vectorStore = await openai.beta.vectorStores.create({
      name: "Vector Store Jurídico",
      file_ids: uploadedFiles,
    });

    console.log("✅ Vector Store criado:", vectorStore.id);
    return vectorStore.id;
  } catch (error) {
    console.error("❌ Erro ao criar vector store:", error);
    throw new Error("Falha ao criar vector store");
  }
}

/**
 * Gera uma resposta do GPT com acesso ao vector store (contexto legal).
 */
export async function generateGptResponse(
  message: string,
  systemInstructions: string,
  model: string = DEFAULT_MODEL,
  temperature: number = 70,
  vectorStoreId?: string,
): Promise<string> {
  try {
    // Criação de thread
    const thread = await openai.beta.threads.create();

    // Anexa mensagem do usuário
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Executa com contexto do vector store
    const run = await openai.beta.threads.runs.create(thread.id, {
      model,
      temperature: temperature / 100,
      instructions: systemInstructions,
      tools: [{ type: "file_search" }],
      vector_store_ids: vectorStoreId ? [vectorStoreId] : undefined,
    });

    // Aguardando conclusão
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== "completed" && runStatus.status !== "failed") {
      await new Promise((res) => setTimeout(res, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status === "failed")
      throw new Error("A execução do GPT falhou.");

    // Recupera mensagens da thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    const responseMessage = messages.data.find(
      (msg) => msg.role === "assistant",
    );

    return (
      responseMessage?.content?.[0]?.text?.value ||
      "Desculpe, não consegui gerar uma resposta."
    );
  } catch (error) {
    console.error("❌ Erro ao gerar resposta:", error);
    throw new Error("Erro ao processar sua mensagem.");
  }
}

/**
 * Análise jurídica de documento.
 */
export async function analyzeLegalDocument(
  documentPrompt: string,
  vectorStoreId?: string,
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
  return generateGptResponse(
    documentPrompt,
    systemPrompt,
    DEFAULT_MODEL,
    70,
    vectorStoreId,
  );
}

/**
 * Redação de resposta jurídica com base em um caso.
 */
export async function draftLegalResponse(
  caseDetails: string,
  responseType: string,
  vectorStoreId?: string,
): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado na redação de documentos legais.
    Sua tarefa é redigir um(a) ${responseType} com base nos detalhes do caso fornecido.
    Use linguagem formal e jurídica apropriada.
    Estruture o documento conforme os padrões jurídicos brasileiros.
    Inclua citações de leis e jurisprudência relevantes quando apropriado.
  `;
  return generateGptResponse(
    caseDetails,
    systemPrompt,
    DEFAULT_MODEL,
    70,
    vectorStoreId,
  );
}

/**
 * Consulta por referências legais.
 */
export async function getLegalReferences(
  query: string,
  vectorStoreId?: string,
): Promise<string> {
  const systemPrompt = `
    Você é um assistente jurídico especializado em pesquisa legal.
    Sua tarefa é fornecer referências legais relevantes para a consulta fornecida, incluindo:
    1. Leis e códigos aplicáveis
    2. Jurisprudência relevante
    3. Doutrinas e entendimentos predominantes
    4. Súmulas e orientações de tribunais superiores

    Forneça sua resposta de forma estruturada e com citações precisas.
  `;
  return generateGptResponse(
    query,
    systemPrompt,
    DEFAULT_MODEL,
    70,
    vectorStoreId,
  );
}

/**
 * Lista os modelos disponíveis.
 */
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
