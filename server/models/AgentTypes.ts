export interface AgentPoolEntry {
    id: string;
    name: string;
    role?: string;
    prompt_ref?: string;
    model: string;
}

export interface StreamMessage {
    role?: string;
    content: string;
}
