"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTokenGuard = void 0;
const types_1 = require("../types");
const withTokenGuard = (maxTokens = 8000, keepLatest = 10) => async (context, next) => {
    const total = context.messages.reduce((s, m) => s + (0, types_1.estimateTokenCount)(m.content), 0);
    if (total > maxTokens) {
        const preserved = context.messages.slice(-Math.max(keepLatest, 2));
        const prunedCount = context.messages.length - preserved.length;
        const summary = {
            agentCode: 'SYSTEM', agentName: 'SYSTEM', agentColor: 'rgba(255,255,255,0.2)', agentImg: 'avatar_cute_robot.png',
            content: `[pruned ${prunedCount} messages]`, round: preserved[0]?.round || 0, isStreaming: false,
            path: ['SYSTEM', 'COMPACTION'], summary: 'Context compacted'
        };
        context.messages.splice(0, context.messages.length, summary, ...preserved);
        context.isCompacting = true;
    }
    await next();
};
exports.withTokenGuard = withTokenGuard;
