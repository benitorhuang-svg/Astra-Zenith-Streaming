import dotenv from 'dotenv';
dotenv.config();

/**
 * ASTRA ZENITH SERVER CONFIG
 * Atomic core configuration for environment and constants.
 */

export let GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GCP_PROJECT = process.env.GCP_PROJECT || 'web-sdk-chat';
export const PORT = 3001;

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
 * 🚀 6-AGENT OS: MODEL_ROUTING_MAP (2026 Gemini 2.0 Stable)
 * Base Config for the modern Agentic OS.
 */
export const AGENT_OS_CONFIG = {
    A1: { model: 'gemini-3-flash-preview', role: 'ROUTER' },
    A2: { model: 'gemini-3.1-flash-lite-preview', role: 'COORDINATOR' },
    A3: { model: 'gemini-3.1-flash-lite-preview', role: 'RESEARCHER' },
    A4: { model: 'gemini-3.1-flash-lite-preview', role: 'ANALYST' },
    A5: { model: 'gemini-3.1-flash-lite-preview', role: 'SUMMARIZER' },
    A6: { model: 'gemini-3-flash-preview', role: 'GUARDRAIL' }
};

// Official 2026 Model Fleet: Gemini 3.1 & Gemma 4
export const MODEL_FALLBACKS: string[] = (process.env.MODEL_FALLBACKS || 'gemini-3.1-pro-preview,gemini-3.1-flash-lite-preview,gemma-4-31b-it,gemma-4-26b-a4b-it')
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
        AGENT_OS_CONFIG.A1.model = 'gemini-3-flash-preview';
        AGENT_OS_CONFIG.A2.model = 'gemini-3.1-pro-preview'; 
        AGENT_OS_CONFIG.A3.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A4.model = 'gemini-3.1-pro-preview';
        AGENT_OS_CONFIG.A5.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A6.model = 'gemini-3-flash-preview';
        console.log('💎 [TIER_OPTIMIZER] Paid Tier detected: Fleet synchronized to Gemini 3.1 Pro Preview.');
    } else {
        // Efficiency routing for Free Tier (Official 2026 Fleet)
        AGENT_OS_CONFIG.A1.model = 'gemini-3-flash-preview';
        AGENT_OS_CONFIG.A2.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A3.model = 'gemini-2.5-flash-lite';
        AGENT_OS_CONFIG.A4.model = 'gemini-3.1-flash-lite-preview';
        AGENT_OS_CONFIG.A5.model = 'gemini-2.5-flash-lite';
        AGENT_OS_CONFIG.A6.model = 'gemini-3-flash-preview';
        console.log('🆓 [TIER_OPTIMIZER] Free Tier: Fleet optimized with Gemini 3.1 Flash-Lite & 2.5 Stable.');
    }
}

/**
 * 🛡️ SAFETY_CONFIG (Gemini Cookbook Standard)
 */
export const DEFAULT_SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
];
