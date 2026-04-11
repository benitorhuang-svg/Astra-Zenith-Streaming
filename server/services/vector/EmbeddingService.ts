import { getAstraClient } from '../../core/client';
import { GEMINI_API_KEY, isPaidTier } from '../../core/config';
import { externalApiGate } from '../../core/externalApiGate';

export class EmbeddingService {
    /**
     * Generate 768-dim Embedding using Gemini
     * Tier-Aware: Free -> 004 / Paid -> 2-preview (Multimodal)
     */
    async getEmbedding(input: string | any[]): Promise<number[]> {
        if (!GEMINI_API_KEY) return new Array(768).fill(0);
        
        try {
            const client = getAstraClient(GEMINI_API_KEY);
            // Default to 004 for text-only free tier, upgrade to 2-preview for multimodal or paid
            const modelName = isPaidTier || Array.isArray(input) ? 'gemini-embedding-2-preview' : 'text-embedding-004';

            return await externalApiGate.runExclusive(async () => {
                try {
                    const contentParts = Array.isArray(input) ? input : [{ text: input }];

                    const result = await client.models.embedContent({
                        model: modelName,
                        contents: [{ parts: contentParts }],
                        config: { outputDimensionality: 768 }
                    });

                    let vector = result.embeddings?.[0]?.values ?? result.embedding?.values ?? [];

                    // Manual Normalization for truncated vectors (MRL Standard)
                    if (isPaidTier && vector.length > 0) {
                        const magnitude = Math.sqrt(vector.reduce((acc: number, val: number) => acc + val * val, 0));
                        if (magnitude > 0) {
                            vector = vector.map((v: number) => v / magnitude);
                        }
                    }

                    return vector;
                } catch (error) {
                    console.warn(`[EmbeddingService] Primary model failed: ${modelName}`, error);
                    // Fallback to stable 004
                    const fallbackText = Array.isArray(input) ? (input[0] as any).text : input;
                    const res = await client.models.embedContent({
                        model: 'text-embedding-004',
                        contents: [{ parts: [{ text: fallbackText }] }],
                        config: { outputDimensionality: 768 }
                    });
                    return res.embeddings?.[0]?.values ?? res.embedding?.values ?? new Array(768).fill(0);
                }
            });
        } catch (e) {
            console.error('[EmbeddingService] Embedding failed:', e);
            return new Array(768).fill(0);
        }
    }
}

export const embeddingService = new EmbeddingService();
