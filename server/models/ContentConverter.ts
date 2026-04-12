import { type Content, type Part } from '@google/genai';
import { StreamMessage } from './AgentTypes';

/**
 * ContentConverter — Unified Content Conversion Logic
 */
export class ContentConverter {
    public static toGeminiContents(messages: StreamMessage[]): Content[] {
        return messages
            .filter(m => (m.content && m.content.trim() !== '') || (m.parts && m.parts.length > 0))
            .map(m => {
                let role = (m.role || 'user').toLowerCase();
                if (role === 'assistant' || role === 'bot' || role === 'model') role = 'model';
                else role = 'user';
                
                const parts: Part[] = m.parts || [{ text: m.content || "" }];
                return { role, parts };
            });
    }

    public static toGeminiParts(content: string | any[]): Part[] {
        return Array.isArray(content) ? content : [{ text: content }];
    }
}
