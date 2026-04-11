import { PipelineContext, MissionMessage, estimateTokenCount } from '../types';

export const withTokenGuard = (maxTokens = 8000, keepLatest = 10) => async (context: PipelineContext, next: () => Promise<void>) => {
    const total = context.messages.reduce((s, m) => s + estimateTokenCount(m.content), 0);
    if (total > maxTokens) {
        const preserved = context.messages.slice(-Math.max(keepLatest, 2));
        const prunedCount = context.messages.length - preserved.length;
        const summary: MissionMessage = {
            agentCode: 'SYSTEM', agentName: 'SYSTEM', agentColor: 'rgba(255,255,255,0.2)', agentImg: 'avatar_cute_robot.png',
            content: `[pruned ${prunedCount} messages]`, round: preserved[0]?.round || 0, isStreaming: false,
            path: ['SYSTEM', 'COMPACTION'], summary: 'Context compacted'
        };
        context.messages.splice(0, context.messages.length, summary, ...preserved);
        context.isCompacting = true;
    }
    await next();
};
