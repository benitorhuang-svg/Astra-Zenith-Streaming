import { PipelineContext } from '../types';

export const withAuditLog = (label = 'MISSION', detail?: string) => async (context: PipelineContext, next: () => Promise<void>) => {
    const start = new Date().toISOString();
    const entry = `[${start}] ${label}${detail ? ` :: ${detail}` : ''}`;
    context.auditTrail.push(entry);
    context.recordLog?.(entry, 'INFO');

    try {
        await next();
    } finally {
        context.auditTrail.push(`[${new Date().toISOString()}] ${label} COMPLETE`);
        context.persistAuditTrail?.(context.auditTrail);
    }
};
