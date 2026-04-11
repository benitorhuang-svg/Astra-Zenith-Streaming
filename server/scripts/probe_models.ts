import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function probe() {
    console.log('🔍 正在探測可用模型 (Probe Start)...');
    if (!GEMINI_API_KEY) {
        console.error('❌ 找不到 API KEY，請確認 .env 存在。');
        return;
    }

    try {
        const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY, apiVersion: 'v1beta' });
        
        // 嘗試從 v1beta 獲取
        console.log('📡 嘗試端點: v1beta');
        const models = await client.models.list();
        for await (const m of models) {
            console.log(`[MODEL]: ${m.name}`);
        }
        
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('❌ 探測失敗:', message);
    }
}

probe();
