import { FlagEmbedding, EmbeddingModel } from "fastembed";
import { chunkCode, weightedPooling } from "./utils.js";

export async function vectorizeCodeDocument(codeString: string) {
  const flagEmbedding = await FlagEmbedding.init({
    model: EmbeddingModel.BGESmallENV15,
    maxLength: 512,
  });

  // For smaller documents, use directly
  if (codeString.length < 400) {
    const embedding = await flagEmbedding.queryEmbed(codeString);
    return embedding[0]; // Ensure we return a single vector
  }

  // Use overlapping chunks for better context capture
  const chunks = chunkCode(codeString, 400);

  // Generate embeddings for all chunks
  const embeddingsGenerator = flagEmbedding.embed(chunks);
  let allEmbeddings: number[][] = [];

  for await (const embeddings of embeddingsGenerator) {
    allEmbeddings = [...allEmbeddings, ...embeddings];
  }

  // First chunk has the function signature, so give it more weight
  const weights = new Array(allEmbeddings.length).fill(1);
  weights[0] = 1.2;

  // Compute weighted pooling
  let pooledEmbedding = weightedPooling(allEmbeddings, weights);

  // Normalize the final vector
  const magnitude = Math.sqrt(
    pooledEmbedding.reduce((sum, val) => sum + val * val, 0)
  );

  return pooledEmbedding.map((val) => val / magnitude);
}
