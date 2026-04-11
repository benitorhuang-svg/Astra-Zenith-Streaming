import { getAstraClient } from '../../core/client';
import { GEMINI_API_KEY, isPaidTier } from '../../core/config';
import { externalApiGate } from '../../core/externalApiGate';

export class EmbeddingService {
    /**
     * Generate 768-dim Embeddings using Gemini (Batch Supported)
     */
    async getEmbeddings(inputs: (string | any[])[], isQuery = false): Promise<number[][]> {
        if (!GEMINI_API_KEY || inputs.length === 0) return inputs.map(() => new Array(768).fill(0));
        
        try {
            const client = getAstraClient(GEMINI_API_KEY);
            // Default to 004 for text-only free tier, upgrade to 2-preview for multimodal or paid
            const modelName = isPaidTier ? 'gemini-embedding-2-preview' : 'text-embedding-004';

            return await externalApiGate.runExclusive(async () => {
                const contents = inputs.map(input => ({
                    parts: Array.isArray(input) ? input : [{ text: String(input) }]
                }));

                const result = await client.models.embedContent({
                    model: modelName,
                    contents,
                    config: { 
                        outputDimensionality: 768,
                        // 🚀 TASK_TYPE_OPTIMIZATION (V2 SDK Best Practice)
                        taskType: isQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT'
                    }
                });

                // 🚀 BATCH_RESULT_HARVESTING
                const rawEmbeddings = (result as any).embeddings || [];
                return rawEmbeddings.map((emb: any) => {
                    const vector: number[] = emb.values || [];
                    if (vector.length === 0) return new Array(768).fill(0);

                    // 🧬 MRL Normalization
                    const magnitude = Math.sqrt(vector.reduce((acc, val) => acc + val * val, 0));
                    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
                });
            });
        } catch (e) {
            console.error('[EmbeddingService] Batch embedding failed:', e);
            return inputs.map(() => new Array(768).fill(0));
        }
    }

    async getEmbedding(input: string | any[], isQuery = false): Promise<number[]> {
        const results = await this.getEmbeddings([input], isQuery);
        return results[0];
    }
}

export const embeddingService = new EmbeddingService();
