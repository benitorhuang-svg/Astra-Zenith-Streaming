"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
async function probe() {
    console.log('🔍 正在探測可用模型 (Probe Start)...');
    if (!GEMINI_API_KEY) {
        console.error('❌ 找不到 API KEY，請確認 .env 存在。');
        return;
    }
    try {
        const client = new genai_1.GoogleGenAI({ apiKey: GEMINI_API_KEY, apiVersion: 'v1beta' });
        // 嘗試從 v1beta 獲取
        console.log('📡 嘗試端點: v1beta');
        const models = await client.models.list();
        for await (const m of models) {
            console.log(`[MODEL]: ${m.name}`);
        }
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('❌ 探測失敗:', message);
    }
}
probe();
