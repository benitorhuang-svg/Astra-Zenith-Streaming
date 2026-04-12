import { PortalState } from '../state/PortalState';
import { DIRTY_ALL } from '../PortalTypes';
import { AGENT_POOL } from '../../../core/agents';

/**
 * PromptService — Handles loading and managing agent prompts
 */
export class PromptService {
    constructor(private state: PortalState, private scheduleRender: (mask: number) => void) {}

    public initAgentModels() {
        const isFree = !this.state.apiKey || this.state.apiKey.toLowerCase() === 'free';
        AGENT_POOL.forEach(a => {
            let model: string;
            if (isFree) {
                switch(a.code) {
                    case 'A1': model = 'gemini-3.1-flash-lite-preview'; break; 
                    case 'A4': model = 'gemma-4-31b-it'; break; 
                    case 'A3': model = 'gemini-robotics-er-1.5-preview'; break;
                    case 'A6': model = 'gemini-3-flash-preview'; break; 
                    default: model = 'gemini-3.1-flash-lite-preview'; 
                }
            } else {
                switch(a.code) {
                    case 'A2': case 'A6': model = 'gemini-3.1-pro-preview'; break;
                    case 'A3': case 'A5': model = 'gemini-2.5-pro'; break;
                    default: model = 'gemini-3.1-pro-preview'; 
                }
            }
            this.state.agentModels[a.code] = model;
            void this.loadAgentPromptToMap(a.code);
        });
    }

    public async loadAgentPrompt(agentCode: string) {
        const mapping: Record<string, string> = {
            'A1': 'agent_a1_researcher.md',
            'A2': 'agent_a2_analyzer.md',
            'A3': 'agent_a3_codegen.md',
            'A4': 'agent_a4_refiner.md',
            'A5': 'agent_a5_evaluator.md',
            'A6': 'agent_a6_manager.md'
        };

        const fileName = mapping[agentCode];
        if (!fileName) return;

        try {
            const res = await fetch(`./prompt/${fileName}`);
            if (res.ok) {
                const text = await res.text();
                this.state.selectedAgentPromptContent = text;
                this.state.agentPrompts[agentCode] = text;
                this.scheduleRender(DIRTY_ALL);
            }
        } catch (e) {
            console.error('FAILED_TO_LOAD_PROMPT:', e);
        }
    }

    public async loadAgentPromptToMap(agentCode: string) {
        const mapping: Record<string, string> = {
            'A1': 'agent_a1_researcher.md',
            'A2': 'agent_a2_analyzer.md',
            'A3': 'agent_a3_codegen.md',
            'A4': 'agent_a4_refiner.md',
            'A5': 'agent_a5_evaluator.md',
            'A6': 'agent_a6_manager.md'
        };
        const fileName = mapping[agentCode];
        if (!fileName) return;
        try {
            const res = await fetch(`./prompt/${fileName}`);
            if (res.ok) {
                this.state.agentPrompts[agentCode] = await res.text();
            }
        } catch (e) {
            console.error('BOOT_LOAD_PROMPT_FAIL:', e);
        }
    }

    public async loadCoreProtocol() {
        try {
            const res = await fetch('./prompt/system_core_protocol.md');
            if (res.ok) this.state.coreProtocol = await res.text();
        } catch (e) {
            console.error('BOOT_LOAD_CORE_PROTOCOL_FAIL:', e);
        }
    }
}
