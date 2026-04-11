import { HarmCategory, HarmBlockThreshold } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

/**
 * ASTRA ZENITH SERVER CONFIG
 * Atomic core configuration for environment and constants.
 */

export let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GCP_PROJECT = process.env.GCP_PROJECT || 'agent-apichat';
export const PORT = Number(process.env.PORT) || 3001;
export const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || ''; // 請將 Folder ID 放於環境變數中

// Internal State
export let currentAuthMode: 'CLI' | 'API' = 'API';
export let isPaidTier = false; 

export function setAuthMode(mode: 'CLI' | 'API') {
    currentAuthMode = mode;
}

export function setTier(paid: boolean) {
    isPaidTier = paid;
    optimizeTierModels(paid);
}

/**
 * 🛠️ IN-MEMORY REGISTRATION (Zero-Disk Storage)
 */
export function setGeminiKey(key: string) {
    GEMINI_API_KEY = key;
    process.env.GEMINI_API_KEY = key;
}

/**
 * 🚀 6-AGENT OS: MODEL_ROUTING_MAP (2026 Low-Latency Edition)
 * Base Config for the modern Agentic OS, optimized with Gemma 4 MoE & PLE architectures.
 */
export const AGENT_OS_CONFIG = {
    A1: { model: 'gemini-3.1-flash-lite-preview', role: 'ROUTER' },        // 🚀 Ultra-fast routing (First response)
    A2: { model: 'gemma-4-26b-a4b-it', role: 'COORDINATOR' }, // 🧠 MoE: Fast but deep logic
    A3: { model: 'gemini-3.1-flash-lite-preview', role: 'RESEARCHER' }, // 🌐 Grounding capable
    A4: { model: 'gemma-4-26b-a4b-it', role: 'ANALYST' },
    A5: { model: 'gemma-4-e4b-it', role: 'SUMMARIZER' },
    A6: { model: 'gemma-4-e4b-it', role: 'GUARDRAIL' }
};

// Official 2026 Model Fleet: Gemini 3.1 & Gemma 4
export const MODEL_FALLBACKS: string[] = (process.env.MODEL_FALLBACKS || 'gemini-3.1-pro-preview,gemini-3.1-flash-lite-preview,gemma-4-31b-it,gemma-4-26b-a4b-it,gemma-4-e4b-it,gemma-4-e2b-it')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

export type AgentConfigKey = keyof typeof AGENT_OS_CONFIG;

export interface AgentRoutingConfig {
    model: string;
    role: string;
}

export function getAgentConfig(id: string): AgentRoutingConfig | undefined {
    return id in AGENT_OS_CONFIG ? AGENT_OS_CONFIG[id as AgentConfigKey] : undefined;
}

/**
 * 🛰️ TIER_OPTIMIZER: Adjusts Agent models based on API Quota & Tier standards
 * 
 * [RATE_LIMITS_2026]:
 * - FREE: 15 RPM / 1,500 RPD (Flash), 2 RPM / 50 RPD (Pro)
 * - TIER_1+: 2,000 RPM (Flash), 360 RPM (Pro)
 */
export function optimizeTierModels(isPaid: boolean) {
    isPaidTier = isPaid;
    if (isPaid) {
        // High-performance routing for Paid Tier (Official 2026 Fleet)
        AGENT_OS_CONFIG.A1.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A2.model = 'gemini-3.1-pro-preview'; 
        AGENT_OS_CONFIG.A3.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A4.model = 'gemini-3.1-pro-preview';
        AGENT_OS_CONFIG.A5.model = 'gemma-4-26b-a4b-it'; // 🚀 MoE summarization for cost/speed
        AGENT_OS_CONFIG.A6.model = 'gemini-3-flash-preview';
        console.log('💎 [TIER_OPTIMIZER] Paid Tier detected: Fleet synchronized to Gemini 3.1 Pro & Gemma 4 MoE.');
    } else {
        // Extreme low-latency routing for Free Tier using Gemma 4 (PLE & MoE architectures)
        AGENT_OS_CONFIG.A1.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A2.model = 'gemma-4-26b-a4b-it';
        AGENT_OS_CONFIG.A3.model = 'gemini-3.1-flash-lite-preview'; // Required for Google Search Grounding
        AGENT_OS_CONFIG.A4.model = 'gemma-4-26b-a4b-it';
        AGENT_OS_CONFIG.A5.model = 'gemma-4-e4b-it';
        AGENT_OS_CONFIG.A6.model = 'gemma-4-e4b-it';
        console.log('🆓 [TIER_OPTIMIZER] Free Tier: Fleet optimized for EXTREME LOW LATENCY with Gemma 4 E4B & 26B-MoE.');
    }
}

/**
 * 🛡️ CONFIG_INTEGRITY_GUARD
 */
export function validateConfig() {
    if (!process.env.GEMINI_API_KEY && currentAuthMode === 'API') {
        console.warn('⚠️ [Config] GEMINI_API_KEY 未偵測到，系統將切換至受限模式或等待動態註冊。');
    }
    if (currentAuthMode === 'CLI' && !process.env.GCP_PROJECT) {
        throw new Error('❌ [Config] CLI 模式需要 GCP_PROJECT 環境變數。');
    }
}

/**
 * 🛡️ SAFETY_CONFIG (2026 Industrial Standard)
 * Comprehensive protection across all risk vectors.
 */
export const DEFAULT_SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH } // 🚀 2026 New Category
];
