import { PortalContext } from '../PortalTypes';

/**
 * PromptBuilder — Orchestrates the construction of complex tactical prompts for agents.
 */
export class PromptBuilder {
    constructor(private context: PortalContext) {}

    public async build(agentCode: string, round: number, shardingDirective: string): Promise<any[]> {
        const now = new Date();
        const currentTimestamp = `[LOCAL_TIME]: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} UTC+8`;
        const parentContext = ''; 
        let specializedSkill = '';
        
        if (this.context.activePrompt.toUpperCase().match(/POWER QUERY|PQ|M語法/)) {
            try {
                const res = await fetch('./prompt/skill_power_query_architect.md');
                if (res.ok) specializedSkill = `\n\n[GOVERNING_SKILL_ACTIVE]:\n${await res.text()}`;
            } catch (err) { console.warn('Skill Load Fail', err); }
        }

        const sharedVars: Record<string, string> = {};
        const factAnchors: string[] = [];
        const inquiries: string[] = [];
        this.context.messages.forEach(m => {
            const vMatches = m.content.matchAll(/\[VARIABLE\]:\s*(\w+)\s*=\s*(.*)/g);
            for (const match of vMatches) sharedVars[match[1]] = match[2].trim();
            const fMatches = m.content.matchAll(/\[FACT\]:\s*(.*)/g);
            for (const match of fMatches) factAnchors.push(match[1].trim());
            const inquiriesMatch = m.content.matchAll(/\[INQUIRY\]:\s*(\w+)/g);
            for (const match of inquiriesMatch) inquiries.push(match[1].trim());
        });

        const varBlock = Object.keys(sharedVars).length > 0 ? `\n[SHARED_CONSTANTS]:\n${Object.entries(sharedVars).map(([k,v]) => `- ${k}: ${v}`).join('\n')}` : '';
        const factBlock = factAnchors.length > 0 ? `\n[FACT_ANCHORS]:\n${factAnchors.map((f, i) => `- F${i+1}: ${f}`).join('\n')}` : '';

        const apiContextMessagesRaw = this.context.messages.filter(m => m.round === round || (m.agentCode === 'USER') || (m.agentCode === 'A1' && round > 1));

        const apiContextMessages = apiContextMessagesRaw.map(m => {
            let content = m.content;
            const domain = m.agentCode === 'A1' ? 'STRATEGIC_SCAFFOLD' : (m.agentCode === 'USER' ? 'USER_COMMAND' : 'SPECIALIZED_OUTPUT');
            const isTargetOfInquiry = inquiries.some(id => m.content.includes(`## ${id}`) || m.agentCode === id);

            if (m.agentCode === 'A1' && agentCode !== 'A1' && content.includes('[STRATEGIC_MAP]')) {
                const mapOnly = content.match(/\[STRATEGIC_MAP\][\s\S]*?(?=\n\n|##|$)/);
                content = mapOnly ? `${mapOnly[0]}\n\n[INFO]: 全域協議基準。` : content;
            } else if (agentCode !== m.agentCode && domain === 'SPECIALIZED_OUTPUT' && !isTargetOfInquiry) {
                const summary = content.match(/\[SUMMARY\][\s\S]*$/);
                content = summary ? `[CORE_SUMMARY]: ${summary[0]}` : `[TRUNCATED]`;
            } else if (isTargetOfInquiry) {
                content = `[PRIORITY_FULL_DATA]:\n${content}\n(回溯數據)`;
            }
            return { ...m, content: `[INPUT_DATA: ${domain}]:\n${content}` };
        });

        const lastMapMsg = [...apiContextMessages].reverse().find(m => m.content.includes('[STRATEGIC_MAP]'));
        let alignmentLock = '';
        if (lastMapMsg) {
            const mapMatch = lastMapMsg.content.match(/\[STRATEGIC_MAP\][\s\S]*?(?=\n\n|##|$)/);
            if (mapMatch) alignmentLock = `\n\n[CRITICAL_LOCK]: 嚴禁偏離大綱。引用請標註 [REF: FX]。`;
        }

        const workOrder = `[MISSION_WORK_ORDER]:
- 目標: ${shardingDirective}
- 職責: 僅填充 A1 架構。
[PROTOCOLS]: 引用 [REF: FX]，疑問 [INQUIRY]: IDCode，進度 [PROGRESS]: X%。${varBlock}${factBlock}`;

        const rawContext = [
            ...apiContextMessages.map(m => ({ 
                role: m.agentCode === 'USER' ? 'user' : 'model',
                content: m.content 
            })),
            { role: 'user', content: `${currentTimestamp}\n${parentContext}\n${workOrder}${alignmentLock}\n[COMMAND]: ${this.context.activePrompt}\n\n[TECH_CONTEXT]: ${specializedSkill}` }
        ];

        const apiMessages: any[] = [];
        rawContext.forEach(msg => {
            const last = apiMessages[apiMessages.length - 1];
            if (last && last.role === msg.role) { last.content += `\n\n${msg.content}`; }
            else { apiMessages.push({ role: msg.role, content: msg.content }); }
        });

        return apiMessages;
    }
}
