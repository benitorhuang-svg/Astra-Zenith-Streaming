import { PortalContext, DIRTY_ALL } from '../PortalTypes';
import { createAgentPath } from '../../../core/agents';

/**
 * WorkflowVisualizer — Integration with generative media systems (Imagen 4.0).
 */
export class WorkflowVisualizer {
    constructor(private context: PortalContext) {}

    public async visualize(prompt: string): Promise<void> {
        const generationId = `IMG-${Date.now().toString(36).toUpperCase()}`;
        this.context.isStreaming = true;
        
        const placeholder: any = {
            id: generationId,
            time: new Date().toLocaleTimeString(),
            mission: 'SYNTHESIS_HUB',
            title: `🎨 SYNTHESIZING...`,
            status: 'GENERATING',
            isGenerating: true,
            isImage: true,
            imageUrl: null 
        };
        this.context.archives.unshift(placeholder);
        this.context._p.selectedArchiveId = generationId;
        this.context.scheduleRender(DIRTY_ALL);
        
        this.context.pushInternalLog(`🎨 正在喚醒 Imagen 4.0 Ultra...`, 'SYNC');
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) throw new Error(`HTTP_STATUS_${response.status}`);

            const data = await response.json();
            if (data.status === 'SUCCESS') {
                const imgData = `data:image/png;base64,${data.image}`;
                placeholder.status = 'SUCCESS';
                placeholder.isGenerating = false;
                placeholder.imageUrl = imgData;
                placeholder.title = `IMAGE: Archive Infographic`;

                this.context.messages.push({
                    agentCode: 'IMG',
                    agentName: 'IMAGEN 4.0',
                    agentColor: '#FFD700',
                    agentImg: 'agent_a6.png',
                    content: `![GENERATED_IMAGE](${imgData})`,
                    round: this.context.currentPasses,
                    isImage: true,
                    imageUrl: imgData,
                    isStreaming: false,
                    path: createAgentPath('IMG', 'ARCHIVE', generationId),
                    summary: 'Imagen synthesis complete'
                });
            }
        } catch (error) {
            console.error('[Visualizer] Failed:', error);
            placeholder.status = 'FAILED';
            placeholder.isGenerating = false;
        } finally {
            this.context.isStreaming = false;
            this.context.scheduleRender(DIRTY_ALL);
        }
    }
}
