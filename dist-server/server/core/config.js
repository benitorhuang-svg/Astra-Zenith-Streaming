"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SAFETY_SETTINGS = exports.MODEL_FALLBACKS = exports.AGENT_OS_CONFIG = exports.isPaidTier = exports.currentAuthMode = exports.GOOGLE_DRIVE_FOLDER_ID = exports.PORT = exports.GCP_PROJECT = exports.GEMINI_API_KEY = void 0;
exports.setAuthMode = setAuthMode;
exports.setTier = setTier;
exports.setGeminiKey = setGeminiKey;
exports.getAgentConfig = getAgentConfig;
exports.optimizeTierModels = optimizeTierModels;
exports.validateConfig = validateConfig;
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/**
 * ASTRA ZENITH SERVER CONFIG
 * Atomic core configuration for environment and constants.
 */
exports.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
exports.GCP_PROJECT = process.env.GCP_PROJECT || 'web-sdk-chat';
exports.PORT = Number(process.env.PORT) || 3001;
exports.GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || ''; // 請將 Folder ID 放於環境變數中
// Internal State
exports.currentAuthMode = 'API';
exports.isPaidTier = false;
function setAuthMode(mode) {
    exports.currentAuthMode = mode;
}
function setTier(paid) {
    exports.isPaidTier = paid;
    optimizeTierModels(paid);
}
/**
 * 🛠️ IN-MEMORY REGISTRATION (Zero-Disk Storage)
 */
function setGeminiKey(key) {
    exports.GEMINI_API_KEY = key;
    process.env.GEMINI_API_KEY = key;
}
/**
 * 🚀 6-AGENT OS: MODEL_ROUTING_MAP (2026 Low-Latency Edition)
 * Base Config for the modern Agentic OS, optimized with Gemma 4 MoE & PLE architectures.
 */
exports.AGENT_OS_CONFIG = {
    A1: { model: 'gemini-3.1-flash-lite-preview', role: 'ROUTER' }, // 🚀 Ultra-fast routing (First response)
    A2: { model: 'gemma-4-26b-a4b-it', role: 'COORDINATOR' }, // 🧠 MoE: Fast but deep logic
    A3: { model: 'gemini-3.1-flash-lite-preview', role: 'RESEARCHER' }, // 🌐 Grounding capable
    A4: { model: 'gemma-4-26b-a4b-it', role: 'ANALYST' },
    A5: { model: 'gemma-4-e4b-it', role: 'SUMMARIZER' },
    A6: { model: 'gemma-4-e4b-it', role: 'GUARDRAIL' }
};
// Official 2026 Model Fleet: Gemini 3.1 & Gemma 4
exports.MODEL_FALLBACKS = (process.env.MODEL_FALLBACKS || 'gemini-3.1-pro-preview,gemini-3.1-flash-lite-preview,gemma-4-31b-it,gemma-4-26b-a4b-it,gemma-4-e4b-it,gemma-4-e2b-it')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
function getAgentConfig(id) {
    return id in exports.AGENT_OS_CONFIG ? exports.AGENT_OS_CONFIG[id] : undefined;
}
/**
 * 🛰️ TIER_OPTIMIZER: Adjusts Agent models based on API Quota & Tier standards
 *
 * [RATE_LIMITS_2026]:
 * - FREE: 15 RPM / 1,500 RPD (Flash), 2 RPM / 50 RPD (Pro)
 * - TIER_1+: 2,000 RPM (Flash), 360 RPM (Pro)
 */
function optimizeTierModels(isPaid) {
    exports.isPaidTier = isPaid;
    if (isPaid) {
        // High-performance routing for Paid Tier (Official 2026 Fleet)
        exports.AGENT_OS_CONFIG.A1.model = 'gemini-3.1-flash-lite-preview';
        exports.AGENT_OS_CONFIG.A2.model = 'gemini-3.1-pro-preview';
        exports.AGENT_OS_CONFIG.A3.model = 'gemini-3.1-flash-lite-preview';
        exports.AGENT_OS_CONFIG.A4.model = 'gemini-3.1-pro-preview';
        exports.AGENT_OS_CONFIG.A5.model = 'gemma-4-26b-a4b-it'; // 🚀 MoE summarization for cost/speed
        exports.AGENT_OS_CONFIG.A6.model = 'gemini-3-flash-preview';
        console.log('💎 [TIER_OPTIMIZER] Paid Tier detected: Fleet synchronized to Gemini 3.1 Pro & Gemma 4 MoE.');
    }
    else {
        // Extreme low-latency routing for Free Tier using Gemma 4 (PLE & MoE architectures)
        exports.AGENT_OS_CONFIG.A1.model = 'gemini-3.1-flash-lite-preview';
        exports.AGENT_OS_CONFIG.A2.model = 'gemma-4-26b-a4b-it';
        exports.AGENT_OS_CONFIG.A3.model = 'gemini-3.1-flash-lite-preview'; // Required for Google Search Grounding
        exports.AGENT_OS_CONFIG.A4.model = 'gemma-4-26b-a4b-it';
        exports.AGENT_OS_CONFIG.A5.model = 'gemma-4-e4b-it';
        exports.AGENT_OS_CONFIG.A6.model = 'gemma-4-e4b-it';
        console.log('🆓 [TIER_OPTIMIZER] Free Tier: Fleet optimized for EXTREME LOW LATENCY with Gemma 4 E4B & 26B-MoE.');
    }
}
/**
 * 🛡️ CONFIG_INTEGRITY_GUARD
 */
function validateConfig() {
    if (!process.env.GEMINI_API_KEY && exports.currentAuthMode === 'API') {
        console.warn('⚠️ [Config] GEMINI_API_KEY 未偵測到，系統將切換至受限模式或等待動態註冊。');
    }
    if (exports.currentAuthMode === 'CLI' && !process.env.GCP_PROJECT) {
        throw new Error('❌ [Config] CLI 模式需要 GCP_PROJECT 環境變數。');
    }
}
/**
 * 🛡️ SAFETY_CONFIG (2026 Industrial Standard)
 * Comprehensive protection across all risk vectors.
 */
exports.DEFAULT_SAFETY_SETTINGS = [
    { category: genai_1.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: genai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: genai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: genai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: genai_1.HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: genai_1.HarmBlockThreshold.BLOCK_ONLY_HIGH } // 🚀 2026 New Category
];
