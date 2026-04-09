interface HUDData {
    title: string;
    code: string;
    status: string;
    desc: string;
    avatar?: string | null;
}

interface Window {
    lucide?: {
        createIcons: (options?: { parent?: HTMLElement }) => void;
    };
    openHUD: (data: HUDData) => void;
    closeHUD: () => void;
    semanticNodes?: SemanticNode[];
    semanticLinks?: SemanticLink[];
}

declare const marked: {
    parse: (md: string) => string;
};

declare const lucide: {
    createIcons: (options?: { parent?: HTMLElement }) => void;
};

interface SemanticNode {
    id: string;
    content: string;
    agentCode: string;
    x: number;
    y: number;
    agentColor?: string;
}

interface SemanticLink {
    source: string;
    target: string;
    value: number;
}
